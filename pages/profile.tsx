import React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'

import { useAuth } from '../domains/auth/AuthProvider'
import { ProfileView } from '../domains/profile/ProfileView'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: function ProfileRouteComponent() {
    const { user } = useAuth()
    if (!user) return null

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
        <ProfileView currentUser={user} />
      </div>
    )
  },
})

