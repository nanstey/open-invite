import React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { LandingPage } from '../domains/home/LandingPage'
import { LoginModal } from '../domains/auth/LoginModal'
import { useAuth } from '../domains/auth/AuthProvider'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.auth.user) {
      throw redirect({ to: '/events', search: { view: 'list' } })
    }
  },
  component: function IndexRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [showLoginModal, setShowLoginModal] = React.useState(false)

    React.useEffect(() => {
      if (!user) return
      setShowLoginModal(false)
      navigate({ to: '/events', search: { view: 'list' }, replace: true })
    }, [user, navigate])

    return (
      <>
        <LandingPage onSignIn={() => setShowLoginModal(true)} />
        {showLoginModal ? <LoginModal onClose={() => setShowLoginModal(false)} /> : null}
      </>
    )
  },
})

