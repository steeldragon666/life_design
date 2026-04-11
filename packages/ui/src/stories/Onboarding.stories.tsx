import type { Meta, StoryObj } from '@storybook/react';
import { fn, expect, within } from '@storybook/test';
import { WizardShell } from '../onboarding/WizardShell';
import { QuestionCard } from '../onboarding/QuestionCard';

const meta: Meta<typeof WizardShell> = {
  title: 'Onboarding/WizardShell',
  component: WizardShell,
  parameters: { layout: 'fullscreen' },
  args: {
    progress: 33,
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WizardShell>;

export const Default: Story = {
  args: {
    progress: 33,
    sectionLabel: 'Personal Info',
    children: (
      <QuestionCard question="What is your name?" helperText="We'll use this to personalize your experience.">
        <input
          type="text"
          placeholder="Enter your name"
          className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sage-500"
        />
      </QuestionCard>
    ),
  },
};

export const WithBackButton: Story = {
  args: {
    progress: 66,
    canGoBack: true,
    sectionLabel: 'Lifestyle',
    children: (
      <QuestionCard question="How would you describe your sleep quality?">
        <div className="flex flex-col gap-3">
          {['Excellent', 'Good', 'Fair', 'Poor'].map((option) => (
            <button
              key={option}
              className="text-left px-4 py-3 rounded-lg border border-stone-200 hover:border-sage-400 hover:bg-sage-50 transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      </QuestionCard>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Go back')).toBeInTheDocument();
  },
};

export const NoBackButton: Story = {
  args: {
    progress: 5,
    canGoBack: false,
    sectionLabel: 'Getting Started',
    children: (
      <QuestionCard question="Welcome! Let's get to know you.">
        <p className="text-stone-600">This will only take a few minutes.</p>
      </QuestionCard>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText('Go back')).not.toBeInTheDocument();
  },
};

export const AlmostDone: Story = {
  args: {
    progress: 90,
    canGoBack: true,
    sectionLabel: 'Final Steps',
    children: (
      <QuestionCard question="Any final thoughts?" helperText="Optional — you can always update this later.">
        <textarea
          placeholder="Share anything else..."
          className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sage-500 min-h-[120px]"
        />
      </QuestionCard>
    ),
  },
};

// QuestionCard standalone stories
const questionMeta: Meta<typeof QuestionCard> = {
  title: 'Onboarding/QuestionCard',
  component: QuestionCard,
};

export const QuestionOnly: StoryObj<typeof QuestionCard> = {
  render: () => (
    <div className="max-w-2xl mx-auto p-8">
      <QuestionCard question="What matters most to you right now?">
        <div className="flex flex-wrap gap-2">
          {['Health', 'Career', 'Relationships', 'Finance', 'Growth'].map((tag) => (
            <button
              key={tag}
              className="px-4 py-2 rounded-full border border-stone-200 hover:border-sage-400 hover:bg-sage-50 transition-colors text-sm"
            >
              {tag}
            </button>
          ))}
        </div>
      </QuestionCard>
    </div>
  ),
};

export const QuestionWithHelper: StoryObj<typeof QuestionCard> = {
  render: () => (
    <div className="max-w-2xl mx-auto p-8">
      <QuestionCard
        question="How old are you?"
        helperText="This helps us tailor recommendations to your life stage."
      >
        <input
          type="number"
          placeholder="Age"
          className="w-32 px-4 py-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sage-500"
        />
      </QuestionCard>
    </div>
  ),
};
