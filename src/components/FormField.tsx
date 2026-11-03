import { forwardRef, useId, useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps extends ComponentProps<'input'> {
  label: string;
  error?: string;
  hint?: string;
}

/** Label + input + error/hint, wired up for screen readers. Works with react-hook-form's register(). */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, type, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
    const [reveal, setReveal] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>{label}</Label>
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            type={isPassword && reveal ? 'text' : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={isPassword ? 'pr-10' : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={reveal ? 'Hide password' : 'Show password'}
            >
              {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
FormField.displayName = 'FormField';
