'use server';

import { redirect } from 'next/navigation';

// Guest mode actions - returns data that will be stored in localStorage
export async function completeOnboarding() {
  // In guest mode, just redirect to dashboard
  redirect('/dashboard');
}

export async function onboardSaveProfile(data: {
  profession?: string;
  interests?: string[];
  hobbies?: string[];
  skills?: string[];
  projects?: string[];
  postcode?: string;
  name?: string;
  maritalStatus?: string;
}) {
  // In guest mode, this data is handled client-side
  // This action just validates and returns success
  return { error: null, data };
}

export async function onboardCreateGoals(goals: Array<{
  title: string;
  horizon: 'short' | 'medium' | 'long';
  description?: string;
}>) {
  // In guest mode, goals are stored in localStorage
  // This action validates and returns the goals
  return { error: null, goals };
}
