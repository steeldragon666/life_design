export interface CBTTechnique {
  id: string;
  name: string;
  category: 'cognitive_restructuring' | 'behavioural_activation' | 'mindfulness' | 'relaxation';
  description: string;
  duration: string;     // e.g., '5 minutes'
  targetMoods: string[]; // which moods this helps with
}

export const CBT_TECHNIQUES: CBTTechnique[] = [
  {
    id: 'thought_record',
    name: 'Thought Record',
    category: 'cognitive_restructuring',
    description: 'Identify and challenge negative automatic thoughts by writing them down and finding balanced alternatives.',
    duration: '10 minutes',
    targetMoods: ['melancholic', 'tense'],
  },
  {
    id: 'behavioural_activation',
    name: 'Pleasant Activity Scheduling',
    category: 'behavioural_activation',
    description: 'Plan a small enjoyable activity for today. Even brief pleasurable moments can shift mood.',
    duration: '5 minutes',
    targetMoods: ['melancholic', 'calm'],
  },
  {
    id: 'breathing_4_7_8',
    name: '4-7-8 Breathing',
    category: 'relaxation',
    description: 'Breathe in for 4 counts, hold for 7, exhale for 8. Activates the parasympathetic nervous system.',
    duration: '3 minutes',
    targetMoods: ['tense', 'energetic'],
  },
  {
    id: 'body_scan',
    name: 'Body Scan Meditation',
    category: 'mindfulness',
    description: 'Progressively focus attention on each part of your body, noticing sensations without judgment.',
    duration: '10 minutes',
    targetMoods: ['tense', 'energetic'],
  },
  {
    id: 'gratitude_list',
    name: 'Gratitude List',
    category: 'cognitive_restructuring',
    description: 'Write down 3 things you are grateful for today. Shifts attention from negative to positive.',
    duration: '5 minutes',
    targetMoods: ['melancholic'],
  },
  {
    id: 'values_check',
    name: 'Values Check-In',
    category: 'behavioural_activation',
    description: 'Reflect on whether today\'s activities aligned with your core values. Identify one value-driven action for tomorrow.',
    duration: '5 minutes',
    targetMoods: ['calm', 'happy'],
  },
];
