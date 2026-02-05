// src/components/Hero/HeroCarousel.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchInput from "../SearchInput/SearchInput";
import FilterModal, { FilterState } from "../FilterModal/FilterModal";
import ActiveFilterBadges from "../FilterActiveBadges/ActiveFilterBadges";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";
import HeroSkeleton from "./HeroSkeleton";
import { useAuth } from '../../contexts/AuthContext';

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
}

type HeroViewport = "mobile" | "tablet" | "desktop";

const HERO_COPY = [
  {
    title: "Discover Local Gems",
    description: "From everyday essentials to hidden favourites",
  },
  {
    title: "What's Trending Now",
    description: "See what everyone is talking about right now",
  },
  {
    title: "Personalised For You",
    description: "Get recommendations tailored to your interests",
  },
  {
    title: "Connect with Locals",
    description: "Support local businesses and discover hidden treasures",
  },
];

const shuffleImages = (images: string[]): string[] => {
  const result = [...images];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const HERO_SEED_STORAGE_KEY = "sayso.hero.seed.v1";

function getOrCreateSessionSeed(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.sessionStorage.getItem(HERO_SEED_STORAGE_KEY);
    if (existing) return existing;
    const seed =
      typeof window.crypto !== "undefined" && "getRandomValues" in window.crypto
        ? (() => {
            const buf = new Uint32Array(2);
            window.crypto.getRandomValues(buf);
            return `${buf[0].toString(36)}${buf[1].toString(36)}`;
          })()
        : Math.floor(Math.random() * 1e12).toString(36);
    window.sessionStorage.setItem(HERO_SEED_STORAGE_KEY, seed);
    return seed;
  } catch {
    return Math.floor(Math.random() * 1e12).toString(36);
  }
}

function hashSeedToUint32(seed: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(images: string[], seed: string): string[] {
  const result = [...images];
  const rand = mulberry32(hashSeedToUint32(seed));
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function selectStableSubset(images: string[], cap: number, seed: string): string[] {
  if (cap >= images.length) return images;
  // Shuffle once deterministically, then take the first N.
  return seededShuffle(images, seed).slice(0, cap);
}

function getViewportFromWindow(): HeroViewport {
  if (typeof window === "undefined" || !window.matchMedia) return "desktop";
  if (window.matchMedia("(max-width: 767px)").matches) return "mobile";
  if (window.matchMedia("(min-width: 768px) and (max-width: 1024px)").matches) return "tablet";
  return "desktop";
}

const FONT_STACK = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const buildSlides = (images: string[], seed: string): HeroSlide[] => {
  const randomized = seededShuffle(images, seed);
  return randomized.map((image, index) => {
    const copy = HERO_COPY[index % HERO_COPY.length];
    return {
      id: `${index + 1}`,
      image,
      title: copy.title,
      description: copy.description,
    };
  });
};

/** Hero images from /public/hero (local only; no storage bucket). All images in the folder are used. */
const HERO_IMAGES: string[] = [
  "/hero/adam-winger-KVVjmb3IIL8-unsplash.jpg",
  "/hero/adam-winger-NuE52ey_cTc-unsplash.jpg",
  "/hero/adriaan-venner-scheepers-Ceq_cYIb8Co-unsplash.jpg",
  "/hero/ahmet-kurt-0xn-8kRWOhE-unsplash.jpg",
  "/hero/a-j-A_0C42zmz1Q-unsplash.jpg",
  "/hero/aksh-yadav-bY4cqxp7vos-unsplash.jpg",
  "/hero/alexandr-podvalny-TciuHvwoK0k-unsplash.jpg",
  "/hero/alexey-demidov-0x7wd4w2K5E-unsplash.jpg",
  "/hero/alex-zamora-FU1KddSIIR4-unsplash.jpg",
  "/hero/alyona-yankovska-7EbGkOm8pWM-unsplash.jpg",
  "/hero/ambitious-studio-rick-barrett-6J2oD_IBPb0-unsplash.jpg",
  "/hero/anderson-schmig-IayJpfDhj7E-unsplash.jpg",
  "/hero/andy-kelly-P21tYLUo_PI-unsplash.jpg",
  "/hero/anya-richter-V5-OCit5ZF0-unsplash.jpg",
  "/hero/arno-smit-qY_yTu7YBT4-unsplash.jpg",
  "/hero/barbara-froes-Yhsdub0hV1A-unsplash.jpg",
  "/hero/ben-nrHms-os93A-unsplash.jpg",
  "/hero/bernd-m-schell-DoTYfTdbq5w-unsplash.jpg",
  "/hero/boitumelo-vLxXcymERuU-unsplash.jpg",
  "/hero/boney-dHIRbh9En6I-unsplash.jpg",
  "/hero/bruce-mars-gJtDg6WfMlQ-unsplash.jpg",
  "/hero/caleb-williams-Fj5klOSDZxM-unsplash.jpg",
  "/hero/caroline-lm-8BkF0sTC6Uo-unsplash.jpg",
  "/hero/casey-allen-UjpEGHu8uNU-unsplash.jpg",
  "/hero/chris-andrawes-6vTyPMQ8gHk-unsplash.jpg",
  "/hero/christelle-bourgeois-Aq7paIaerrY-unsplash.jpg",
  "/hero/christin-hume-0MoF-Fe0w0A-unsplash.jpg",
  "/hero/cole-keister-rPlYtGgoxho-unsplash.jpg",
  "/hero/connor-gan-iY6iiQKkjcg-unsplash.jpg",
  "/hero/courtney-cook-QYsRxRPygwU-unsplash.jpg",
  "/hero/createasea-b5X9v220Y8M-unsplash.jpg",
  "/hero/dan-duffey-7NaBBaRzfZ4-unsplash.jpg",
  "/hero/dane-wetton-zdLdgGbi9Ow-unsplash.jpg",
  "/hero/dan-gold-E6HjQaB7UEA-unsplash.jpg",
  "/hero/danielle-cerullo-CQfNt66ttZM-unsplash.jpg",
  "/hero/dave-hoefler-a3e7yEtQxJs-unsplash.jpg",
  "/hero/david-henrichs-OKBb9_v-K1I-unsplash.jpg",
  "/hero/devon-janse-van-rensburg-CeI5GZF0MrQ-unsplash.jpg",
  "/hero/devon-janse-van-rensburg-hSfok6PdwgE-unsplash.jpg",
  "/hero/devon-janse-van-rensburg-ODZIiIsn490-unsplash.jpg",
  "/hero/devon-janse-van-rensburg-USNt7L36zj0-unsplash.jpg",
  "/hero/dylan-gillis-V8_s30ttQTk-unsplash.jpg",
  "/hero/dylan-gillis-YJdCZba0TYE-unsplash.jpg",
  "/hero/edward-howell-vvUy1hWVYEA-unsplash.jpg",
  "/hero/eric-ward-ISg37AI2A-s-unsplash.jpg",
  "/hero/farhad-ibrahimzade-Sk6my6_KTK0-unsplash.jpg",
  "/hero/felipe-bustillo-4VDRCoNuvE0-unsplash.jpg",
  "/hero/fitnish-media-mQ2mZMcI1dc-unsplash.jpg",
  "/hero/fitnish-media-pZqyd8p0sP8-unsplash.jpg",
  "/hero/fran-innocenti-I_LxDFIIRIA-unsplash.jpg",
  "/hero/frankie-cordoba-Y8gXPB8Mq98-unsplash.jpg",
  "/hero/gilles-de-muynck-QcN1_o0a0qo-unsplash.jpg",
  "/hero/hayffield-l-ZVdZw2p08y4-unsplash.jpg",
  "/hero/holly-mandarich-UVyOfX3v0Ls-unsplash.jpg",
  "/hero/hu-chen-FZ0qzjVF_-c-unsplash.jpg",
  "/hero/huum-NHLS5hOSH0c-unsplash.jpg",
  "/hero/jakub-kapusnak-4f4YZfDMLeU-unsplash.jpg",
  "/hero/janan-OoW1DMDCV1Y-unsplash.jpg",
  "/hero/janice-lin-yUIN4QWKCTw-unsplash.jpg",
  "/hero/jannik-mY2ZHBU6GRk-unsplash.jpg",
  "/hero/jared-rice-xce530fBHrk-unsplash.jpg",
  "/hero/jason-leung-a6tKN9LfuV8-unsplash.jpg",
  "/hero/jean-van-wyk-gxpWKKZwJa0-unsplash.jpg",
  "/hero/jennifer-deacon-LO63Mh7gv3c-unsplash.jpg",
  "/hero/jens-thekkeveettil-dBWvUqBoOU8-unsplash.jpg",
  "/hero/jessica-pamp-JNTSoyb_bbw-unsplash.jpg",
  "/hero/john-michael-thomson-9m1V6A8Fm-A-unsplash.jpg",
  "/hero/jorik-kleen-DJN1Z0IxueU-unsplash.jpg",
  "/hero/kalisa-veer-gRx74OSJTG8-unsplash.jpg",
  "/hero/karan-bhatia-ib7jwp7m0iA-unsplash.jpg",
  "/hero/karsten-winegeart-0QTcK1JcteQ-unsplash.jpg",
  "/hero/kaylee-garrett-GaprWyIw66o-unsplash.jpg",
  "/hero/kazuo-ota-sbpZBs1qR9k-unsplash.jpg",
  "/hero/kelsey-knight-udj2tD3WKsY-unsplash.jpg",
  "/hero/kevin-ianeselli-ebnlHkqfUHY-unsplash.jpg",
  "/hero/kevin-wolf-IfTKequW2Mk-unsplash.jpg",
  "/hero/kingsley-hemans-51-4BSipn7E-unsplash.jpg",
  "/hero/krista-mangulsone-9gz3wfHr65U-unsplash.jpg",
  "/hero/krists-luhaers-AtPWnYNDJnM-unsplash.jpg",
  "/hero/lance-asper-mNDVSSmMt0Y-unsplash.jpg",
  "/hero/linley-rall-FbPz8UHbKUs-unsplash.jpg",
  "/hero/lo-sarno-QLdp9SGDf5Y-unsplash.jpg",
  "/hero/louis-hansel-wVoP_Q2Bg_A-unsplash.jpg",
  "/hero/madiba-de-african-inspiration-UP1zQfZLyWE-unsplash.jpg",
  "/hero/madiba-de-african-inspiration-XrNKe8VLMRo-unsplash.jpg",
  "/hero/margit-umbach-6jyMHaPtHIs-unsplash.jpg",
  "/hero/margit-umbach-mVBWD1qsTQs-unsplash.jpg",
  "/hero/marina-zvada-lUPCv3ccYhg-unsplash.jpg",
  "/hero/marvin-meyer-SYTO3xs06fU-unsplash.jpg",
  "/hero/matt-halls-oC8S4_19QUk-unsplash.jpg",
  "/hero/matthias-wesselmann-9Jx37xwFX6c-unsplash.jpg",
  "/hero/meritt-thomas-9eLHzqljDyU-unsplash.jpg",
  "/hero/michael-afonso-nZU76qWy-T8-unsplash.jpg",
  "/hero/michael-lee-Noqjeq2XJUk-unsplash.jpg",
  "/hero/miltiadis-fragkidis-BFC_39NfWPI-unsplash.jpg",
  "/hero/nappy-J5UTvRgse7Q-unsplash.jpg",
  "/hero/neom-4AADxUsnufQ-unsplash.jpg",
  "/hero/nick-fewings-MjZwf1PlfaU-unsplash.jpg",
  "/hero/nico-smit-_nZNptJkZg0-unsplash.jpg",
  "/hero/nico-smit-L5CY08WNZ28-unsplash.jpg",
  "/hero/nrd-D6Tu_L3chLE-unsplash.jpg",
  "/hero/omar-eagle-zk_6h5I4T5Q-unsplash.jpg",
  "/hero/online-marketing-hIgeoQjS_iE-unsplash.jpg",
  "/hero/oriol-farre-sSEff9sE2cA-unsplash.jpg",
  "/hero/parker-gibbs-pdUVFX8WglY-unsplash.jpg",
  "/hero/patrick-tomasso-1NTFSnV-KLs-unsplash.jpg",
  "/hero/pauline-loroy-tv8PIPPY3rQ-unsplash.jpg",
  "/hero/photo-nic-xOigCUcFdA8-unsplash.jpg",
  "/hero/polina-miloserdova-1TY6b0RJaQA-unsplash.jpg",
  "/hero/polina-miloserdova-kymJDvqz9dk-unsplash.jpg",
  "/hero/quan-nguyen-yDSe7sggb9Q-unsplash.jpg",
  "/hero/q-u-i-n-g-u-y-e-n-Zrp9b3PMIy8-unsplash.jpg",
  "/hero/r0m0_4-w1UD6PiqgtQ-unsplash.jpg",
  "/hero/rahadiansyah-3yusFdVTtQ8-unsplash.jpg",
  "/hero/raze-solar-GXLPLG3_Vf4-unsplash.jpg",
  "/hero/reba-spike-4y7030O1XPQ-unsplash.jpg",
  "/hero/remy-gieling-H0v6g8FGvFQ-unsplash.jpg",
  "/hero/riccardo-bergamini-O2yNzXdqOu0-unsplash.jpg",
  "/hero/rosa-rafael-Pe9IXUuC6QU-unsplash.jpg",
  "/hero/ryan-cuerden-Ib-UJN06F5s-unsplash.jpg",
  "/hero/sam-mar-OQOKSsj8QME-unsplash.jpg",
  "/hero/sarah-brown-RapDxBSMKzQ-unsplash.jpg",
  "/hero/scott-graham-5fNmWej4tAA-unsplash.jpg",
  "/hero/shaun-meintjes-31qNJWJZzh4-unsplash.jpg",
  "/hero/sheila-c-ySW0RtDJNh4-unsplash.jpg",
  "/hero/shraga-kopstein-K1P_W3JbCpI-unsplash.jpg",
  "/hero/sigmund-TJxotQTUr8o-unsplash.jpg",
  "/hero/siyuan-g_V2rt6iG7A-unsplash.jpg",
  "/hero/tabitha-turner-F0Wd4djYvSA-unsplash.jpg",
  "/hero/tanya-paquet-q6vDZ48s6iE-unsplash.jpg",
  "/hero/tanya-paquet-V3IssFR02qE-unsplash.jpg",
  "/hero/taylor-heery-_TyrA1RUaiI-unsplash.jpg",
  "/hero/thomas-bennie-R1_Rt0Xz1_I-unsplash.jpg",
  "/hero/tijs-van-leur-So6YckShOVA-unsplash.jpg",
  "/hero/tim-b-motivv-OYvjvIANSD0-unsplash.jpg",
  "/hero/trnava-university-BEEyeib-am8-unsplash.jpg",
  "/hero/unseen-histories-zKlmUuc7pBk-unsplash.jpg",
  "/hero/vincenzo-morelli-ZO4pHKtpn4c-unsplash.jpg",
  "/hero/vitaly-gariev-lbOaKbGNcrk-unsplash.jpg",
  "/hero/vitaly-gariev-y1u8bcBPnIU-unsplash.jpg",
  "/hero/vitolda-klein-zxsdbx-af9Y-unsplash (1).jpg",
  "/hero/yada-pongsirirushakun-e5tV8MyOTqI-unsplash.jpg",
  "/hero/yasmin-peyman-6hQAg2FwJhs-unsplash.jpg",
  "/hero/yns-plt-NY1D4Zni7fc-unsplash.jpg",
  "/hero/yuriy-vertikov-bFjTqonnpK4-unsplash.jpg",
  "/hero/yvette-de-wit-NYrVisodQ2M-unsplash.jpg",
  "/hero/zalfa-imani-1xp5VxvyKL0-unsplash.jpg",
  "/hero/zoe-reeve-xjJd9fu9OkM-unsplash.jpg",
];

export default function HeroCarousel() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heroImages] = useState<string[]>(() => HERO_IMAGES);
  const [heroViewport, setHeroViewport] = useState<HeroViewport>(() => getViewportFromWindow());
  const [heroSeed] = useState<string>(() => getOrCreateSessionSeed());
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const currentIndexRef = useRef(currentIndex);
  const cappedHeroImages = useMemo(() => {
    const cap = heroViewport === "mobile" ? 12 : heroViewport === "tablet" ? 18 : null;
    const base = Array.isArray(heroImages) ? heroImages : HERO_IMAGES;
    if (!cap) return base;
    return selectStableSubset(base, cap, heroSeed);
  }, [heroImages, heroViewport, heroSeed]);
  const slides = useMemo(() => buildSlides(cappedHeroImages, heroSeed), [cappedHeroImages, heroSeed]);
  const slidesRef = useRef<HeroSlide[]>(slides);
  const preloadedImagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mobileMql = window.matchMedia("(max-width: 767px)");
    const tabletMql = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");

    const update = () => {
      setHeroViewport(mobileMql.matches ? "mobile" : tabletMql.matches ? "tablet" : "desktop");
    };

    update();

    const add = (mql: MediaQueryList) => {
      if ("addEventListener" in mql) {
        mql.addEventListener("change", update);
        return () => mql.removeEventListener("change", update);
      }
      // Safari < 14
      (mql as any).addListener?.(update);
      return () => (mql as any).removeListener?.(update);
    };

    const removeMobile = add(mobileMql);
    const removeTablet = add(tabletMql);
    return () => {
      removeMobile();
      removeTablet();
    };
  }, []);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setProgress(0);
    }
  }, [currentIndex, slides.length]);

  // Mark hero as ready once auth state is known
  useEffect(() => {
    if (!authLoading) {
      setIsHeroReady(true);
    }
  }, [authLoading]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({ minRating: null, distance: null });
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // respect reduced motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Preload first 3 hero images in <head> for fastest LCP (browser fetches before paint).
  useEffect(() => {
    if (typeof window === "undefined" || slides.length === 0) return;
    const preloadCount = 3;
    const urls = slides.slice(0, preloadCount).map((s) => s.image);
    const links: HTMLLinkElement[] = [];
    urls.forEach((href) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      document.head.appendChild(link);
      links.push(link);
    });
    return () => links.forEach((link) => link.remove());
  }, [slides]);

  // Prefetch next 8 hero images so next slides load instantly.
  useEffect(() => {
    if (typeof window === "undefined" || slides.length === 0) return;
    const prefetchCount = 8;
    const imagesToPrefetch = slides.slice(0, prefetchCount).map((slide) => slide.image);
    imagesToPrefetch.forEach((src) => {
      if (preloadedImagesRef.current.has(src)) return;
      preloadedImagesRef.current.add(src);
      const img = new window.Image();
      img.decoding = "async";
      img.fetchPriority = "low";
      img.src = src;
    });
  }, [slides]);

  // When slide changes, preload the next 2 slides if not already loaded.
  useEffect(() => {
    if (typeof window === "undefined" || slides.length === 0) return;
    const next1 = (currentIndex + 1) % slides.length;
    const next2 = (currentIndex + 2) % slides.length;
    [next1, next2].forEach((idx) => {
      const src = slides[idx].image;
      if (preloadedImagesRef.current.has(src)) return;
      preloadedImagesRef.current.add(src);
      const img = new window.Image();
      img.decoding = "async";
      img.src = src;
    });
  }, [currentIndex, slides]);

  const next = useCallback(() => {
    if (slides.length === 0) return;
    setProgress(0); // Reset progress when advancing
    setCurrentIndex((prev) => {
      const newIndex = (prev + 1) % slides.length;
      currentIndexRef.current = newIndex;
      return newIndex;
    });
  }, [slides.length]);
  const prev = useCallback(() => {
    if (slides.length === 0) return;
    setProgress(0); // Reset progress when going back
    setCurrentIndex((prev) => {
      const newIndex = (prev - 1 + slides.length) % slides.length;
      currentIndexRef.current = newIndex;
      return newIndex;
    });
  }, [slides.length]);

  // Update ref when currentIndex changes
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Progress animation for each slide
  useEffect(() => {
    if (prefersReduced || paused || slides.length === 0) {
      // Clear progress timer when paused
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      return;
    }

    // Reset progress when slide changes
    setProgress(0);

    // Animate progress from 0 to 100 over 8 seconds (more natural speed)
    const interval = 50; // Update every 50ms for smooth animation
    const totalDuration = 8000; // 8 seconds per slide for a more natural pace
    const steps = totalDuration / interval;
    let currentStep = 0;

    progressRef.current = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(newProgress);

      // When progress reaches 100%, advance to next slide
      if (newProgress >= 100) {
        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
        // Use the ref version of next to avoid dependency issues
        setCurrentIndex((prev) => {
          const newIndex = (prev + 1) % slides.length;
          currentIndexRef.current = newIndex;
          return newIndex;
        });
        setProgress(0);
      }
    }, interval);

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    };
  }, [prefersReduced, paused, currentIndex, slides.length]);

  // pause when tab is hidden
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // keyboard navigation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setPaused(true);
        next();
      } else if (e.key === "ArrowLeft") {
        setPaused(true);
        prev();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // swipe gestures (mobile)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let deltaX = 0;
    const threshold = 40;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      deltaX = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      deltaX = e.touches[0].clientX - startX;
    };
    const onTouchEnd = () => {
      if (Math.abs(deltaX) > threshold) {
        setPaused(true);
        if (deltaX < 0) next();
        else prev();
      }
      startX = 0;
      deltaX = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [next, prev]);

  const handleUpdateFilter = (filterType: 'minRating' | 'distance', value: number | string | null) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({ minRating: null, distance: null });
  };

  const goToSlide = (index: number) => {
    if (slides.length === 0) return;
    setCurrentIndex(index);
    setProgress(0); // Reset progress when manually navigating
    setPaused(true);
  };

  // Filter handlers
  const openFilters = () => {
    if (isFilterVisible) return;
    setIsFilterVisible(true);
    setTimeout(() => setIsFilterOpen(true), 10);
  };

  const closeFilters = () => {
    setIsFilterOpen(false);
    setTimeout(() => setIsFilterVisible(false), 150);
  };

  const handleFiltersChange = (f: FilterState) => {
    // Navigate to explore page with filters applied via URL params
    const params = new URLSearchParams();
    if (f.categories && f.categories.length > 0) {
      params.set('categories', f.categories.join(','));
    }
    if (f.minRating !== null) {
      params.set('min_rating', f.minRating.toString());
    }
    if (f.distance) {
      params.set('distance', f.distance);
    }

    const queryString = params.toString();
    const exploreUrl = queryString ? `/explore?${queryString}` : '/explore';
    router.push(exploreUrl);
    closeFilters();
  };

  const handleSubmitQuery = (query: string) => {
    // Navigate to explore page with search query
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('search', query.trim());
    }
    const queryString = params.toString();
    const exploreUrl = queryString ? `/explore?${queryString}` : '/explore';
    router.push(exploreUrl);
  };

  // Show skeleton while auth is loading
  if (!isHeroReady) {
    return (
      <div suppressHydrationWarning>
        <HeroSkeleton />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div suppressHydrationWarning>
        <HeroSkeleton />
      </div>
    );
  }

  return (
    <>
      {/* Hero Container with padding */}
      <div className="relative w-full px-0 py-0 md:pt-2 md:px-2">
        {/* Hero Section with rounded corners - 75vh responsive height */}
        <section
          ref={containerRef as React.RefObject<HTMLElement>}
          className="relative h-[90dvh] md:h-[80dvh] w-full overflow-hidden outline-none rounded-none md:rounded-none lg:rounded-none min-h-[300px] shadow-md"
          aria-label="Hero carousel"
          tabIndex={0}
          style={{ fontFamily: FONT_STACK }}
        >
          {/* Liquid Glass Ambient Lighting */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none rounded-none md:rounded-none lg:rounded-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none rounded-none md:rounded-none lg:rounded-none" />
      <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none rounded-none md:rounded-none lg:rounded-none" />
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== currentIndex}
          className={`absolute inset-0 w-auto h-auto overflow-hidden transition-opacity duration-1000 ease-in-out will-change-transform rounded-none md:rounded-none lg:rounded-none ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
           {/* Full Background Image - All Screen Sizes; fallback to /hero when not loading */}
           <div className="absolute inset-0 rounded-none md:rounded-none lg:rounded-none overflow-hidden px-0 mx-0">
             <Image
               src={failedImageUrls.has(slide.image) ? HERO_IMAGES[index % HERO_IMAGES.length] : slide.image}
               alt={slide.title}
               fill
               priority={index === 0}
               loading={index === 0 ? "eager" : "lazy"}
               fetchPriority={index === 0 ? "high" : "auto"}
               quality={80}
               className="object-cover scale-[1.02]"
               style={{ filter: "brightness(0.95) contrast(1.05) saturate(1.1)" }}
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
               onError={() => {
                 setFailedImageUrls((prev) => new Set(prev).add(slide.image));
               }}
             />
             {/* Multi-layered overlay for optimal text readability */}
             <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
             <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
             <div className="absolute inset-0 bg-black/20" />
           </div>

           {/* Hero Text with slide-in animation */}
           <div className="absolute inset-0 z-20 flex items-center justify-center w-full pt-[var(--header-height)] -translate-y-4">
               <motion.div
                 className="w-full flex flex-col items-center justify-center text-center pb-20"
                 initial="hidden"
                 animate="visible"
                 variants={{
                   hidden: {},
                   visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
                 }}
               >
                 <motion.h2
                   className="text-3xl sm:text-4xl lg:text-5xl font-bold text-off-white drop-shadow-lg mb-4"
                   style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                   variants={{
                     hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
                     visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                   }}
                 >
                   Discover Local Gems
                 </motion.h2>
                 <motion.p
                   className="text-base sm:text-lg lg:text-xl text-off-white/90 drop-shadow-md max-w-xl mb-6"
                   style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}
                   variants={{
                     hidden: { opacity: 0, y: 16, filter: "blur(3px)" },
                     visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
                   }}
                 >
                   From everyday essentials to hidden favourites
                 </motion.p>

                 {/* Conditional CTA Button: Sign In for unauthenticated, Discover for authenticated */}
                 <motion.div
                   variants={{
                     hidden: { opacity: 0, y: 12, scale: 0.97 },
                     visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
                   }}
                 >
                   {!user ? (
                     <Link
                       href="/login"
                       className="group relative inline-block rounded-full py-3 px-12 text-base font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 min-w-[180px]"
                       style={{
                         fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                         fontWeight: 600,
                       }}
                     >
                       <span className="relative z-10">Sign In</span>
                     </Link>
                   ) : (
                     <Link
                       href="/trending"
                       className="group relative inline-block rounded-full py-3 px-12 text-base font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 min-w-[180px]"
                       style={{
                         fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                         fontWeight: 600,
                       }}
                     >
                       <span className="relative z-10">Discover</span>
                     </Link>
                   )}
                 </motion.div>
               </motion.div>
           </div>
        </div>
      ))}

      {/* Accessible live region (announces slide title) */}
      <div className="sr-only" aria-live="polite">
        {slides[currentIndex]?.title}
      </div>
      
        </section>
      </div>

      {/* Filter Modal Portal */}
      {isFilterVisible && (
        <div className="fixed inset-0 z-50">
          <FilterModal
            isOpen={isFilterOpen}
            isVisible={isFilterVisible}
            onClose={closeFilters}
            onFiltersChange={handleFiltersChange}
            initialFilters={filters}
          />
        </div>
      )}
    </>
  );
}
