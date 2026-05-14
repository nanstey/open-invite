import { createRouter, RouterProvider } from '@tanstack/react-router';

import type { AuthContextType } from './domains/auth/AuthProvider';
import { routeTree } from './routeTree.gen';

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined as unknown as AuthContextType,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouterProvider(props: { auth: AuthContextType }) {
  return <RouterProvider router={router} context={{ auth: props.auth }} />;
}
