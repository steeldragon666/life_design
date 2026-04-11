import type { Meta, StoryObj } from '@storybook/react';
import { MentorAvatar } from '../mentor/MentorAvatar';
import { ChatBubble } from '../mentor/ChatBubble';
import { MentorPanel } from '../mentor/MentorPanel';

/* ---------- MentorAvatar ---------- */

const avatarMeta: Meta<typeof MentorAvatar> = {
  title: 'Mentor/MentorAvatar',
  component: MentorAvatar,
  argTypes: {
    status: { control: 'select', options: ['idle', 'speaking', 'thinking'] },
  },
};

export default avatarMeta;
type AvatarStory = StoryObj<typeof MentorAvatar>;

export const Idle: AvatarStory = {
  args: { name: 'Life Coach', status: 'idle' },
};

export const Speaking: AvatarStory = {
  args: { name: 'Life Coach', status: 'speaking' },
};

export const Thinking: AvatarStory = {
  args: { name: 'Life Coach', status: 'thinking' },
};

/* ---------- ChatBubble ---------- */

export const UserBubble: StoryObj<typeof ChatBubble> = {
  render: () => <ChatBubble message="How can I improve my health score?" sender="user" timestamp="10:30 AM" />,
  name: 'ChatBubble – User',
};

export const MentorBubble: StoryObj<typeof ChatBubble> = {
  render: () => (
    <ChatBubble
      message="I'd recommend focusing on consistent sleep habits and daily movement. Even 20 minutes of walking can make a big difference."
      sender="mentor"
      timestamp="10:31 AM"
    />
  ),
  name: 'ChatBubble – Mentor',
};

export const TypingBubble: StoryObj<typeof ChatBubble> = {
  render: () => <ChatBubble message="" sender="mentor" isTyping />,
  name: 'ChatBubble – Typing',
};

/* ---------- MentorPanel ---------- */

const sampleMessages = [
  { id: '1', message: 'Hello! How can I improve my health?', sender: 'user' as const, timestamp: '10:30 AM' },
  { id: '2', message: 'Great question! Let me look at your recent data...', sender: 'mentor' as const, timestamp: '10:31 AM' },
  { id: '3', message: 'Based on your trends, I recommend focusing on sleep quality. Your sleep scores have been declining this week.', sender: 'mentor' as const, timestamp: '10:31 AM' },
];

export const Panel: StoryObj<typeof MentorPanel> = {
  render: () => (
    <div style={{ height: 500 }}>
      <MentorPanel
        mentorName="Life Coach"
        messages={sampleMessages}
        onSend={(msg) => console.log('Send:', msg)}
      />
    </div>
  ),
  name: 'MentorPanel',
};

export const PanelLoading: StoryObj<typeof MentorPanel> = {
  render: () => (
    <div style={{ height: 500 }}>
      <MentorPanel
        mentorName="Life Coach"
        messages={sampleMessages}
        onSend={(msg) => console.log('Send:', msg)}
        isLoading
      />
    </div>
  ),
  name: 'MentorPanel – Loading',
};
