import type { Meta, StoryObj } from '@storybook/react';
import { Home, BarChart3, Settings, User, MessageCircle } from 'lucide-react';
import { NavBar } from '../shared/NavBar';
import { BottomNav } from '../shared/BottomNav';

/* ---------- NavBar ---------- */

const navMeta: Meta<typeof NavBar> = {
  title: 'Shared/NavBar',
  component: NavBar,
};

export default navMeta;
type NavStory = StoryObj<typeof NavBar>;

export const Default: NavStory = {
  args: {
    logo: <span className="text-lg font-bold text-sage-600">LifeDesign</span>,
    links: [
      { label: 'Dashboard', href: '/dashboard', active: true },
      { label: 'Mentor', href: '/mentor' },
      { label: 'Settings', href: '/settings' },
    ],
    userAvatar: (
      <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-xs font-semibold text-sage-600">
        JD
      </div>
    ),
  },
};

export const WithActions: NavStory = {
  args: {
    logo: <span className="text-lg font-bold text-sage-600">LifeDesign</span>,
    links: [
      { label: 'Dashboard', href: '/dashboard', active: true },
      { label: 'Mentor', href: '/mentor' },
    ],
    actions: (
      <button className="text-stone-500 hover:text-stone-700">
        <Settings size={20} />
      </button>
    ),
  },
};

/* ---------- BottomNav ---------- */

const bottomNavItems = [
  { icon: <Home size={20} />, label: 'Home', href: '/', active: true },
  { icon: <BarChart3 size={20} />, label: 'Dashboard', href: '/dashboard' },
  { icon: <MessageCircle size={20} />, label: 'Mentor', href: '/mentor' },
  { icon: <User size={20} />, label: 'Profile', href: '/profile' },
];

export const Bottom: StoryObj<typeof BottomNav> = {
  render: () => (
    <div className="relative h-20">
      <BottomNav items={bottomNavItems} className="absolute" />
    </div>
  ),
  name: 'BottomNav',
};
