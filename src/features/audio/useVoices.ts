import { useEffect, useState } from 'react';
import { listVoices, loadVoices, ttsSupported } from '@/lib/speech/tts';
import type { SpeechLanguage } from '@/lib/speech/voices';

export function useVoices() {
  const supported = ttsSupported();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ready, setReady] = useState(!supported);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    loadVoices().then((v) => {
      if (!active) return;
      setVoices(v);
      setReady(true);
    });
    // Some browsers add (online) voices later.
    const onChange = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    return () => {
      active = false;
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
    };
  }, [supported]);

  return {
    supported,
    ready,
    voices,
    voicesFor: (language: SpeechLanguage) => listVoices(voices, language),
  };
}
