import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import type { Feedback, FeedbackFormData, FeedbackStatus, FeedbackRow } from '../domains/feedback/types'

type FeedbackInsert = Database['public']['Tables']['user_feedback']['Insert']

/**
 * Transform database row to application type
 */
function transformFeedbackRow(row: FeedbackRow, userName?: string, userAvatar?: string): Feedback {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.type,
    importance: row.importance,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName,
    userAvatar,
  }
}

/**
 * Submit new feedback from current user
 */
export async function submitFeedback(data: FeedbackFormData): Promise<Feedback | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User must be authenticated to submit feedback')
  }

  const insertData: FeedbackInsert = {
    user_id: user.id,
    title: data.title,
    type: data.type,
    importance: data.importance,
    description: data.description,
  }

  const { data: feedback, error } = await supabase
    .from('user_feedback')
    .insert(insertData as any)
    .select()
    .single()

  if (error || !feedback) {
    console.error('Error submitting feedback:', error)
    return null
  }

  return transformFeedbackRow(feedback as FeedbackRow)
}

/**
 * Fetch current user's feedback submissions
 */
export async function fetchUserFeedback(): Promise<Feedback[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user feedback:', error)
    return []
  }

  return (data as FeedbackRow[]).map(row => transformFeedbackRow(row))
}

/**
 * Fetch all feedback (admin only - RLS enforced)
 */
export async function fetchAllFeedback(): Promise<Feedback[]> {
  const { data: feedbackData, error: feedbackError } = await supabase
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (feedbackError) {
    console.error('Error fetching all feedback:', feedbackError)
    return []
  }

  const feedbackRows = feedbackData as FeedbackRow[]

  if (feedbackRows.length === 0) {
    return []
  }

  // Fetch user profiles for all feedback
  const userIds = [...new Set(feedbackRows.map(f => f.user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, name, avatar')
    .in('id', userIds)

  if (profilesError) {
    console.error('Error fetching user profiles:', profilesError)
  }

  const profileMap = new Map<string, { name: string; avatar: string }>()
  if (profiles) {
    profiles.forEach(p => {
      profileMap.set(p.id, { name: p.name, avatar: p.avatar })
    })
  }

  return feedbackRows.map(row => {
    const profile = profileMap.get(row.user_id)
    return transformFeedbackRow(row, profile?.name, profile?.avatar)
  })
}

/**
 * Update feedback status (admin only - RLS enforced)
 */
export async function updateFeedbackStatus(feedbackId: string, status: FeedbackStatus): Promise<boolean> {
  const { error } = await supabase
    .from('user_feedback')
    .update({ status } as any)
    .eq('id', feedbackId)

  if (error) {
    console.error('Error updating feedback status:', error)
    return false
  }

  return true
}

/**
 * Check if current user is admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return false
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return false
  }

  return (data as { is_admin: boolean }).is_admin ?? false
}

