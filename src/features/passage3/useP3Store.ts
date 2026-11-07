import { useSyncExternalStore } from 'react';
import { getVersion, subscribe } from '@/lib/ielts/passage3';

/** Re-render when the Passage 3 progress or the pasted sets change. */
export function useP3Store() {
  return useSyncExternalStore(subscribe, getVersion);
}
