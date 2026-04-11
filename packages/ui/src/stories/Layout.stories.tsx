import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { PageShell } from '../components/PageShell';
import { Section } from '../components/Section';
import { Stack } from '../components/Stack';
import { Container } from '../components/Container';

// ---------- PageShell ----------
const pageMeta: Meta<typeof PageShell> = {
  title: 'Layout/PageShell',
  component: PageShell,
  argTypes: {
    layout: { control: 'select', options: ['centered', 'sidebar'] },
  },
};
export default pageMeta;
type PageStory = StoryObj<typeof PageShell>;

export const DefaultPage: PageStory = {
  args: {
    header: <div className="p-4 bg-sage-100 w-full text-center">Header</div>,
    footer: <div className="p-4 bg-stone-100 w-full text-center">Footer</div>,
    children: <div className="p-8">Main content</div>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Skip to content')).toBeInTheDocument();
    await expect(canvas.getByRole('main')).toHaveAttribute('id', 'main');
  },
};

export const SidebarLayout: PageStory = {
  args: {
    layout: 'sidebar',
    header: <nav className="p-4 bg-sage-100 lg:w-64 lg:min-h-screen">Sidebar</nav>,
    children: <div className="p-8">Main content area</div>,
  },
};

// ---------- Section ----------
export const DefaultSection: StoryObj<typeof Section> = {
  render: (args) => <Section {...args} />,
  args: {
    heading: 'Section Heading',
    subtitle: 'A brief description of this section',
    children: <p>Section body content goes here.</p>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 2 })).toHaveTextContent('Section Heading');
    await expect(canvas.getByText('A brief description of this section')).toBeInTheDocument();
  },
};

export const SectionWithH3: StoryObj<typeof Section> = {
  render: (args) => <Section {...args} />,
  args: {
    heading: 'H3 Heading',
    as: 'h3',
    children: <p>Content under an h3 section.</p>,
  },
};

// ---------- Stack ----------
export const VerticalStack: StoryObj<typeof Stack> = {
  render: (args) => <Stack {...args} />,
  args: {
    direction: 'vertical',
    gap: 'md',
    children: (
      <>
        <div className="p-4 bg-sage-100 rounded">Item 1</div>
        <div className="p-4 bg-sage-100 rounded">Item 2</div>
        <div className="p-4 bg-sage-100 rounded">Item 3</div>
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const stack = canvas.getByText('Item 1').parentElement!;
    await expect(stack.className).toContain('flex-col');
    await expect(stack.className).toContain('gap-4');
  },
};

export const HorizontalStack: StoryObj<typeof Stack> = {
  render: (args) => <Stack {...args} />,
  args: {
    direction: 'horizontal',
    gap: 'lg',
    align: 'center',
    children: (
      <>
        <div className="p-4 bg-sage-100 rounded">A</div>
        <div className="p-4 bg-sage-100 rounded">B</div>
        <div className="p-4 bg-sage-100 rounded">C</div>
      </>
    ),
  },
};

// ---------- Container ----------
export const DefaultContainer: StoryObj<typeof Container> = {
  render: (args) => <Container {...args} />,
  args: {
    children: <div className="p-8 bg-stone-100 rounded">Contained content (max-w-6xl)</div>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByText('Contained content (max-w-6xl)').parentElement!;
    await expect(container.className).toContain('max-w-6xl');
    await expect(container.className).toContain('mx-auto');
  },
};

export const SmallContainer: StoryObj<typeof Container> = {
  render: (args) => <Container {...args} />,
  args: {
    size: 'sm',
    children: <div className="p-8 bg-stone-100 rounded">Small container (max-w-lg)</div>,
  },
};

// ---------- Composed Layout ----------
export const FullPageComposition: StoryObj<typeof PageShell> = {
  args: {
    header: <div className="p-4 bg-sage-100 w-full text-center font-semibold">App Header</div>,
    footer: <div className="p-3 bg-stone-100 w-full text-center text-sm text-stone-500">Footer</div>,
    children: (
      <Container size="md">
        <Stack gap="lg" className="py-8">
          <Section heading="Welcome" subtitle="Get started with your dashboard">
            <p>Dashboard content here.</p>
          </Section>
          <Section heading="Recent Activity">
            <Stack direction="horizontal" gap="md">
              <div className="p-4 bg-sage-50 rounded flex-1">Card 1</div>
              <div className="p-4 bg-sage-50 rounded flex-1">Card 2</div>
            </Stack>
          </Section>
        </Stack>
      </Container>
    ),
  },
};
