import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, X } from 'lucide-react';
import { useToast } from '@/app/contexts/ToastContext';

interface EventFormData {
  title: string;
  type: 'event' | 'special';
  startDate: string;
  endDate?: string;
  location: string;
  description?: string;
  icon?: string;
  price?: number;
  bookingUrl?: string;
  bookingContact?: string;
}

interface BusinessEvent extends EventFormData {
  id: string;
  businessId: string;
  createdAt: string;
  image?: string;
}

interface EventsFormProps {
  businessId: string;
  businessName: string;
}

const ICON_OPTIONS = [
  '🎉', '🎊', '🎭', '🎪', '🎨', '🎬', '🎤', '🎸',
  '🍽️', '🍷', '☕', '🏆', '🎯', '🎁', '⭐', '❤️'
];

export default function EventsForm({ businessId, businessName }: EventsFormProps) {
  const { showToast } = useToast();
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    type: 'event',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    icon: '🎉',
    price: undefined,
    bookingUrl: '',
    bookingContact: '',
  });

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
  }, [businessId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/businesses/${businessId}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const result = await res.json();
      setEvents(result.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      showToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.startDate || !formData.location) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `/api/businesses/${businessId}/events?eventId=${editingId}`
        : `/api/businesses/${businessId}/events`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save event');
      }

      await fetchEvents();
      resetForm();
      showToast(editingId ? 'Event updated successfully' : 'Event created successfully', 'success');
    } catch (error) {
      console.error('Error saving event:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: BusinessEvent) => {
    setFormData({
      title: event.title,
      type: event.type,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      description: event.description,
      icon: event.icon,
      price: event.price,
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/businesses/${businessId}/events?eventId=${eventId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete event');
      await fetchEvents();
      showToast('Event deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast('Failed to delete event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'event',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
      icon: '🎉',
      price: undefined,
      bookingUrl: '',
      bookingContact: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 py-6 border-t border-charcoal/10">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-charcoal">Events & Specials</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-coral text-white hover:bg-coral/90 transition"
          >
            <Plus size={18} />
            Add Event
          </button>
        )}
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="bg-off-white rounded-[20px] p-6 border border-charcoal/10">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-charcoal">
              {editingId ? 'Edit Event' : 'Create New Event'}
            </h4>
            <button
              onClick={resetForm}
              className="text-charcoal/50 hover:text-charcoal"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Grand Opening, 50% Off Sale"
                className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
              >
                <option value="event">Event</option>
                <option value="special">Special / Promotion</option>
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Main Store, Downtown Location"
                className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Add details about your event or special offer..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral resize-none"
              />
            </div>

            {/* Icon & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Icon
                </label>
                <select
                  name="icon"
                  value={formData.icon || '🎉'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  {ICON_OPTIONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Price (optional)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price ?? ''}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
                />
                </div>

                {/* Booking Information */}
                <div className="bg-charcoal/5 rounded-lg p-4 border border-charcoal/10">
                  <h5 className="font-semibold text-charcoal text-sm mb-3">Booking & Availability</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">
                        Booking URL (optional)
                      </label>
                      <input
                        type="url"
                        name="bookingUrl"
                        value={formData.bookingUrl || ''}
                        onChange={handleInputChange}
                        placeholder="https://example.com/book-event"
                        className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
                      />
                      <p className="text-xs text-charcoal/50 mt-1">Link to external booking system (Eventbrite, Bookings.com, etc.)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">
                        Booking Contact (optional)
                      </label>
                      <input
                        type="text"
                        name="bookingContact"
                        value={formData.bookingContact || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., Call us or Check availability"
                        className="w-full px-4 py-2 rounded-lg border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral"
                      />
                      <p className="text-xs text-charcoal/50 mt-1">Shown when no booking URL available (e.g., "Contact business to book")</p>
                    </div>
                  </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 disabled:opacity-50 transition font-medium"
              >
                {loading ? 'Saving...' : (editingId ? 'Update Event' : 'Create Event')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-charcoal/20 text-charcoal rounded-lg hover:bg-charcoal/5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {loading && !showForm ? (
          <p className="text-center py-8 text-charcoal/50">Loading events...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-charcoal/50">
            <p>No events or specials yet</p>
            <p className="text-sm">Create your first event to get started</p>
          </div>
        ) : (
          events.map(event => (
            <div
              key={event.id}
              className="bg-off-white rounded-lg p-4 border border-charcoal/10 hover:border-coral/30 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{event.icon || '🎉'}</span>
                    <h5 className="font-semibold text-charcoal">{event.title}</h5>
                    <span className="text-xs px-2 py-1 bg-charcoal/10 rounded-full text-charcoal/70">
                      {event.type === 'event' ? 'Event' : 'Special'}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-charcoal/70 mt-1">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-charcoal/60">
                    <span>📍 {event.location}</span>
                    <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
                    {event.price && <span>💰 ${event.price}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(event)}
                    disabled={loading}
                    className="p-2 text-charcoal/60 hover:text-coral transition disabled:opacity-50"
                    title="Edit event"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={loading}
                    className="p-2 text-charcoal/60 hover:text-coral transition disabled:opacity-50"
                    title="Delete event"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
