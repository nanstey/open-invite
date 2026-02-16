import { createFileRoute, redirect } from '@tanstack/react-router'

import { AlertsView } from '../domains/alerts/AlertsView'

export const Route = createFileRoute('/alerts')({
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: function AlertsRouteComponent() {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
        <AlertsView />
      </div>
    )
  },
})

