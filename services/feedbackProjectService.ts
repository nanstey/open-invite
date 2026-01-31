import { supabase } from '../lib/supabase'
import type {
  Project,
  ProjectFormData,
  ProjectStatus,
  ProjectFeedbackItem,
} from '../domains/feedback/projectTypes'

// ============================================================================
// Project CRUD
// ============================================================================

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('feedback_projects')
    .select('*')
    .neq('status', 'archived')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }

  const projects: Project[] = (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
    githubRepo: row.github_repo,
    githubUrl: row.github_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  // Fetch feedback counts for each project
  if (projects.length > 0) {
    const projectIds = projects.map(p => p.id)
    const { data: itemCounts } = await supabase
      .from('feedback_project_items')
      .select('project_id')
      .in('project_id', projectIds)

    if (itemCounts) {
      const countMap = new Map<string, number>()
      itemCounts.forEach((item: any) => {
        countMap.set(item.project_id, (countMap.get(item.project_id) || 0) + 1)
      })
      projects.forEach(p => {
        p.feedbackCount = countMap.get(p.id) || 0
      })
    }
  }

  return projects
}

export async function fetchProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('feedback_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !data) {
    console.error('Error fetching project:', error)
    return null
  }

  const row = data as any
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
  }
}

export async function createProject(formData: ProjectFormData): Promise<Project | null> {
  // Get max sort_order for backlog
  const { data: existing } = await supabase
    .from('feedback_projects')
    .select('sort_order')
    .eq('status', 'backlog')
    .order('sort_order', { ascending: false })
    .limit(1)

  const maxOrder = existing && existing.length > 0 ? (existing[0] as any).sort_order : -1

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
    .single()

  if (error || !data) {
    console.error('Error creating project:', error)
    return null
  }

  const row = data as any
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
    feedbackCount: 0,
  }
}

export async function updateProject(
  projectId: string,
  updates: Partial<ProjectFormData> & { status?: ProjectStatus }
): Promise<boolean> {
  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.githubRepo !== undefined) updateData.github_repo = updates.githubRepo
  if (updates.githubUrl !== undefined) updateData.github_url = updates.githubUrl
  if (updates.status !== undefined) updateData.status = updates.status

  const { error } = await supabase
    .from('feedback_projects')
    .update(updateData)
    .eq('id', projectId)

  if (error) {
    console.error('Error updating project:', error)
    return false
  }

  return true
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('feedback_projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('Error deleting project:', error)
    return false
  }

  return true
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
    .eq('id', projectId)

  if (error) {
    console.error('Error moving project:', error)
    return false
  }

  return true
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
  )

  const results = await Promise.all(updates)
  return results.every(r => !r.error)
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
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching project feedback:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    feedbackId: row.feedback_id,
    createdAt: row.created_at,
    feedback: row.user_feedback ? {
      id: row.user_feedback.id,
      title: row.user_feedback.title,
      description: row.user_feedback.description,
      type: row.user_feedback.type,
      importance: row.user_feedback.importance,
      status: row.user_feedback.status,
    } : undefined,
  }))
}

export async function addFeedbackToProject(
  projectId: string,
  feedbackId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('feedback_project_items')
    .insert({
      project_id: projectId,
      feedback_id: feedbackId,
    } as any)

  if (error) {
    console.error('Error adding feedback to project:', error)
    return false
  }

  return true
}

export async function removeFeedbackFromProject(
  projectId: string,
  feedbackId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('feedback_project_items')
    .delete()
    .eq('project_id', projectId)
    .eq('feedback_id', feedbackId)

  if (error) {
    console.error('Error removing feedback from project:', error)
    return false
  }

  return true
}

// ============================================================================
// Fetch feedback not in a project (for adding to project)
// ============================================================================

export async function fetchFeedbackNotInProject(projectId: string): Promise<any[]> {
  // Get feedback IDs already in this project
  const { data: existingItems } = await supabase
    .from('feedback_project_items')
    .select('feedback_id')
    .eq('project_id', projectId)

  const existingIds = existingItems?.map((i: any) => i.feedback_id) || []

  // Fetch all feedback
  const { data: allFeedback, error } = await supabase
    .from('user_feedback')
    .select('id, title, type, importance, status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching feedback:', error)
    return []
  }

  // Filter out feedback already in project
  return (allFeedback || []).filter((f: any) => !existingIds.includes(f.id))
}

// ============================================================================
// Fetch projects linked to a feedback item
// ============================================================================

interface SimpleProject {
  id: string
  title: string
  status: string
}

export async function fetchProjectsForFeedback(feedbackId: string): Promise<SimpleProject[]> {
  const { data, error } = await supabase
    .from('feedback_project_items')
    .select(`
      project_id,
      feedback_projects (
        id,
        title,
        status
      )
    `)
    .eq('feedback_id', feedbackId)

  if (error) {
    console.error('Error fetching projects for feedback:', error)
    return []
  }

  return (data || [])
    .filter((row: any) => row.feedback_projects)
    .map((row: any) => ({
      id: row.feedback_projects.id,
      title: row.feedback_projects.title,
      status: row.feedback_projects.status,
    }))
}

// ============================================================================
// Fetch all projects (for linking feedback to projects)
// ============================================================================

export async function fetchAllProjects(): Promise<SimpleProject[]> {
  const { data, error } = await supabase
    .from('feedback_projects')
    .select('id, title, status')
    .neq('status', 'archived')
    .order('title', { ascending: true })

  if (error) {
    console.error('Error fetching all projects:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
  }))
}

// ============================================================================
// Fetch all feedback-to-project mappings (for displaying in feedback list)
// ============================================================================

export interface FeedbackProjectMapping {
  feedbackId: string
  projectId: string
  projectTitle: string
  projectStatus: string
}

export async function fetchAllFeedbackProjectMappings(): Promise<FeedbackProjectMapping[]> {
  const { data, error } = await supabase
    .from('feedback_project_items')
    .select(`
      feedback_id,
      project_id,
      feedback_projects (
        id,
        title,
        status
      )
    `)

  if (error) {
    console.error('Error fetching feedback-project mappings:', error)
    return []
  }

  return (data || [])
    .filter((row: any) => row.feedback_projects)
    .map((row: any) => ({
      feedbackId: row.feedback_id,
      projectId: row.feedback_projects.id,
      projectTitle: row.feedback_projects.title,
      projectStatus: row.feedback_projects.status,
    }))
}
