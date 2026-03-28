'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Project } from '@/lib/types/database';

// ---------- Fetch all projects for current user ----------
export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error.message);
    return [];
  }

  return (data as Project[]) ?? [];
}

// ---------- Fetch single project ----------
export async function getProject(projectId: string): Promise<Project | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching project:', error.message);
    return null;
  }

  return data as Project;
}

// ---------- Create project ----------
export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const title = (formData.get('title') as string)?.trim() || 'Untitled Project';
  const description = (formData.get('description') as string)?.trim() || null;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title,
      description,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error.message);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  redirect(`/project/${data.id}`);
}

// ---------- Update project ----------
export async function updateProject(projectId: string, updates: Partial<Pick<Project, 'title' | 'description' | 'script' | 'creative_direction' | 'status'>>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating project:', error.message);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ---------- Delete project ----------
export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting project:', error.message);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
