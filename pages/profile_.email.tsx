import { createFileRoute, redirect } from '@tanstack/react-router';

import { EmailPreferencesView } from '../domains/profile/EmailPreferencesView';

export const Route = createFileRoute('/profile_/email')({
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' });
    }
  },
  component: function EmailPreferencesRouteComponent() {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
        <EmailPreferencesView />
      </div>
    );
  },
});
