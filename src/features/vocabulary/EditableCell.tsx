import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;
  onSave: (value: string) => void;
  placeholder?: string;
  label: string;
  maxLength?: number;
  className?: string;
  lang?: string;
  /** Options turn the cell into a select. */
  options?: { value: string; label: string }[];
  render?: (value: string | null) => React.ReactNode;
}

/** Spreadsheet-style cell: click (or Enter) to edit, Enter/blur saves, Esc cancels. */
export function EditableCell({ value, onSave, placeholder = '—', label, maxLength = 500, className, lang, options, render }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== (value ?? '')) onSave(draft.trim());
  };

  if (editing) {
    const common = {
      ref: inputRef,
      'aria-label': label,
      className: 'w-full rounded border border-primary bg-background px-1.5 py-1 text-sm focus:outline-none',
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          setDraft(value ?? '');
          setEditing(false);
        }
      },
    };
    return options ? (
      <select {...common} value={draft} onChange={(e) => setDraft(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ) : (
      <input {...common} lang={lang} value={draft} maxLength={maxLength} onChange={(e) => setDraft(e.target.value)} />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? '');
        setEditing(true);
      }}
      lang={lang}
      title={`Edit ${label.toLowerCase()}`}
      className={cn('-mx-1 block w-full min-w-0 rounded px-1 py-0.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      {render ? render(value) : value || <span className="text-muted-foreground/50">{placeholder}</span>}
    </button>
  );
}
