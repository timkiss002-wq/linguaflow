import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { GuestOnly, RequireAuth } from '@/features/auth/guards';
import LandingPage from '@/pages/LandingPage';
import NotFoundPage from '@/pages/NotFoundPage';
import RouteErrorPage from '@/pages/RouteErrorPage';
import { AppLayout } from './layout/AppLayout';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const LessonsPage = lazy(() => import('@/pages/LessonsPage'));
const LessonDetailPage = lazy(() => import('@/pages/LessonDetailPage'));
const DictationPage = lazy(() => import('@/pages/DictationPage'));
const VocabularyPage = lazy(() => import('@/pages/VocabularyPage'));
const VocabularyPracticePage = lazy(() => import('@/pages/VocabularyPracticePage'));
const WordFormsPage = lazy(() => import('@/pages/WordFormsPage'));
const ReviewPage = lazy(() => import('@/pages/ReviewPage'));
const StatisticsPage = lazy(() => import('@/pages/StatisticsPage'));
const InsightsPage = lazy(() => import('@/pages/InsightsPage'));
const LevelTestPage = lazy(() => import('@/pages/LevelTestPage'));
const AssessmentPage = lazy(() => import('@/pages/AssessmentPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
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
      { path: '/forgot-password', element: <GuestOnly>{page(<ForgotPasswordPage />)}</GuestOnly> },
      // Not GuestOnly: the email link signs the user in, then they set a new password here.
      { path: '/reset-password', element: page(<ResetPasswordPage />) },
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
          { path: '/lessons/:lessonId/practice', element: page(<DictationPage />) },
          { path: '/my-learning', element: page(<MyLearningPage />) },
          { path: '/vocabulary', element: page(<VocabularyPage />) },
          { path: '/vocabulary/practice', element: page(<VocabularyPracticePage />) },
          { path: '/word-forms', element: page(<WordFormsPage />) },
          { path: '/review', element: page(<ReviewPage />) },
          { path: '/statistics', element: page(<StatisticsPage />) },
          { path: '/level-test', element: page(<LevelTestPage />) },
          { path: '/level-test/:testId', element: page(<AssessmentPage />) },
          { path: '/insights', element: page(<InsightsPage />) },
          { path: '/settings', element: page(<SettingsPage />) },
          { path: '/onboarding', element: page(<OnboardingPage />) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
