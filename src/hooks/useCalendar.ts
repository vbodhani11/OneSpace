import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { CalendarEvent } from '../types/database';

export function useCalendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function createEvent(eventData: {
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;
    event_type?: string;
  }) {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title: eventData.title,
        description: eventData.description || null,
        start_time: eventData.start_time,
        end_time: eventData.end_time || null,
        event_type: eventData.event_type || 'personal',
      })
      .select()
      .single();

    if (!error && data) {
      setEvents((prev) => [...prev, data].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    }
    return { error: error as Error | null, data };
  }

  async function updateEvent(id: string, updates: Partial<CalendarEvent>) {
    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setEvents((prev) => prev.map((e) => (e.id === id ? data : e)));
    }
    return { error: error as Error | null };
  }

  async function deleteEvent(id: string) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
    return { error: error as Error | null };
  }

  function getEventsForDate(date: string): CalendarEvent[] {
    return events.filter((e) => {
      const eventDate = new Date(e.start_time).toISOString().split('T')[0];
      return eventDate === date;
    });
  }

  return { events, loading, error, fetchEvents, createEvent, updateEvent, deleteEvent, getEventsForDate };
}
