import { VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { SpeechError } from '@/lib/speech/tts';

/** Explains how to get a voice when the device can't speak the lesson language. */
export function SpeechErrorNotice({ error, language }: { error: SpeechError; language: 'en' | 'zh' }) {
  if (error.reason === 'blocked') {
    return (
      <Alert variant="info">
        <VolumeX />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive">
      <VolumeX />
      <AlertTitle>Audio unavailable</AlertTitle>
      <AlertDescription className="space-y-1.5">
        <p>{error.message}</p>
        {error.reason === 'no-voice' && (
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            <li>Chrome / Edge on a computer include online voices — make sure you are online.</li>
            <li>
              Windows: Settings → Time &amp; language → Speech → add a voice for {language === 'zh' ? 'Chinese (Simplified, China)' : 'English'}.
            </li>
            <li>macOS / iOS: Settings → Accessibility → Spoken Content → System voice → add {language === 'zh' ? 'Chinese (China mainland)' : 'English'}.</li>
            <li>Android: Settings → Text-to-speech → Google → install {language === 'zh' ? 'Chinese (Mandarin)' : 'English'} voice data.</li>
          </ul>
        )}
        {error.reason === 'unsupported' && <p className="text-xs">Try a recent version of Chrome, Edge, Safari or Firefox.</p>}
        <p className="text-xs">
          You can choose a voice in <Link to="/settings" className="underline">Settings</Link>.
        </p>
      </AlertDescription>
    </Alert>
  );
}
