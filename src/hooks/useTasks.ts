import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Task } from '../types/database';

export function useTasks(statusFilter?: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [user, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function createTask(taskData: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    due_date?: string;
  }) {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        status: 'active',
        position_x: Math.random() * 60 + 10,
        position_y: Math.random() * 50 + 10,
      })
      .select()
      .single();

    if (!error && data) {
      setTasks((prev) => [data, ...prev]);
    }
    return { error: error as Error | null, data };
  }

  async function updateTask(id: string, updates: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    }
    return { error: error as Error | null };
  }

  async function completeTask(id: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
    return { error: error as Error | null };
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
    return { error: error as Error | null };
  }

  async function clearCompleted() {
    if (!user) return;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'completed');
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
    }
  }

  return { tasks, loading, error, fetchTasks, createTask, updateTask, completeTask, deleteTask, clearCompleted };
}
