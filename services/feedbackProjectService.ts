import type {
  Project,
  ProjectFeedbackItem,
  ProjectFormData,
  ProjectStatus,
  SimpleProject,
} from '../domains/feedback/projectTypes';
import type { SimpleFeedbackItem } from '../domains/feedback/types';
import { supabase } from '../lib/supabase';

// ============================================================================
// Transform Helpers
// ============================================================================

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Transform database row to Project type
 */
function transformProjectRow(row: any): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
    githubRepo: row.github_repo,
    githubUrl: row.github_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function visibleProjectsOrClause(cutoffIso: string): string {
  return [
    'status.neq.completed',
    `and(status.eq.completed,updated_at.gte.${cutoffIso})`,
    'and(status.eq.completed,updated_at.is.null)',
  ].join(',');
}

function visibleProjectsQuery(selectClause = '*') {
  const cutoffIso = new Date(Date.now() - TWO_WEEKS_MS).toISOString();

  return supabase
    .from('feedback_projects')
    .select(selectClause)
    .is('archived_at', null)
    .or(visibleProjectsOrClause(cutoffIso));
}

// ============================================================================
// Project CRUD
// ============================================================================

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await visibleProjectsQuery().order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  const projects: Project[] = (data || []).map(transformProjectRow);

  // Fetch feedback counts for each project
  if (projects.length > 0) {
    const projectIds = projects.map(p => p.id);
    const { data: itemCounts } = await supabase
      .from('feedback_project_items')
      .select('project_id')
      .in('project_id', projectIds);

    if (itemCounts) {
      const countMap = new Map<string, number>();
      itemCounts.forEach((item: any) => {
        countMap.set(item.project_id, (countMap.get(item.project_id) || 0) + 1);
      });
      projects.forEach(p => {
        p.feedbackCount = countMap.get(p.id) || 0;
      });
    }
  }

  return projects;
}

export async function fetchProject(projectId: string): Promise<Project | null> {
  const { data, error } = await visibleProjectsQuery().eq('id', projectId).single();

  if (error || !data) {
    console.error('Error fetching project:', error);
    return null;
  }

  return transformProjectRow(data);
}

export async function createProject(formData: ProjectFormData): Promise<Project | null> {
  // Get max sort_order for backlog
  const { data: existing } = await supabase
    .from('feedback_projects')
    .select('sort_order')
    .eq('status', 'backlog')
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxOrder = existing && existing.length > 0 ? (existing[0] as any).sort_order : -1;

  const { data, error } = await supabase
    .from('feedback_projects')
    .insert({
      title: formData.title,
      description: formData.description || null,
      github_repo: formData.githubRepo || null,
      github_url: formData.githubUrl || null,
      status: 'backlog',
      sort_order: maxOrder + 1,
    } as any)
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating project:', error);
    return null;
  }

  return {
    ...transformProjectRow(data),
    feedbackCount: 0,
  };
}

export async function updateProject(
  projectId: string,
  updates: Partial<ProjectFormData> & { status?: ProjectStatus }
): Promise<boolean> {
  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.githubRepo !== undefined) updateData.github_repo = updates.githubRepo;
  if (updates.githubUrl !== undefined) updateData.github_url = updates.githubUrl;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { error } = await supabase.from('feedback_projects').update(updateData).eq('id', projectId);

  if (error) {
    console.error('Error updating project:', error);
    return false;
  }

  return true;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  // Soft-delete behavior: archive instead of hard delete.
  const { error } = await supabase
    .from('feedback_projects')
    .update({ archived_at: new Date().toISOString() } as any)
    .eq('id', projectId);

  if (error) {
    console.error('Error archiving project:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Move project to a different status column
// ============================================================================

export async function moveProjectToStatus(
  projectId: string,
  newStatus: ProjectStatus,
  newSortOrder: number
): Promise<boolean> {
  const { error } = await supabase
    .from('feedback_projects')
    .update({
      status: newStatus,
      sort_order: newSortOrder,
    } as any)
    .eq('id', projectId);

  if (error) {
    console.error('Error moving project:', error);
    return false;
  }

  return true;
}

export async function reorderProjectsInColumn(
  status: ProjectStatus,
  projectIds: string[]
): Promise<boolean> {
  const updates = projectIds.map((id, index) =>
    supabase
      .from('feedback_projects')
      .update({ sort_order: index } as any)
      .eq('id', id)
      .eq('status', status)
  );

  const results = await Promise.all(updates);
  return results.every(r => !r.error);
}

// ============================================================================
// Project Feedback Items
// ============================================================================

export async function fetchProjectFeedback(projectId: string): Promise<ProjectFeedbackItem[]> {
  const { data, error } = await supabase
    .from('feedback_project_items')
    .select(`
      id,
      project_id,
      feedback_id,
      created_at,
      user_feedback (
        id,
        title,
        description,
        type,
        importance,
        status
      )
    `)
    .eq('project_id', projectId);

  if (error) {
    console.error('Error fetching project feedback:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    feedbackId: row.feedback_id,
    createdAt: row.created_at,
    feedback: row.user_feedback
      ? {
          id: row.user_feedback.id,
          title: row.user_feedback.title,
          description: row.user_feedback.description,
          type: row.user_feedback.type,
          importance: row.user_feedback.importance,
          status: row.user_feedback.status,
        }
      : undefined,
  }));
}

export async function addFeedbackToProject(
  projectId: string,
  feedbackId: string
): Promise<boolean> {
  const { error } = await supabase.from('feedback_project_items').insert({
    project_id: projectId,
    feedback_id: feedbackId,
  } as any);

  if (error) {
    console.error('Error adding feedback to project:', error);
    return false;
  }

  return true;
}

export async function removeFeedbackFromProject(
  projectId: string,
  feedbackId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('feedback_project_items')
    .delete()
    .eq('project_id', projectId)
    .eq('feedback_id', feedbackId);

  if (error) {
    console.error('Error removing feedback from project:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Fetch feedback not in a project (for adding to project)
// ============================================================================

export async function fetchFeedbackNotInProject(projectId: string): Promise<any[]> {
  // Get feedback IDs already in this project
  const { data: existingItems } = await supabase
    .from('feedback_project_items')
    .select('feedback_id')
    .eq('project_id', projectId);

  const existingIds = existingItems?.map((i: any) => i.feedback_id) || [];

  // Fetch all feedback
  const { data: allFeedback, error } = await supabase
    .from('user_feedback')
    .select('id, title, type, importance, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feedback:', error);
    return [];
  }

  // Filter out feedback already in project
  return (allFeedback || []).filter((f: any) => !existingIds.includes(f.id));
}

// ============================================================================
// Fetch all feedback items (simplified for pickers)
// ============================================================================

export async function fetchAllFeedbackSimple(): Promise<SimpleFeedbackItem[]> {
  const { data, error } = await supabase
    .from('user_feedback')
    .select('id, title, description, type, importance, status')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feedback:', error);
    return [];
  }

  return (data || []) as SimpleFeedbackItem[];
}

// ============================================================================
// Fetch projects linked to a feedback item
// ============================================================================

export async function fetchProjectsForFeedback(feedbackId: string): Promise<SimpleProject[]> {
  const { data: links, error: linksError } = await supabase
    .from('feedback_project_items')
    .select('project_id')
    .eq('feedback_id', feedbackId);

  if (linksError) {
    console.error('Error fetching projects for feedback:', linksError);
    return [];
  }

  const projectIds = [...new Set((links || []).map((row: any) => row.project_id))];
  if (projectIds.length === 0) {
    return [];
  }

  const { data: projects, error } = await visibleProjectsQuery('id, title, status')
    .in('id', projectIds)
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching projects for feedback:', error);
    return [];
  }

  return (projects || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
  }));
}

// ============================================================================
// Fetch all projects (for linking feedback to projects)
// ============================================================================

export async function fetchAllProjects(): Promise<SimpleProject[]> {
  const { data, error } = await visibleProjectsQuery('id, title, status').order('title', {
    ascending: true,
  });

  if (error) {
    console.error('Error fetching all projects:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
  })) as SimpleProject[];
}

// ============================================================================
// Fetch all feedback-to-project mappings (for displaying in feedback list)
// ============================================================================

export interface FeedbackProjectMapping {
  feedbackId: string;
  projectId: string;
  projectTitle: string;
  projectStatus: string;
}

export async function fetchAllFeedbackProjectMappings(): Promise<FeedbackProjectMapping[]> {
  const { data: links, error: linksError } = await supabase
    .from('feedback_project_items')
    .select('feedback_id, project_id');

  if (linksError) {
    console.error('Error fetching feedback-project mappings:', linksError);
    return [];
  }

  const projectIds = [...new Set((links || []).map((row: any) => row.project_id))];
  if (projectIds.length === 0) {
    return [];
  }

  const { data: projects, error } = await visibleProjectsQuery('id, title, status').in(
    'id',
    projectIds
  );

  if (error) {
    console.error('Error fetching feedback-project mappings:', error);
    return [];
  }

  const projectMap = new Map((projects || []).map((row: any) => [row.id, row]));

  return (links || [])
    .filter((row: any) => projectMap.has(row.project_id))
    .map((row: any) => {
      const project = projectMap.get(row.project_id);

      return {
        feedbackId: row.feedback_id,
        projectId: row.project_id,
        projectTitle: project.title,
        projectStatus: project.status,
      };
    });
}
