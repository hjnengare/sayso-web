"use client";

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/navigation';

// Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export type BusinessMapItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  image_url?: string | null;
  slug?: string | null;
};

interface BusinessesMapProps {
  businesses: BusinessMapItem[];
  className?: string;
}

const CAPE_TOWN_CENTER: [number, number] = [18.4241, -33.9249];

export default function BusinessesMap({ businesses, className = '' }: BusinessesMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const router = useRouter();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: CAPE_TOWN_CENTER,
      zoom: 11,
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when businesses change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter valid businesses with coordinates
    const validBusinesses = businesses.filter(
      b => b.lat != null && b.lng != null && !isNaN(b.lat) && !isNaN(b.lng)
    );

    if (validBusinesses.length === 0) {
      // No businesses - center on Cape Town
      map.flyTo({ center: CAPE_TOWN_CENTER, zoom: 11 });
      return;
    }

    // Create GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: validBusinesses.map(b => ({
        type: 'Feature',
        properties: {
          id: b.id,
          name: b.name,
          category: b.category ?? '',
          slug: b.slug ?? '',
          image_url: b.image_url ?? '',
        },
        geometry: {
          type: 'Point',
          coordinates: [b.lng, b.lat],
        },
      })),
    };

    // Remove existing source and layers if they exist
    if (map.getSource('businesses')) {
      if (map.getLayer('clusters')) map.removeLayer('clusters');
      if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
      if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
      map.removeSource('businesses');
    }

    // Add source with clustering
    map.addSource('businesses', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Add cluster circles layer
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'businesses',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#8BA888', // sage
          10,
          '#6B8E68',
          30,
          '#4A6E47',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10,
          30,
          30,
          40,
        ],
      },
    });

    // Add cluster count labels
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'businesses',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Add unclustered points
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'businesses',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#8BA888',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Click handler for clusters - zoom in
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });

      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource('businesses') as mapboxgl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        const coordinates = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({
          center: coordinates,
          zoom: zoom || 14,
        });
      });
    });

    // Click handler for unclustered points - open business page
    map.on('click', 'unclustered-point', (e) => {
      if (!e.features || !e.features.length) return;

      const feature = e.features[0];
      const { id, name, category, slug } = feature.properties || {};
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      // Ensure that if the map is zoomed out such that multiple copies of the feature are visible,
      // the popup appears over the copy being pointed to
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'font-urbanist';
      popupContent.innerHTML = `
        <div class="p-2">
          <h3 class="font-600 text-sm text-charcoal mb-1">${name}</h3>
          ${category ? `<p class="text-xs text-charcoal/60 mb-2">${category}</p>` : ''}
          <button
            id="view-business-${id}"
            class="w-full bg-sage text-white text-xs font-600 py-2 px-3 rounded-[12px] hover:bg-sage/90 transition-colors"
          >
            View Business
          </button>
        </div>
      `;

      // Create and display popup
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 15,
      })
        .setLngLat(coordinates)
        .setDOMContent(popupContent)
        .addTo(map);

      // Add click handler to button after popup is added to DOM
      setTimeout(() => {
        const button = document.getElementById(`view-business-${id}`);
        if (button) {
          button.addEventListener('click', () => {
            const path = slug ? `/business/${slug}` : `/business/${id}`;
            router.push(path);
            popup.remove();
          });
        }
      }, 0);
    });

    // Change cursor on hover
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });

    // Fit bounds to show all markers
    if (validBusinesses.length === 1) {
      // Single business - center on it
      map.flyTo({
        center: [validBusinesses[0].lng, validBusinesses[0].lat],
        zoom: 14,
      });
    } else {
      // Multiple businesses - fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      validBusinesses.forEach(b => {
        bounds.extend([b.lng, b.lat]);
      });
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [businesses, mapLoaded, router]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full rounded-lg" />

      {/* Empty state overlay */}
      {businesses.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-off-white/90 rounded-lg">
          <div className="text-center px-4">
            <p className="font-urbanist text-base font-600 text-charcoal mb-2">
              No businesses with location yet
            </p>
            <p className="font-urbanist text-sm text-charcoal/60">
              Businesses will appear here once they add their location
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
