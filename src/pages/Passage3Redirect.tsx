import { Navigate, useLocation } from 'react-router-dom';

/** The old /ielts/passage3 library now lives inside Luyện thi → Reading; keep old links and bookmarks working. */
export default function Passage3Redirect() {
  const q = new URLSearchParams(useLocation().search);
  const tab = q.get('tab');
  const skill = q.get('skill');
  const to = skill ? `?skill=${encodeURIComponent(skill)}` : tab === 'cambridge' ? '?format=cam' : tab === 'notes' ? '?format=notes' : '?format=p3';
  return <Navigate to={`/ielts/reading${to}`} replace />;
}
