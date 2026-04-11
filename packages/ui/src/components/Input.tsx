import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

const fieldBase = 'w-full rounded-[8px] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-500 transition-all duration-150 focus:border-sage-500 focus:ring-[3px] focus:ring-sage-500/15 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
const fieldError = 'border-destructive focus:border-destructive focus:ring-destructive/15';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { error?: boolean; }
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, error && fieldError, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { error?: boolean; }
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'min-h-[80px] resize-y', error && fieldError, className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { error?: boolean; }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, 'cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg width=\'12\' height=\'8\' viewBox=\'0 0 12 8\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1.5L6 6.5L11 1.5\' stroke=\'%236B6459\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10', error && fieldError, className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export interface FormFieldProps { label: string; error?: string; helper?: string; children: ReactNode; }
export function FormField({ label, error, helper, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold text-stone-700">{label}</label>
      {children}
      {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
      {helper && !error && <p className="text-[11px] text-stone-500">{helper}</p>}
    </div>
  );
}
