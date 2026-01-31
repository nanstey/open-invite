import React, { useEffect, useState } from 'react'
import { createFileRoute, redirect, useNavigate, Outlet } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { useAuth } from '../domains/auth/AuthProvider'
import { checkIsAdmin } from '../services/feedbackService'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context, location }) => {
    // Must be authenticated
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
    // If exactly /admin, redirect to /admin/feedback
    if (location.pathname === '/admin') {
      throw redirect({ to: '/admin/feedback', search: { feedbackId: undefined } })
    }
  },
  component: AdminLayoutComponent,
})

function AdminLayoutComponent() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    // Still loading auth state, wait
    if (loading) return

    // Not signed in after loading completed, redirect home
    if (!user) {
      navigate({ to: '/' })
      return
    }

    const checkAdminStatus = async () => {
      const admin = await checkIsAdmin()
      setIsAdmin(admin)

      // Redirect non-admins to profile
      if (!admin) {
        navigate({ to: '/profile' })
      }
    }

    checkAdminStatus()
  }, [user, loading, navigate])

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

  return <Outlet />
}
