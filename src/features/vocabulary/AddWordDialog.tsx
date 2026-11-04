import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { toPinyin } from '@/lib/chinese/pinyin';
import { toUserMessage } from '@/lib/errors';
import { POS, POS_LABEL, type Pos } from '@/lib/vocab/pos';
import { normalizeTerm } from '@/lib/vocab/words';
import { topicOptions, useAddWord, useVocabulary, type Language } from './api';

export function AddWordDialog({ defaultLanguage }: { defaultLanguage: Language }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [pos, setPos] = useState<Pos | ''>('');
  const [topic, setTopic] = useState('');
  const [example, setExample] = useState('');
  const add = useAddWord();
  const vocab = useVocabulary();

  const reset = () => {
    setTerm('');
    setMeaning('');
    setPos('');
    setExample('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = normalizeTerm(term, language);
    if (!t) return;
    add.mutate(
      {
        language,
        term: t,
        reading: language === 'zh' ? toPinyin(t) : null,
        meaning_vi: meaning.trim() || null,
        part_of_speech: pos || null,
        topic: topic || null,
        examples: example.trim() ? [example.trim()] : [],
      },
      {
        onSuccess: () => {
          toast.success(`Added "${t}"`);
          reset();
        },
        onError: (err) => toast.error(toUserMessage(err)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Add word
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add a word</DialogTitle>
        <DialogDescription>Words you meet in lessons can also be added by clicking them.</DialogDescription>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="aw-lang">Language</Label>
            <NativeSelect id="aw-lang" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="aw-term">Word</Label>
            <Input id="aw-term" value={term} onChange={(e) => setTerm(e.target.value)} maxLength={100} required autoFocus lang={language} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="aw-meaning">Nghĩa tiếng Việt</Label>
            <Input id="aw-meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} maxLength={500} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="aw-pos">Type</Label>
            <NativeSelect id="aw-pos" value={pos} onChange={(e) => setPos(e.target.value as Pos | '')}>
              <option value="">—</option>
              {POS.map((p) => (
                <option key={p} value={p}>
                  {POS_LABEL[p]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="aw-topic">Topic</Label>
            <NativeSelect id="aw-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">—</option>
              {topicOptions(vocab.data).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="aw-example">Example sentence (optional)</Label>
            <Input id="aw-example" value={example} onChange={(e) => setExample(e.target.value)} maxLength={500} lang={language} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Done
            </Button>
            <Button type="submit" disabled={!term.trim() || add.isPending}>
              {add.isPending && <Loader2 className="animate-spin" />} Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
