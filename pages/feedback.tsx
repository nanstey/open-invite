import React, { useEffect, useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { useAuth } from '../domains/auth/AuthProvider'
import { checkIsAdmin } from '../services/feedbackService'
import { FeedbackAdminPage } from '../domains/feedback/FeedbackAdminPage'

export const Route = createFileRoute('/feedback')({
  beforeLoad: ({ context }) => {
    // Must be authenticated
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: FeedbackRouteComponent,
})

function FeedbackRouteComponent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) return

    const checkAdmin = async () => {
      const admin = await checkIsAdmin()
      setIsAdmin(admin)

      // Redirect non-admins to profile
      if (!admin) {
        navigate({ to: '/profile' })
      }
    }

    checkAdmin()
  }, [user, navigate])

  // Loading state while checking admin status
  if (isAdmin === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Non-admin will be redirected
  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
      <FeedbackAdminPage />
    </div>
  )
}
