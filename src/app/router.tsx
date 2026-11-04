import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { GuestOnly, RequireAuth } from '@/features/auth/guards';
import LandingPage from '@/pages/LandingPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { ReviewPage, StatisticsPage, VocabularyPage } from '@/pages/placeholders';
import RouteErrorPage from '@/pages/RouteErrorPage';
import { AppLayout } from './layout/AppLayout';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const LessonsPage = lazy(() => import('@/pages/LessonsPage'));
const LessonDetailPage = lazy(() => import('@/pages/LessonDetailPage'));
const MyLearningPage = lazy(() => import('@/pages/MyLearningPage'));

const page = (el: ReactNode) => <Suspense fallback={<FullPageSpinner />}>{el}</Suspense>;

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    element: <Outlet />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <GuestOnly>{page(<LoginPage />)}</GuestOnly> },
      { path: '/register', element: <GuestOnly>{page(<RegisterPage />)}</GuestOnly> },
      {
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          { path: '/dashboard', element: page(<DashboardPage />) },
          { path: '/lessons', element: page(<LessonsPage />) },
          { path: '/lessons/:lessonId', element: page(<LessonDetailPage />) },
          { path: '/my-learning', element: page(<MyLearningPage />) },
          { path: '/vocabulary', element: <VocabularyPage /> },
          { path: '/review', element: <ReviewPage /> },
          { path: '/statistics', element: <StatisticsPage /> },
          { path: '/settings', element: page(<SettingsPage />) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
