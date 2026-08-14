import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/useAuth';
import type { Task } from '../types/database';

export function useTasks(statusFilter?: Task['status']) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8000);

    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (timedOut) {
        setError('Taking too long to load. Tap retry.');
      } else if (error) {
        setError(error.message);
      } else {
        setTasks(data || []);
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTasks();
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

  async function toggleTask(id: string) {
    const currentTask = tasks.find((task) => task.id === id);
    if (!currentTask) return { error: new Error('Task not found') };

    const nextStatus = currentTask.status === 'completed' ? 'active' : 'completed';
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setTasks((prev) => {
        if (statusFilter && data.status !== statusFilter) {
          return prev.filter((task) => task.id !== id);
        }
        return prev.map((task) => (task.id === id ? data : task));
      });
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
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'completed');
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
    }
    return { error: error as Error | null };
  }

  return { tasks, loading, error, fetchTasks, createTask, updateTask, toggleTask, deleteTask, clearCompleted };
}
