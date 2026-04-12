import { Suspense } from 'react';
import CompanionChatClient from './companion-chat-client';

export const metadata = {
  title: 'Companion | Life Design',
  description: 'Chat with your AI companion',
};

export default function CompanionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Loading companion…</p></div>}>
      <CompanionChatClient />
    </Suspense>
  );
}
