import { cn } from '../utils/cn';

export interface QuestionCardProps {
  question: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export function QuestionCard({ question, helperText, children, className }: QuestionCardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-2xl font-serif font-medium text-stone-800">{question}</h2>
        {helperText && <p className="text-sm text-stone-500 mt-2">{helperText}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}
