import React from 'react';
import { Calendar, MapPin, DollarSign, Loader } from 'lucide-react';
import { useBusinessEvents } from '../../hooks/useBusinessEvents';

interface BusinessOwnedEventsSectionProps {
  businessId: string;
  businessName: string;
}

export default function BusinessOwnedEventsSection({
  businessId,
  businessName,
}: BusinessOwnedEventsSectionProps) {
  const { events, loading } = useBusinessEvents(businessId);

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="py-8 border-t border-charcoal/10">
      <h3 className="text-xl font-semibold text-charcoal mb-6">
        Events & Specials from {businessName}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => (
          <div
            key={event.id}
            className="bg-off-white rounded-[16px] border border-charcoal/10 overflow-hidden hover:border-coral/30 transition-all"
          >
            {/* Event Header with Icon */}
            <div className="bg-gradient-to-r from-sage/10 to-coral/10 p-4 border-b border-charcoal/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{event.icon || '🎉'}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-charcoal truncate">
                      {event.title}
                    </h4>
                    <p className="text-xs text-charcoal/60 mt-1">
                      {event.type === 'event' ? 'Event' : 'Special Offer'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="p-4 space-y-3">
              {/* Dates */}
              <div className="flex items-center gap-2 text-sm text-charcoal/70">
                <Calendar size={16} className="flex-shrink-0 text-coral" />
                <span>
                  {new Date(event.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {event.endDate && event.endDate !== event.startDate && (
                    <>
                      {' - '}
                      {new Date(event.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </>
                  )}
                </span>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-charcoal/70">
                  <MapPin size={16} className="flex-shrink-0 text-sage" />
                  <span>{event.location}</span>
                </div>
              )}

              {/* Price */}
              {event.price && (
                <div className="flex items-center gap-2 text-sm text-charcoal/70">
                  <DollarSign size={16} className="flex-shrink-0 text-coral" />
                  <span>${event.price.toFixed(2)}</span>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <p className="text-sm text-charcoal/70 line-clamp-2">
                  {event.description}
                </p>
              )}

              {/* Booking CTA / Info */}
              <div className="pt-2">
                {event.bookingUrl && event.bookingUrl.trim() ? (
                  <a
                    href={event.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-coral text-white rounded-full text-xs font-semibold hover:bg-coral/90 transition"
                  >
                    Reserve your spot
                  </a>
                ) : event.bookingContact && event.bookingContact.trim() ? (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-charcoal/10 text-charcoal rounded-full text-xs font-semibold">
                    {event.bookingContact}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-charcoal/10 text-charcoal/70 rounded-full text-xs font-semibold">
                    Limited availability
                  </div>
                )}
              </div>

              {/* Badge */}
              <div className="pt-2 border-t border-charcoal/10">
                <p className="text-xs text-charcoal/50">
                  Hosted by {businessName}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
