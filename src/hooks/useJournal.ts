import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { JournalEntry } from '../types/database';

export function useJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function createEntry(entryData: {
    title?: string;
    content: string;
    mood?: string;
    entry_date?: string;
  }) {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        title: entryData.title || null,
        content: entryData.content,
        mood: entryData.mood || null,
        entry_date: entryData.entry_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (!error && data) {
      setEntries((prev) => [data, ...prev]);
    }
    return { error: error as Error | null, data };
  }

  async function updateEntry(id: string, updates: Partial<JournalEntry>) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
    }
    return { error: error as Error | null };
  }

  async function deleteEntry(id: string) {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (!error) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
    return { error: error as Error | null };
  }

  return { entries, loading, error, fetchEntries, createEntry, updateEntry, deleteEntry };
}
