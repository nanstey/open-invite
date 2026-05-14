import { createFileRoute, redirect } from '@tanstack/react-router';

import { ExplorePage } from '../domains/events/components/explore/ExplorePage';

export const Route = createFileRoute('/explore')({
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' });
    }
  },
  component: ExplorePage,
});
