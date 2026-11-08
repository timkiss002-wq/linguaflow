import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
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
const WritingPage = lazy(() => import('@/pages/WritingPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const WritingEditorPage = lazy(() => import('@/pages/WritingEditorPage'));
const WritingResultPage = lazy(() => import('@/pages/WritingResultPage'));
const GuidedWritingPage = lazy(() => import('@/pages/GuidedWritingPage'));
const WritingMistakesPage = lazy(() => import('@/pages/WritingMistakesPage'));
const GuidedPracticePage = lazy(() => import('@/pages/GuidedPracticePage'));
const IeltsTestsPage = lazy(() => import('@/pages/IeltsTestsPage'));
const IeltsTestPage = lazy(() => import('@/pages/IeltsTestPage'));
const Passage3Redirect = lazy(() => import('@/pages/Passage3Redirect'));
const Passage3PracticePage = lazy(() => import('@/pages/Passage3PracticePage'));
const Passage3ImportPage = lazy(() => import('@/pages/Passage3ImportPage'));
const AssessmentPage = lazy(() => import('@/pages/AssessmentPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const MyLearningPage = lazy(() => import('@/pages/MyLearningPage'));
const GrammarPage = lazy(() => import('@/pages/GrammarPage'));
const GrammarDrillPage = lazy(() => import('@/pages/GrammarDrillPage'));

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
          { path: '/ielts', element: <Navigate to="/ielts/reading" replace /> },
          { path: '/ielts/reading', element: page(<IeltsTestsPage skill="reading" />) },
          { path: '/ielts/listening', element: page(<IeltsTestsPage skill="listening" />) },
          { path: '/ielts/passage3', element: page(<Passage3Redirect />) },
          { path: '/ielts/passage3/edit/:key', element: page(<Passage3ImportPage />) },
          { path: '/ielts/passage3/:setId', element: page(<Passage3PracticePage />) },
          { path: '/ielts/:testId', element: page(<IeltsTestPage />) },
          { path: '/grammar', element: page(<GrammarPage />) },
          { path: '/grammar/:topicId', element: page(<GrammarDrillPage />) },
          { path: '/vocabulary', element: page(<VocabularyPage />) },
          { path: '/vocabulary/practice', element: page(<VocabularyPracticePage />) },
          { path: '/word-forms', element: page(<WordFormsPage />) },
          { path: '/review', element: page(<ReviewPage />) },
          { path: '/statistics', element: page(<StatisticsPage />) },
          { path: '/writing', element: page(<WritingPage />) },
          { path: '/writing/new/:taskId', element: page(<WritingEditorPage />) },
          { path: '/writing/guided', element: page(<GuidedWritingPage />) },
          { path: '/writing/mistakes', element: page(<WritingMistakesPage />) },
          { path: '/writing/guided/frame/:typeId', element: page(<GuidedPracticePage />) },
          { path: '/writing/guided/:promptId', element: page(<GuidedPracticePage />) },
          { path: '/writing/:submissionId', element: page(<WritingResultPage />) },
          { path: '/level-test', element: page(<LevelTestPage />) },
          { path: '/level-test/:testId', element: page(<AssessmentPage />) },
          { path: '/insights', element: page(<InsightsPage />) },
          { path: '/admin', element: page(<AdminPage />) },
          { path: '/settings', element: page(<SettingsPage />) },
          { path: '/onboarding', element: page(<OnboardingPage />) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
