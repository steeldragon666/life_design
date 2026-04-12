import { db } from './index';
import { Dimension, GoalHorizon, GoalStatus } from '@life-design/core';

export async function seedDevelopmentData(): Promise<{
  checkInCount: number;
  goalCount: number;
  correlationCount: number;
}> {
  // Clear existing data
  await Promise.all([
    db.checkIns.clear(),
    db.goals.clear(),
    db.correlations.clear(),
    db.insights.clear(),
    db.nudges.clear(),
  ]);

  // --- 30 days of check-ins ---
  const now = new Date();
  const checkIns = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const progress = (30 - i) / 30; // 0 to 1 over the month

    // Dimension patterns
    const fitness = clamp(Math.round(2 + progress * 1.5 + noise() * 0.5), 1, 5);
    const health = clamp(Math.round(2 + progress * 1.5 + noise() * 0.5), 1, 5);
    const career = clamp(Math.round(3 + noise() * 0.3), 1, 5);
    const finance = clamp(Math.round(2.5 + progress * 0.8 + noise() * 0.5), 1, 5);
    // Social: dip mid-month, then recovery
    const socialBase = i > 20 ? 3 : i > 10 ? 2 : 3;
    const social = clamp(Math.round(socialBase + noise() * 0.5), 1, 5);
    const romance = clamp(Math.round(social * 0.8 + noise() * 0.3), 1, 5);
    const family = clamp(Math.round(3 + noise() * 0.5), 1, 5);
    const growth = clamp(Math.round(2.5 + progress * 1 + noise() * 0.5), 1, 5);

    const dimensionScores: Partial<Record<Dimension, number>> = {
      [Dimension.Career]: career,
      [Dimension.Finance]: finance,
      [Dimension.Health]: health,
      [Dimension.Fitness]: fitness,
      [Dimension.Family]: family,
      [Dimension.Social]: social,
      [Dimension.Romance]: romance,
      [Dimension.Growth]: growth,
    };

    const dimValues = Object.values(dimensionScores) as number[];
    const avg = dimValues.reduce((a, b) => a + b, 0) / dimValues.length;
    const mood = clamp(Math.round(avg + noise() * 0.3), 1, 5);

    const journals = [
      'Had a productive morning at the gym. Feeling energised.',
      'Work was challenging but rewarding today.',
      'Spent time reading and learning new skills.',
      'Caught up with friends over coffee.',
      'Quiet day at home with family.',
      'Focused on budgeting and financial planning.',
      'Great run this morning, feeling strong.',
      'Meditation session helped me feel centered.',
      null,
      null, // some days without journal
    ];

    checkIns.push({
      date: dateStr,
      mood,
      energy: clamp(Math.round(mood * 0.9 + noise() * 0.2), 1, 5),
      sleep: clamp(Math.round(6 + Math.random() * 3), 4, 10),
      journal: journals[i % journals.length] ?? undefined,
      dimensionScores,
      tags: [],
      createdAt: date,
    });
  }

  await db.checkIns.bulkAdd(checkIns);

  // --- 3 goals ---
  const goals = [
    {
      title: 'Run a half marathon',
      description: 'Train consistently and complete a half marathon by end of quarter',
      horizon: GoalHorizon.Medium,
      status: GoalStatus.Active,
      dimensions: [Dimension.Fitness, Dimension.Health],
      targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      milestones: [
        {
          id: 'hm-1',
          title: 'Run 5km without stopping',
          description: 'Build base endurance',
          position: 0,
          completed: true,
          completedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'hm-2',
          title: 'Run 10km',
          description: 'Increase distance',
          position: 1,
          completed: true,
          completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'hm-3',
          title: 'Run 15km',
          description: 'Long run training',
          position: 2,
          completed: false,
        },
        {
          id: 'hm-4',
          title: 'Complete half marathon',
          description: 'Race day',
          position: 3,
          completed: false,
        },
      ],
      dimensionImpacts: [
        { dimension: Dimension.Fitness, impact: 4, explanation: 'Major fitness improvement' },
        { dimension: Dimension.Health, impact: 3 },
      ],
      createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Build emergency fund',
      description: 'Save 3 months of expenses in a separate account',
      horizon: GoalHorizon.Long,
      status: GoalStatus.Active,
      dimensions: [Dimension.Finance],
      targetDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      milestones: [
        {
          id: 'ef-1',
          title: 'Save first month of expenses',
          description: 'Initial savings target',
          position: 0,
          completed: true,
          completedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'ef-2',
          title: 'Save second month',
          description: 'Halfway point',
          position: 1,
          completed: false,
        },
        {
          id: 'ef-3',
          title: 'Save third month',
          description: 'Full emergency fund',
          position: 2,
          completed: false,
        },
      ],
      dimensionImpacts: [
        { dimension: Dimension.Finance, impact: 5, explanation: 'Financial security' },
      ],
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Read 12 books this year',
      description: 'Read one book per month across different genres',
      horizon: GoalHorizon.Long,
      status: GoalStatus.Active,
      dimensions: [Dimension.Growth],
      milestones: [
        {
          id: 'rb-1',
          title: 'Finish book 1',
          description: 'First book complete',
          position: 0,
          completed: true,
          completedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'rb-2',
          title: 'Finish book 2',
          description: 'Second book',
          position: 1,
          completed: false,
        },
      ],
      dimensionImpacts: [
        { dimension: Dimension.Growth, impact: 4, explanation: 'Intellectual growth' },
      ],
      createdAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  await db.goals.bulkAdd(goals);

  // --- 5 correlations ---
  const correlations = [
    {
      dimension1: Dimension.Career,
      dimension2: Dimension.Finance,
      strength: 0.72,
      description: 'Career satisfaction positively correlates with financial confidence',
      sampleSize: 30,
      calculatedAt: new Date(),
    },
    {
      dimension1: Dimension.Health,
      dimension2: Dimension.Fitness,
      strength: 0.85,
      description: 'Health and fitness are strongly correlated',
      sampleSize: 30,
      calculatedAt: new Date(),
    },
    {
      dimension1: Dimension.Social,
      dimension2: Dimension.Romance,
      strength: 0.61,
      description: 'Social connections support romantic wellbeing',
      sampleSize: 30,
      calculatedAt: new Date(),
    },
    {
      dimension1: Dimension.Fitness,
      dimension2: Dimension.Growth,
      strength: 0.45,
      description: 'Physical fitness moderately supports personal growth',
      sampleSize: 30,
      calculatedAt: new Date(),
    },
    {
      dimension1: Dimension.Career,
      dimension2: Dimension.Social,
      strength: -0.38,
      description: 'Career focus slightly reduces social time',
      sampleSize: 30,
      calculatedAt: new Date(),
    },
  ];

  await db.correlations.bulkAdd(correlations);

  return {
    checkInCount: checkIns.length,
    goalCount: goals.length,
    correlationCount: correlations.length,
  };
}

function noise(): number {
  return (Math.random() - 0.5) * 2; // -1 to +1
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Expose in dev mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__seedData = seedDevelopmentData;
}
