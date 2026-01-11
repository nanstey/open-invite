import React from 'react'
import { RouterProvider, createRouter } from '@tanstack/react-router'

import type { AuthContextType } from './components/AuthProvider'
import type { RouterContext } from './routerContext'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouterProvider(props: { auth: AuthContextType }) {
  return <RouterProvider router={router} context={{ auth: props.auth }} />
}


