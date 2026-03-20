'use client';

import type { QuestionDefinition } from '@life-design/core';
import ScaleQuestion from './question-types/scale-question';
import SingleSelect from './question-types/single-select';
import MultiSelect from './question-types/multi-select';

interface QuestionRendererProps {
  question: QuestionDefinition;
  value: string | string[] | number | null;
  onChange: (value: string | string[] | number) => void;
}

export default function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  switch (question.type) {
    case 'scale':
      return (
        <ScaleQuestion
          min={question.scaleMin ?? 1}
          max={question.scaleMax ?? 10}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
        />
      );
    case 'single_select':
      return (
        <SingleSelect
          options={question.options ?? []}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
        />
      );
    case 'multi_select':
      return (
        <MultiSelect
          options={question.options ?? []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          maxSelections={question.maxSelections ?? 2}
        />
      );
    default:
      return null;
  }
}
