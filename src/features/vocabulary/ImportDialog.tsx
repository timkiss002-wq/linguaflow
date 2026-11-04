import { FileUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { toUserMessage } from '@/lib/errors';
import { importVocabularyCsv, type ImportResult } from '@/lib/vocab/csv';
import { useImportWords, type Language } from './api';

const MAX_BYTES = 2 * 1024 * 1024;

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [parsed, setParsed] = useState<(ImportResult & { fileName: string }) | null>(null);
  const importWords = useImportWords();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) return toast.error('File is larger than 2 MB.');
    setParsed({ ...importVocabularyCsv(await file.text()), fileName: file.name });
  };

  const run = () =>
    parsed &&
    importWords.mutate(
      { rows: parsed.rows, language },
      {
        onSuccess: ({ inserted, duplicates }) => {
          toast.success(`Imported ${inserted} words${duplicates ? ` · ${duplicates} already in your notebook` : ''}`);
          setParsed(null);
          setOpen(false);
        },
        onError: (e) => toast.error(toUserMessage(e)),
      },
    );

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), o || setParsed(null))}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileUp /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Import from a sheet</DialogTitle>
        <DialogDescription>
          In Google Sheets choose File → Download → CSV. Columns like <em>Từ mới, Giải thích, Topic, loại từ, Ví dụ 1–5</em> are recognised automatically.
        </DialogDescription>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="imp-lang">Language of the words</Label>
            <NativeSelect id="imp-lang" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="imp-file">CSV file</Label>
            <input id="imp-file" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-card file:px-3 file:py-1.5 file:text-sm" />
          </div>
        </div>
        {parsed && (
          <div className="rounded-md border p-3 text-sm" role="status">
            <p>
              <strong>{parsed.rows.length}</strong> words ready to import from {parsed.fileName}
              {parsed.skipped.length > 0 && `, ${parsed.skipped.length} rows skipped`}.
            </p>
            {parsed.rows.length > 0 && (
              <p className="mt-1 truncate text-muted-foreground">
                {parsed.rows
                  .slice(0, 6)
                  .map((r) => r.term)
                  .join(', ')}
                {parsed.rows.length > 6 && '…'}
              </p>
            )}
            {parsed.skipped.length > 0 && (
              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Skipped rows</summary>
                <ul className="mt-1 max-h-28 overflow-y-auto">
                  {parsed.skipped.map((s) => (
                    <li key={s.line}>
                      Line {s.line}: {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={run} disabled={!parsed?.rows.length || importWords.isPending}>
            {importWords.isPending && <Loader2 className="animate-spin" />} Import {parsed?.rows.length ? parsed.rows.length : ''} words
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
