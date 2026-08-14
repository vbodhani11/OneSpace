import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const describedBy = [props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-white/70 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            {icon}
          </div>
        )}
        <input
          {...props}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'input-field',
            icon && 'pl-10',
            error && 'border-red-500/60 focus:border-red-500/80',
            className
          )}
        />
      </div>
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const generatedId = useId();
  const inputId = id || `textarea-${generatedId}`;
  const errorId = `${inputId}-error`;
  const describedBy = [props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-white/70 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        {...props}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'input-field resize-none',
          error && 'border-red-500/60 focus:border-red-500/80',
          className
        )}
      />
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const generatedId = useId();
  const inputId = id || `select-${generatedId}`;
  const errorId = `${inputId}-error`;
  const describedBy = [props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-white/70 mb-1.5">
          {label}
        </label>
      )}
      <select
        {...props}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'input-field appearance-none cursor-pointer',
          error && 'border-red-500/60',
          className
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-space-800 text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
