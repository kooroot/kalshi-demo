import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import './index.css'

import { LandingPage } from './routes/landing'
import { ProfilePage } from './routes/profile'
import { DashboardPage } from './routes/dashboard'

const queryClient = new QueryClient()

// Create routes
const rootRoute = createRootRoute()

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scout/$username',
  component: ProfilePage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shield/$username',
  component: DashboardPage,
})

const routeTree = rootRoute.addChildren([landingRoute, profileRoute, dashboardRoute])

const router = createRouter({ routeTree })

// Type registration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
