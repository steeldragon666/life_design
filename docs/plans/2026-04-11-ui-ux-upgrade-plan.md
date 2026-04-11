# UI/UX Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Opt In's UI/UX with a complete component library, motion system, accessibility foundations, icon migration, sound/haptics, and signature moments across all 30+ active component directories.

**Architecture:** Library-first approach — build `packages/ui` primitives with Storybook + interaction tests, then migrate all feature components into the package using smart/dumb split pattern. Token hygiene, accessibility, and motion polish applied globally.

**Tech Stack:** React 19, Tailwind CSS v4, CVA, Lucide React, Lottie React, Storybook 10, Vitest, Web Audio API

**Spec:** `docs/superpowers/specs/2026-04-11-ui-ux-upgrade-design.md`

---

## Phase 1: Foundation (2 weeks)

### Task 1: Add CVA + Lucide dependencies

**Files:**
- Modify: `packages/ui/package.json`

**Step 1: Install new dependencies**

Run:
```bash
cd packages/ui && pnpm add class-variance-authority lucide-react lottie-react
```

**Step 2: Verify install**

Run: `pnpm ls class-variance-authority lucide-react lottie-react`
Expected: All three listed with versions

**Step 3: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): add CVA, Lucide, and Lottie dependencies"
```

---

### Task 2: Add new design tokens to globals.css

**Files:**
- Modify: `apps/web/src/app/globals.css`

**Step 1: Add new tokens to `@theme` block**

Add after the `--color-interactive-hover` line:

```css
--color-interactive-active: #3D5A3D;
--color-focus-ring: #9BB89B;
```

**Step 2: Add `prefers-reduced-motion` media query**

Add after the `noise-bg::before` block at the end of the file:

```css
/* Accessibility: reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 3: Add hover-lift and press-depth utilities**

Add after the `glass-dark` utility:

```css
@utility hover-lift {
  transition: transform 300ms ease-out, box-shadow 300ms ease-out;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
  }
}

@utility press-depth {
  &:active {
    transform: scale(0.98);
    transition: transform 100ms ease-out;
  }
}
```

**Step 4: Add focus-visible base style**

Add to the `@layer base` block after the `h1, h2, h3, h4` rule:

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-surface-page), 0 0 0 4px var(--color-focus-ring);
  border-radius: var(--radius-sm);
}
```

**Step 5: Fix scrollbar thumb**

Replace:
```css
::-webkit-scrollbar-thumb { background: #D4CFC5; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #A8A198; }
```
With:
```css
::-webkit-scrollbar-thumb { background: var(--color-stone-300); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-stone-400); }
```

**Step 6: Tighten stagger delays and expand**

Replace:
```css
.stagger-1 { animation-delay: 0.1s; opacity: 0; }
.stagger-2 { animation-delay: 0.2s; opacity: 0; }
.stagger-3 { animation-delay: 0.3s; opacity: 0; }
.stagger-4 { animation-delay: 0.4s; opacity: 0; }
.stagger-5 { animation-delay: 0.5s; opacity: 0; }
```
With:
```css
.stagger-1 { animation-delay: 0.06s; opacity: 0; }
.stagger-2 { animation-delay: 0.12s; opacity: 0; }
.stagger-3 { animation-delay: 0.18s; opacity: 0; }
.stagger-4 { animation-delay: 0.24s; opacity: 0; }
.stagger-5 { animation-delay: 0.30s; opacity: 0; }
.stagger-6 { animation-delay: 0.36s; opacity: 0; }
.stagger-7 { animation-delay: 0.42s; opacity: 0; }
.stagger-8 { animation-delay: 0.48s; opacity: 0; }
.stagger-9 { animation-delay: 0.54s; opacity: 0; }
.stagger-10 { animation-delay: 0.60s; opacity: 0; }
```

**Step 7: Rename glass-dark to glass-opaque**

Replace `@utility glass-dark` with `@utility glass-opaque` (same content).

**Step 8: Verify the app still builds**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

**Step 9: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(tokens): add motion utilities, a11y tokens, tighter staggers"
```

---

### Task 3: Migrate Button to CVA

**Files:**
- Modify: `packages/ui/src/components/Button.tsx`
- Modify: `packages/ui/src/components/Button.test.tsx`
- Modify: `packages/ui/src/stories/Button.stories.tsx`

**Step 1: Read existing Button test**

Read `packages/ui/src/components/Button.test.tsx` to understand current test coverage.

**Step 2: Add tests for cursor-pointer and focus-visible**

Add to the existing test file:

```tsx
it('has cursor-pointer class', () => {
  render(<Button>Click</Button>);
  expect(screen.getByRole('button')).toHaveClass('cursor-pointer');
});

it('has focus-visible ring classes', () => {
  render(<Button>Click</Button>);
  const btn = screen.getByRole('button');
  expect(btn.className).toContain('focus-visible:ring');
});

it('has aria-disabled when disabled', () => {
  render(<Button disabled>Click</Button>);
  expect(screen.getByRole('button')).toBeDisabled();
});
```

**Step 3: Run tests to verify new ones fail**

Run: `cd packages/ui && pnpm test -- Button`
Expected: New tests fail (cursor-pointer not present yet)

**Step 4: Rewrite Button with CVA**

Replace `packages/ui/src/components/Button.tsx` with:

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold rounded-[8px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-sage-600 text-white shadow-[0_2px_8px_rgba(90,127,90,0.3)] hover:bg-sage-600/90 focus-visible:ring-sage-500/15 active:scale-[0.98]',
        secondary: 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200/60 focus-visible:ring-sage-500/15 active:scale-[0.98]',
        ghost: 'bg-transparent text-sage-500 hover:bg-sage-50 focus-visible:ring-sage-500/15',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/15 active:scale-[0.98]',
      },
      size: {
        sm: 'px-3.5 py-1.5 text-xs',
        default: 'px-5 py-2.5 text-[13px]',
        lg: 'px-7 py-3 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'default' | 'lg';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { buttonVariants };
```

**Step 5: Run tests to verify they pass**

Run: `cd packages/ui && pnpm test -- Button`
Expected: All tests pass

**Step 6: Update Button stories with interaction tests**

Read current `packages/ui/src/stories/Button.stories.tsx`, then add play functions:

```tsx
import { expect, within, userEvent } from '@storybook/test';

// Add to Primary story:
Primary.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const button = canvas.getByRole('button');
  await expect(button).toHaveClass('cursor-pointer');
  await userEvent.click(button);
  await expect(button).toBeVisible();
};
```

**Step 7: Commit**

```bash
git add packages/ui/src/components/Button.tsx packages/ui/src/components/Button.test.tsx packages/ui/src/stories/Button.stories.tsx
git commit -m "refactor(ui): migrate Button to CVA, add cursor-pointer + active:scale"
```

---

### Task 4: Migrate Card to CVA

**Files:**
- Modify: `packages/ui/src/components/Card.tsx`
- Modify: `packages/ui/src/components/Card.test.tsx`
- Modify: `packages/ui/src/stories/Card.stories.tsx`

**Step 1: Read existing Card test and story**

Read `packages/ui/src/components/Card.test.tsx` and `packages/ui/src/stories/Card.stories.tsx`.

**Step 2: Add tests for hover-lift behavior**

```tsx
it('includes hover-lift classes when hoverable', () => {
  render(<Card hoverable>Content</Card>);
  const card = screen.getByText('Content').closest('div');
  expect(card?.className).toContain('hover:');
});
```

**Step 3: Rewrite Card with CVA**

Migrate the `variantStyles` record to a `cva` call. Replace `hover:scale-[1.01]` with `hover-lift` utility class. Keep the dimension style logic with inline `style` prop (dimension colors come from JS tokens, not Tailwind classes).

Add `cursor-pointer` when `hoverable` is true.

**Step 4: Run tests**

Run: `cd packages/ui && pnpm test -- Card`
Expected: All pass

**Step 5: Update Card stories with interaction tests**

Add play function testing hover state classes exist.

**Step 6: Commit**

```bash
git add packages/ui/src/components/Card.tsx packages/ui/src/components/Card.test.tsx packages/ui/src/stories/Card.stories.tsx
git commit -m "refactor(ui): migrate Card to CVA, replace scale with hover-lift"
```

---

### Task 5: Migrate Badge, Input, Skeleton to CVA

**Files:**
- Modify: `packages/ui/src/components/Badge.tsx` + test + story
- Modify: `packages/ui/src/components/Input.tsx` + test + story
- Modify: `packages/ui/src/components/Skeleton.tsx` + test + story

Same pattern as Tasks 3-4 for each component:
1. Read existing tests
2. Add tests for `cursor-pointer` (where applicable), focus-visible, aria attributes
3. Migrate to CVA
4. Run tests, verify pass
5. Update stories with play functions
6. Commit each component separately

**For Input specifically:** Replace hardcoded `border-[#CC3333]` and `text-[#CC3333]` with `border-destructive` and `text-destructive` tokens. Replace `focus:ring-[#CC3333]/15` with `focus:ring-destructive/15`.

**Step: Commit all**

```bash
git commit -m "refactor(ui): migrate Badge, Input, Skeleton to CVA with a11y improvements"
```

---

### Task 6: Migrate Toast, Modal, Tooltip to CVA

**Files:**
- Modify: `packages/ui/src/components/Toast.tsx` + test + story
- Modify: `packages/ui/src/components/Modal.tsx` + test + story
- Modify: `packages/ui/src/components/Tooltip.tsx` + test + story

Same CVA migration pattern. For Toast:
- Add `aria-live="assertive"` for error toasts, `aria-live="polite"` for info/success
- Add `role="alert"` for error variant

For Modal:
- Ensure `aria-modal="true"` and `role="dialog"`
- Add focus trap test (Tab stays within modal)

**Step: Commit**

```bash
git commit -m "refactor(ui): migrate Toast, Modal, Tooltip to CVA with ARIA live regions"
```

---

### Task 7: Build Slider primitive

**Files:**
- Create: `packages/ui/src/components/Slider.tsx`
- Create: `packages/ui/src/components/Slider.test.tsx`
- Create: `packages/ui/src/stories/Slider.stories.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Step 1: Write failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders with default value', () => {
    render(<Slider min={1} max={10} value={5} onChange={() => {}} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '5');
  });

  it('renders labels when provided', () => {
    render(<Slider min={1} max={5} value={3} labels={['Low', '', '', '', 'High']} onChange={() => {}} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('calls onChange on input', () => {
    const onChange = vi.fn();
    render(<Slider min={1} max={10} value={5} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('has cursor-pointer', () => {
    render(<Slider min={1} max={10} value={5} onChange={() => {}} />);
    expect(screen.getByRole('slider')).toHaveClass('cursor-pointer');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/ui && pnpm test -- Slider`
Expected: FAIL — module not found

**Step 3: Implement Slider**

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  min: number;
  max: number;
  value: number;
  step?: number;
  labels?: string[];
  onChange: (value: number) => void;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ min, max, value, step = 1, labels, onChange, className, ...props }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            ref={ref}
            type="range"
            role="slider"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            onChange={(e) => onChange(Number(e.target.value))}
            className={cn(
              'w-full h-2 rounded-full appearance-none cursor-pointer',
              'bg-stone-200 accent-sage-500',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sage-500/15',
              className,
            )}
            style={{
              background: `linear-gradient(to right, var(--color-sage-500) 0%, var(--color-sage-500) ${percentage}%, var(--color-stone-200) ${percentage}%, var(--color-stone-200) 100%)`,
            }}
            {...props}
          />
        </div>
        {labels && labels.length > 0 && (
          <div className="flex justify-between">
            {labels.map((label, i) => (
              <span key={i} className="text-xs text-stone-500">{label}</span>
            ))}
          </div>
        )}
      </div>
    );
  },
);

Slider.displayName = 'Slider';
```

**Step 4: Run tests**

Run: `cd packages/ui && pnpm test -- Slider`
Expected: All pass

**Step 5: Add to component index**

Add to `packages/ui/src/components/index.ts`:
```tsx
export { Slider } from './Slider';
export type { SliderProps } from './Slider';
```

**Step 6: Write Slider story with play function**

Create `packages/ui/src/stories/Slider.stories.tsx` with Default, WithLabels, and Likert variants. Add play function testing keyboard interaction (Arrow keys change value).

**Step 7: Commit**

```bash
git add packages/ui/src/components/Slider.tsx packages/ui/src/components/Slider.test.tsx packages/ui/src/stories/Slider.stories.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Slider primitive with labels and a11y"
```

---

### Task 8: Build Avatar primitive

**Files:**
- Create: `packages/ui/src/components/Avatar.tsx`
- Create: `packages/ui/src/components/Avatar.test.tsx`
- Create: `packages/ui/src/stories/Avatar.stories.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Step 1: Write failing test**

```tsx
describe('Avatar', () => {
  it('renders image when src provided', () => {
    render(<Avatar src="/test.jpg" alt="Test User" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Test User');
  });

  it('renders initials fallback when no src', () => {
    render(<Avatar alt="Aaron Smith" />);
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('renders status ring when status provided', () => {
    const { container } = render(<Avatar alt="Test" status="online" />);
    expect(container.querySelector('[data-status]')).toBeInTheDocument();
  });

  it('applies size variants', () => {
    render(<Avatar alt="Test" size="lg" />);
    // lg = 48px
    const avatar = screen.getByText('T').closest('div');
    expect(avatar?.className).toContain('w-12');
  });
});
```

**Step 2: Implement Avatar with CVA**

Variants: `size` (sm/md/lg/xl), optional `status` ring (online/offline/busy), optional `dimension` color ring. Falls back to initials extracted from `alt` text when no `src`.

**Step 3: Run tests, write story, commit**

```bash
git commit -m "feat(ui): add Avatar primitive with status ring and initials fallback"
```

---

### Task 9: Build Separator primitive

**Files:**
- Create: `packages/ui/src/components/Separator.tsx`
- Create: `packages/ui/src/components/Separator.test.tsx`
- Create: `packages/ui/src/stories/Separator.stories.tsx`
- Modify: `packages/ui/src/components/index.ts`

Simple component — horizontal/vertical divider using `<hr>` or `<div role="separator">`. CVA variants for `orientation` (horizontal/vertical) and `decorative` (adds `aria-hidden`).

**Step 1: TDD cycle** — test → fail → implement → pass
**Step 2: Story with play function**
**Step 3: Commit**

```bash
git commit -m "feat(ui): add Separator primitive"
```

---

### Task 10: Build Icon wrapper and dimension icons

**Files:**
- Create: `packages/ui/src/components/Icon.tsx`
- Create: `packages/ui/src/components/Icon.test.tsx`
- Create: `packages/ui/src/stories/Icon.stories.tsx`
- Create: `packages/ui/src/components/icons/dimensions/index.ts`
- Create: `packages/ui/src/components/icons/dimensions/career-icon.tsx` (+ 7 more)
- Modify: `packages/ui/src/components/index.ts`

**Step 1: Write Icon wrapper test**

```tsx
import { render } from '@testing-library/react';
import { Icon } from './Icon';
import { ChevronLeft } from 'lucide-react';

describe('Icon', () => {
  it('renders lucide icon at default size', () => {
    const { container } = render(<Icon icon={ChevronLeft} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
  });

  it('renders at sm size', () => {
    const { container } = render(<Icon icon={ChevronLeft} size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
  });

  it('applies shrink-0', () => {
    const { container } = render(<Icon icon={ChevronLeft} />);
    const svg = container.querySelector('svg');
    expect(svg?.className).toContain('shrink-0');
  });
});
```

**Step 2: Implement Icon wrapper** (as specified in design spec section 7)

**Step 3: Build 8 dimension icon components**

Each takes `size` (sm/md/lg) and `className`. Uses the dimension color tokens. Simple SVG icons representing each dimension (briefcase for career, heart for health, etc.). Export all from `icons/dimensions/index.ts`.

**Step 4: Run tests, write stories, commit**

```bash
git commit -m "feat(ui): add Icon wrapper + 8 dimension icon components"
```

---

### Task 11: Build hooks — useScrollReveal, useSound, useHaptics

**Files:**
- Create: `packages/ui/src/hooks/use-scroll-reveal.ts`
- Create: `packages/ui/src/hooks/use-scroll-reveal.test.ts`
- Create: `packages/ui/src/hooks/use-sound.ts`
- Create: `packages/ui/src/hooks/use-sound.test.ts`
- Create: `packages/ui/src/hooks/use-haptics.ts`
- Create: `packages/ui/src/hooks/use-haptics.test.ts`
- Create: `packages/ui/src/hooks/index.ts`
- Modify: `packages/ui/src/index.ts`

**Step 1: useScrollReveal**

```tsx
// Returns a ref to attach to the element. When it enters the viewport,
// adds 'animate-fade-up' class. Uses IntersectionObserver.
import { useRef, useEffect, useState } from 'react';

export function useScrollReveal<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); } },
      { threshold: 0.1, ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

Test: mock IntersectionObserver, verify `isVisible` toggles.

**Step 2: useSound**

```tsx
// Lazy-loads audio files via Web Audio API. Respects muted preference.
export function useSound() {
  const play = useCallback((src: string, volume = 0.5) => {
    // Check localStorage for 'opt-in-sound-enabled'
    // If enabled, create Audio element, set volume, play
    // Catch and swallow errors (progressive enhancement)
  }, []);
  return { play };
}
```

Test: mock Audio constructor, verify `play()` calls it with correct src.

**Step 3: useHaptics**

```tsx
// Wraps navigator.vibrate with progressive enhancement.
export function useHaptics() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);
  return { vibrate };
}
```

Test: mock navigator.vibrate, verify pattern passed through.

**Step 4: Export from hooks/index.ts and add to main index.ts**

**Step 5: Commit**

```bash
git commit -m "feat(ui): add useScrollReveal, useSound, useHaptics hooks"
```

---

### Task 12: Token hygiene — fix hardcoded hex values

**Files:**
- Modify: 33 files across `apps/web/src/` (167 occurrences)

**Reference:** The following files contain hardcoded hex values:

| File | Count | Priority |
|------|-------|----------|
| `components/loading/loading-screen.tsx` | 12 | Medium — themed loading screens |
| `app/(protected)/dimensions/[dimension]/dimension-detail-client.tsx` | 23 | High — dimension detail page |
| `components/dashboard/life-orb.tsx` | 14 | High — core dashboard element |
| `app/(protected)/correlations/correlations-client.tsx` | 9 | Medium |
| `components/challenges/ChallengeLibrary.tsx` | 12 | Medium |
| `components/checkin/explainability-tooltip.tsx` | 7 | Medium |
| `components/checkin/ghost-slider.tsx` | 7 | Medium |
| `components/goals/scenario-comparison.tsx` | 7 | Medium |
| `components/goals/dimension-impact-chart.tsx` | 6 | Medium |
| All others | ~70 | Low — 1-5 occurrences each |

**Approach:**

For each file:
1. Read the file
2. Identify each hardcoded hex
3. Map to nearest design token:
   - `#CC3333` → `destructive` token (already defined)
   - `#6B6459` → `stone-500`
   - `#5A7F5A` → `sage-500`
   - `#D4864A` → `warm-400`
   - `#5E9BC4` → `accent-500`
   - Chart/SVG colors that need literal hex → use `dimensionPalettes` JS tokens
   - Themed loading screen colors → these are intentionally unique per theme, leave as-is but add comment
4. Replace with token class or variable reference
5. Verify the file still renders correctly

**Step 1: Fix high-priority files first**

Start with `dimension-detail-client.tsx` (23 occurrences) and `life-orb.tsx` (14 occurrences). These are core user-facing pages.

**Step 2: Fix medium-priority files**

Work through the remaining ~10 files.

**Step 3: Skip themed loading-screen.tsx**

The loading screen uses intentionally unique theme colors (botanical pink, ocean teal, modern gold). These are NOT part of the design token system — they are decorative theme-specific values. Add a comment:
```tsx
// These colors are intentional per-theme decorative values, not design tokens.
```

**Step 4: Add cursor-pointer to all interactive elements**

Search for `onClick` handlers on `<div>`, `<span>`, and other non-button elements. Add `cursor-pointer` and `role="button"` where appropriate.

Run:
```bash
cd apps/web && pnpm build
```
Expected: Build succeeds

**Step 5: Commit**

```bash
git commit -m "fix(tokens): replace 150+ hardcoded hex values with design tokens"
```

---

## Phase 2: Polish + Accessibility (1 week)

### Task 13: Add skip-to-content link

**Files:**
- Modify: `apps/web/src/app/layout.tsx` (or the layout that wraps protected routes)

**Step 1: Add skip link as first child of `<body>`**

```tsx
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sage-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
>
  Skip to content
</a>
```

**Step 2: Add `id="main"` to the main content area**

Find the `<main>` element in the layout and add `id="main"`.

**Step 3: Test manually** — Tab on page load should show skip link, Enter should jump to content.

**Step 4: Commit**

```bash
git commit -m "feat(a11y): add skip-to-content link"
```

---

### Task 14: ARIA live regions

**Files:**
- Modify: `packages/ui/src/components/Toast.tsx` — add `aria-live="assertive"` for error, `aria-live="polite"` for others
- Modify: Mentor chat message container — add `aria-live="polite"`
- Modify: Onboarding wizard progress bar — add `aria-live="polite"` with `aria-label` describing progress

**Step 1: Update Toast with aria-live**

Read current Toast implementation. Add `aria-live` based on variant (error = assertive, others = polite). Add `role="alert"` for error variant.

**Step 2: Update mentor chat container**

Find the chat message list component. Add `aria-live="polite"` to the scrollable container so screen readers announce new messages.

**Step 3: Update progress bar**

Add to the onboarding progress bar:
```tsx
<div
  role="progressbar"
  aria-valuenow={currentStep}
  aria-valuemin={0}
  aria-valuemax={totalSteps}
  aria-label={`Step ${currentStep} of ${totalSteps}`}
>
```

**Step 4: Commit**

```bash
git commit -m "feat(a11y): add ARIA live regions to Toast, chat, progress"
```

---

### Task 15: Audit and fix heading hierarchy + form labels

**Files:**
- Multiple page components across `apps/web/src/app/`

**Step 1: Search for heading usage**

```bash
grep -rn '<h[1-6]' apps/web/src/ --include='*.tsx' | head -50
```

**Step 2: For each page, verify hierarchy**

- Each page has exactly one `h1`
- `h2` follows `h1`, `h3` follows `h2` — no skips
- Fix any violations

**Step 3: Audit form inputs**

Search for `<input` and `<textarea` without associated `<label>`. Add `<label>` or `aria-label` where missing.

**Step 4: Commit**

```bash
git commit -m "fix(a11y): fix heading hierarchy and add missing form labels"
```

---

### Task 16: Icon migration — replace inline SVGs with Lucide

**Files:**
- Multiple component files across `apps/web/src/components/`

**Step 1: Find all inline SVGs**

```bash
grep -rn '<svg' apps/web/src/ --include='*.tsx' -l
```

**Step 2: For each file, identify the icon**

Map each inline SVG to its Lucide equivalent:
- Chevron left → `ChevronLeft`
- Chevron right → `ChevronRight`
- Check mark → `Check`
- X/close → `X`
- Arrow right → `ArrowRight`
- Plus → `Plus`
- Search/magnifying glass → `Search`
- Settings/gear → `Settings`

**Step 3: Replace inline SVGs with Lucide imports**

```tsx
// Before:
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <polyline points="15 18 9 12 15 6" />
</svg>

// After:
import { ChevronLeft } from 'lucide-react';
<ChevronLeft size={20} />
```

**Step 4: Remove any Phosphor Icons imports**

The current `packages/ui/package.json` has `@phosphor-icons/react`. After all icons are migrated to Lucide, remove this dependency.

Run: `cd packages/ui && pnpm remove @phosphor-icons/react`

**Step 5: Verify build**

Run: `cd apps/web && pnpm build`

**Step 6: Commit**

```bash
git commit -m "refactor(icons): migrate all inline SVGs and Phosphor to Lucide React"
```

---

### Task 17: Configure Storybook a11y addon

**Files:**
- Modify: `packages/ui/.storybook/preview.ts`

**Step 1: Read current preview.ts**

**Step 2: Add a11y addon configuration**

```tsx
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    a11y: {
      // axe-core configuration
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: true },
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
};

export default preview;
```

**Step 3: Run Storybook and verify a11y panel shows**

Run: `cd packages/ui && pnpm storybook`
Expected: A11y tab visible in Storybook panel, violations highlighted

**Step 4: Commit**

```bash
git commit -m "feat(storybook): configure a11y addon with axe-core rules"
```

---

## Phase 3: Component Migration (3 weeks)

### Task 18: Build layout components — PageShell, Section, Stack, Container

**Files:**
- Create: `packages/ui/src/components/PageShell.tsx` + test + story
- Create: `packages/ui/src/components/Section.tsx` + test + story
- Create: `packages/ui/src/components/Stack.tsx` + test + story
- Create: `packages/ui/src/components/Container.tsx` + test + story
- Modify: `packages/ui/src/components/index.ts`

**PageShell:** Renders skip-to-content link, `<header>` with nav slot, `<main id="main">` with content, optional `<footer>`. CVA variants for `layout` (centered/sidebar).

**Section:** Content block with optional `heading` (renders as `h2` by default, configurable with `as` prop), `subtitle`, and bottom margin.

**Stack:** Flexbox wrapper. CVA variants for `direction` (horizontal/vertical), `gap` (sm/md/lg/xl), `align`, `justify`. Replaces common `<div className="flex flex-col gap-4">` patterns.

**Container:** Max-width centered wrapper. CVA variants for `size` (sm: max-w-lg, md: max-w-4xl, lg: max-w-6xl, full: max-w-full). Adds horizontal padding.

TDD cycle for each: test → fail → implement → pass → story → commit.

```bash
git commit -m "feat(ui): add PageShell, Section, Stack, Container layout components"
```

---

### Task 19: Build feedback components — ProgressBar, EmptyState, ErrorBoundary

**Files:**
- Create: `packages/ui/src/components/ProgressBar.tsx` + test + story (linear + circular)
- Create: `packages/ui/src/components/EmptyState.tsx` + test + story
- Create: `packages/ui/src/components/ErrorBoundary.tsx` + test + story
- Modify: `packages/ui/src/components/index.ts`

**ProgressBar:** CVA variants for `variant` (linear/circular), `size` (sm/md/lg). Linear uses the existing progress bar gradient. Circular wraps the existing `ProgressRing` data-viz component. Both include `role="progressbar"` with ARIA attributes.

**EmptyState:** Centered layout with optional Lottie illustration, heading, description, and action button slot. For use when lists/feeds have no data.

**ErrorBoundary:** React error boundary with fallback UI. Shows "Something went wrong" with retry button. Logs errors to console.

```bash
git commit -m "feat(ui): add ProgressBar, EmptyState, ErrorBoundary feedback components"
```

---

### Task 20: Build data display components — StatCard, DimensionCard

**Files:**
- Create: `packages/ui/src/components/StatCard.tsx` + test + story
- Modify: `packages/ui/src/design-system/StatCard.tsx` → migrate to new component or deprecate
- Create: `packages/ui/src/components/DimensionCard.tsx` + test + story
- Modify: `packages/ui/src/components/index.ts`

**StatCard:** Displays a metric with label, value, optional trend indicator (up/down/flat), and optional sparkline. Uses Card as base. The existing `design-system/StatCard.tsx` should be deprecated in favor of this.

**DimensionCard:** Displays a life dimension score. Takes `dimension` name, score (0-10), trend, and optional onClick. Uses Card with dimension variant. Includes hover-lift, dimension icon, and score as ProgressRing.

TDD cycle for each. Commit separately.

```bash
git commit -m "feat(ui): add StatCard and DimensionCard data display components"
```

---

### Task 21: Build onboarding components — WizardShell, QuestionCard, info cards

**Files:**
- Create: `packages/ui/src/onboarding/WizardShell.tsx` + story
- Create: `packages/ui/src/onboarding/QuestionCard.tsx` + story
- Create: `packages/ui/src/onboarding/WelcomeCard.tsx` + story
- Create: `packages/ui/src/onboarding/ExpectationsCard.tsx` + story
- Create: `packages/ui/src/onboarding/DataImportCard.tsx` + story
- Create: `packages/ui/src/onboarding/CheckinIntroCard.tsx` + story
- Create: `packages/ui/src/onboarding/StreaksCard.tsx` + story
- Create: `packages/ui/src/onboarding/ConnectAppsCard.tsx` + story
- Create: `packages/ui/src/onboarding/DashboardTourCard.tsx` + story
- Create: `packages/ui/src/onboarding/AiMentorCard.tsx` + story
- Create: `packages/ui/src/onboarding/ProfileSummary.tsx` + `.connected.tsx` + story
- Create: `packages/ui/src/onboarding/index.ts`

**WizardShell (dumb):** Props: `children`, `progress` (0-100), `onBack`, `canGoBack`, `sectionLabel`. Renders the sticky header with progress bar and back button, and a `<main>` for content. This is the shared layout extracted from `profiling-wizard.tsx`.

**WizardShell.connected.tsx:** Wires up the wizard state (section index, question index, answers, session management). Imports from `@/lib/supabase/client`, `@/lib/profiling/question-schema`, etc.

**QuestionCard (dumb):** Props: `question` (text), `children` (the input renderer), optional `helperText`. Just layout — heading + content area.

**Info cards (all dumb):** Each takes `onNext: () => void` and renders its specific content. These are direct ports of the existing cards in `apps/web/src/components/onboarding/cards/`, but now using `Button`, `Card`, `Icon` from the shared library instead of inline markup.

**ProfileSummary (dumb + connected):** Dumb takes `userName`, `summary`, `psychometric`, `onComplete`. Connected wires up the data.

**Step 1:** Build WizardShell first (test + story), then QuestionCard, then port each info card one at a time.

**Step 2:** For each existing card in `apps/web/src/components/onboarding/cards/`, read the current implementation, extract the UI into the dumb component, replace inline SVGs with Lucide icons, replace hardcoded colors with tokens.

**Step 3:** Update `apps/web/src/components/onboarding/profiling-wizard.tsx` to import `WizardShell` from `@life-design/ui`.

**Step 4:** Update `apps/web/src/components/onboarding/onboarding-flow.tsx` to import info cards from `@life-design/ui`.

**Step 5: Commit**

```bash
git commit -m "feat(ui): add onboarding components — WizardShell, QuestionCard, 8 info cards, ProfileSummary"
```

---

### Task 22: Build dashboard components — DashboardShell, DimensionGrid, DailyPulse, InsightFeed

**Files:**
- Create: `packages/ui/src/dashboard/DashboardShell.tsx` + `.connected.tsx` + story
- Create: `packages/ui/src/dashboard/DimensionGrid.tsx` + `.connected.tsx` + story
- Create: `packages/ui/src/dashboard/DailyPulse.tsx` + `.connected.tsx` + story
- Create: `packages/ui/src/dashboard/InsightFeed.tsx` + `.connected.tsx` + story
- Create: `packages/ui/src/dashboard/index.ts`

**DashboardShell (dumb):** Props: `nav` (NavBar slot), `sidebar` (optional), `children`. Renders the dashboard layout with responsive sidebar behavior (collapses to bottom nav on mobile).

**DimensionGrid (dumb):** Props: `dimensions` array of `{ name, score, trend, onClick }`. Renders 8 DimensionCards in a responsive grid (2 cols mobile, 4 cols desktop). Uses `useScrollReveal` for entry animation.

**DailyPulse (dumb):** Props: `hasCheckedIn`, `currentStreak`, `onStartCheckin`. Renders the daily check-in prompt card with Life Orb breathing animation.

**InsightFeed (dumb):** Props: `insights` array of `{ id, title, body, dimension, timestamp }`. Renders insight cards in a feed with `fadeUp` + stagger. Uses `useScrollReveal`.

Connected wrappers fetch from Supabase / API routes.

Port each from existing `apps/web/src/components/dashboard/` implementations.

```bash
git commit -m "feat(ui): add dashboard components — Shell, DimensionGrid, DailyPulse, InsightFeed"
```

---

### Task 23: Build mentor components — MentorAvatar, ChatBubble, MentorPanel

**Files:**
- Create: `packages/ui/src/mentor/MentorAvatar.tsx` + story
- Create: `packages/ui/src/mentor/ChatBubble.tsx` + story
- Create: `packages/ui/src/mentor/MentorPanel.tsx` + `.connected.tsx` + story
- Create: `packages/ui/src/mentor/index.ts`

**MentorAvatar (dumb):** Props: `src`, `name`, `status` (idle/speaking/thinking), `dimension` (for color ring). Uses Avatar as base, adds `animate-mentor-speaking` or `animate-mentor-breathing` based on status.

**ChatBubble (dumb):** Props: `message`, `sender` (user/mentor), `timestamp`, `isTyping`. Mentor messages align left with sage accent. User messages align right with stone background. Typing indicator shows animated dots.

**MentorPanel (dumb):** Props: `mentor`, `messages`, `onSend`, `isLoading`. Full chat interface — header with mentor info, scrollable message list with `aria-live="polite"`, and input bar at bottom.

**MentorPanel.connected.tsx:** Wires up to mentor API, manages message state, handles streaming responses.

```bash
git commit -m "feat(ui): add mentor components — Avatar, ChatBubble, MentorPanel"
```

---

### Task 24: Build shared components — NavBar, BottomNav

**Files:**
- Create: `packages/ui/src/shared/NavBar.tsx` + `.connected.tsx` + story
- Create: `packages/ui/src/shared/BottomNav.tsx` + `.connected.tsx` + story
- Create: `packages/ui/src/shared/index.ts`

**NavBar (dumb):** Props: `logo`, `links` array, `userAvatar`, `onSettingsClick`. Renders top navigation with glass background. Responsive — full on desktop, hamburger on mobile.

**BottomNav (dumb):** Props: `items` array of `{ icon, label, href, active }`. Mobile-only bottom tab bar. Uses Lucide icons. Active state uses sage-500 color.

Connected wrappers read auth state and current route.

```bash
git commit -m "feat(ui): add NavBar and BottomNav shared components"
```

---

### Task 25: Wire connected components + update app imports

**Files:**
- Modify: `apps/web/src/components/onboarding/profiling-wizard.tsx`
- Modify: `apps/web/src/components/onboarding/onboarding-flow.tsx`
- Modify: Multiple dashboard page components
- Modify: Multiple mentor page components

**Step 1:** For each page in `apps/web/src/app/`, replace direct component imports with `@life-design/ui` imports:

```tsx
// Before:
import WelcomeCard from './cards/welcome-card';

// After:
import { WelcomeCard } from '@life-design/ui/onboarding';
```

**Step 2:** For connected components, import the `.connected` variant:

```tsx
import { DimensionGridConnected as DimensionGrid } from '@life-design/ui/dashboard';
```

**Step 3:** Remove or deprecate the old component files in `apps/web/src/components/` that have been moved to `packages/ui`.

**Step 4: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git commit -m "refactor: migrate app imports to @life-design/ui components"
```

---

## Phase 4: Signature Moments (1 week)

### Task 26: Onboarding completion celebration

**Files:**
- Modify: `packages/ui/src/onboarding/ProfileSummary.tsx`
- Create: `packages/ui/src/components/Confetti.tsx`

**Step 1: Build Confetti component**

CSS-only confetti using pseudo-elements and `confettiFall` keyframe. Props: `colors` (array of hex — user's top 3 dimension colors), `particleCount` (default 30). Each particle gets a random color from the array, random horizontal position, random delay.

**Step 2: Add staggered reveal to ProfileSummary**

Profile summary cards get `animate-fade-up` with `stagger-1` through `stagger-4`. Wheel of Life gets a `stroke-dashoffset` animation that draws each spoke over 800ms with sequential delays.

**Step 3: Wire sound + haptics**

```tsx
const { play } = useSound();
const { vibrate } = useHaptics();

useEffect(() => {
  play('/audio/chime.webm', 0.3);
  vibrate([50, 30, 50]);
}, []);
```

**Step 4: Commit**

```bash
git commit -m "feat(ux): add onboarding completion celebration with confetti, sound, haptics"
```

---

### Task 27: Daily check-in ritual animations

**Files:**
- Modify: `packages/ui/src/dashboard/DailyPulse.tsx`
- Modify: `packages/ui/src/components/Slider.tsx`

**Step 1: Add breathing sync to DailyPulse**

Life Orb uses `animate-breathe` class. On submission, animate the streak counter with `animate-badge-reveal`.

**Step 2: Enhance Slider interaction**

Add CSS for thumb scale on `:active`:
```css
input[type="range"]:active::-webkit-slider-thumb {
  transform: scale(1.15);
}
```

Track fill uses sage gradient (already implemented in Task 7).

**Step 3: Wire sound + haptics on submission**

```tsx
play('/audio/tick.webm', 0.2);
vibrate([10]);
```

**Step 4: Commit**

```bash
git commit -m "feat(ux): add check-in ritual animations with sound and haptics"
```

---

### Task 28: Dashboard ambient life

**Files:**
- Modify: `packages/ui/src/dashboard/DimensionGrid.tsx`
- Modify: `packages/ui/src/dashboard/InsightFeed.tsx`
- Modify: `packages/ui/src/components/data-viz/Sparkline.tsx`

**Step 1: Add hover-lift to DimensionCards**

Already using `hover-lift` utility from Task 2. Verify it's applied in DimensionGrid.

**Step 2: Add scroll-reveal to InsightFeed**

```tsx
const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
return (
  <div ref={ref} className={cn('transition-all', isVisible ? 'animate-fade-up' : 'opacity-0')}>
    ...
  </div>
);
```

**Step 3: Add sparkline draw animation**

In Sparkline component, add initial `stroke-dashoffset` equal to path length, then transition to 0 on mount:

```tsx
useEffect(() => {
  if (pathRef.current) {
    const length = pathRef.current.getTotalLength();
    pathRef.current.style.strokeDasharray = `${length}`;
    pathRef.current.style.strokeDashoffset = `${length}`;
    requestAnimationFrame(() => {
      pathRef.current!.style.transition = 'stroke-dashoffset 800ms ease-out';
      pathRef.current!.style.strokeDashoffset = '0';
    });
  }
}, []);
```

**Step 4: Commit**

```bash
git commit -m "feat(ux): add dashboard ambient animations — hover-lift, scroll-reveal, sparkline draw"
```

---

### Task 29: Page transitions + loading skeletons

**Files:**
- Modify: `apps/web/src/app/layout.tsx` or relevant layout wrappers
- Create layout-specific skeleton components as needed

**Step 1: Consistent fadeUp on page mount**

Each page's top-level component should have `className="animate-fade-up"` on its wrapper div. Verify this is applied consistently across all route pages.

**Step 2: Build layout-matched skeletons**

For each major page (dashboard, check-in, mentor, settings), ensure the Skeleton components match the actual layout shapes. The existing `CardSkeleton`, `SparklineSkeleton`, and `ScheduleWidgetSkeleton` are good starts.

Add:
- `DimensionGridSkeleton` — 8 cards in grid layout
- `InsightFeedSkeleton` — 3 stacked card skeletons
- `MentorPanelSkeleton` — Chat layout skeleton

**Step 3: Commit**

```bash
git commit -m "feat(ux): add consistent page transitions and layout-matched loading skeletons"
```

---

### Task 30: Lottie integration

**Files:**
- Create: `packages/ui/src/components/LottieAnimation.tsx` + story
- Create or source: Lottie JSON files for key animations

**Step 1: Build LottieAnimation wrapper**

```tsx
'use client';
import Lottie from 'lottie-react';
import { cn } from '../utils/cn';

interface LottieAnimationProps {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export function LottieAnimation({ animationData, loop = true, autoplay = true, className }: LottieAnimationProps) {
  // Respect prefers-reduced-motion
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    return null; // or render static first frame
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={cn('w-full h-full', className)}
    />
  );
}
```

**Step 2: Source/create Lottie animations**

This is a creative task — Lottie JSON files need to be designed or sourced from LottieFiles.com. Key animations needed:
- Onboarding welcome illustration
- Achievement badge unlock
- Mentor thinking/processing

Place in `apps/web/public/lottie/`.

**Step 3: Integrate into relevant components**

Replace static illustrations in onboarding cards with Lottie animations where appropriate.

**Step 4: Commit**

```bash
git commit -m "feat(ux): add Lottie animation wrapper and initial animations"
```

---

### Task 31: Final QA pass

**Files:**
- All modified files

**Step 1: Run full test suite**

```bash
cd packages/ui && pnpm test
```
Expected: All tests pass

**Step 2: Run Storybook**

```bash
cd packages/ui && pnpm storybook
```

Verify:
- All stories render without errors
- A11y panel shows no violations
- Interaction tests (play functions) pass

**Step 3: Run app build**

```bash
cd apps/web && pnpm build
```
Expected: Build succeeds with no TypeScript errors

**Step 4: Run app dev and visually verify**

```bash
cd apps/web && pnpm dev
```

Walk through each flow:
- [ ] Onboarding wizard (all 8 cards + questions + summary)
- [ ] Dashboard (dimension grid, life orb, insights, sparklines)
- [ ] Check-in (slider, submission, streak)
- [ ] Mentor chat (avatar, bubbles, typing)
- [ ] Settings pages
- [ ] Loading states (skeletons)
- [ ] Responsive: test at 375px, 768px, 1024px, 1440px

**Step 5: Verify success criteria**

Design Gate:
- [ ] Zero hardcoded hex values (grep confirms)
- [ ] Instrument Serif on all headings, DM Sans on body
- [ ] All tokens via Tailwind classes

Production Gate:
- [ ] All components TypeScript with proper interfaces
- [ ] axe-core passes
- [ ] `prefers-reduced-motion` works (test in browser devtools)
- [ ] Lucide icons everywhere (no inline SVGs)
- [ ] Zero console errors

Experience Gate:
- [ ] Signature moments feel premium
- [ ] Motion is purposeful
- [ ] Sound is subtle (and muted by default)

**Step 6: Commit**

```bash
git commit -m "chore: final QA pass — all gates verified"
```

---

## Summary

| Phase | Tasks | Commits |
|-------|-------|---------|
| Phase 1: Foundation | Tasks 1-12 | ~12 commits |
| Phase 2: Polish + A11y | Tasks 13-17 | ~5 commits |
| Phase 3: Migration | Tasks 18-25 | ~8 commits |
| Phase 4: Signature | Tasks 26-31 | ~6 commits |
| **Total** | **31 tasks** | **~31 commits** |
