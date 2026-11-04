import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EXAMS, INTERESTS, type Exam } from '@/lib/personal/goals';
import { useLearner } from './api';

export function LearningProfileCard() {
  const learner = useLearner();
  const d = learner.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning profile</CardTitle>
        <CardDescription>Goals, interests and study habits used to personalise your practice.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {d?.goals.length ? (
          <ul className="space-y-1">
            {d.goals.map((g) => {
              const exam = EXAMS[g.exam as Exam];
              return (
                <li key={g.id}>
                  <strong>{g.language === 'en' ? 'English' : '中文'}</strong>: {exam.label} {exam.describe(g.current_level)} → {exam.describe(g.target_level)}
                  {g.exam_date && ` by ${g.exam_date}`}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">Not set up yet.</p>
        )}
        {d?.profile?.interests.length ? (
          <p className="text-muted-foreground">Interests: {d.profile.interests.map((i) => INTERESTS.find((x) => x.value === i)?.label ?? i).join(', ')}</p>
        ) : null}
        <Button variant="outline" size="sm" asChild>
          <Link to="/onboarding">{d?.profile?.onboarded_at ? 'Edit learning profile' : 'Set up learning profile'}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
