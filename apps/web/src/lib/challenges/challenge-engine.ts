// ---------------------------------------------------------------------------
// Challenge Engine
// ---------------------------------------------------------------------------
// Manages the lifecycle of user challenges: starting, completing tasks,
// tracking progress, and abandoning challenges.
// ---------------------------------------------------------------------------

import type { LifeDesignDB, DBActiveChallenge } from '@/lib/db/schema';
import { getChallengeById } from './challenge-library';
import type { ChallengeProgress, TodaysTasks } from './types';

export class ChallengeEngine {
  constructor(private db: LifeDesignDB) {}

  /**
   * Start a new challenge. Returns the ID of the created active challenge record.
   */
  async startChallenge(challengeId: string): Promise<number> {
    const challenge = getChallengeById(challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    // Check if user already has this challenge active
    const existing = await this.db.activeChallenges
      .where('challengeId')
      .equals(challengeId)
      .and((ac) => ac.status === 'active')
      .first();

    if (existing) {
      throw new Error(`Challenge "${challenge.title}" is already active.`);
    }

    const today = new Date().toISOString().slice(0, 10);

    return this.db.activeChallenges.add({
      challengeId,
      startDate: today,
      status: 'active',
      taskCompletion: {},
      createdAt: new Date(),
    });
  }

  /**
   * Mark a specific task as completed within an active challenge.
   */
  async completeTask(activeChallengeId: number, taskId: string): Promise<void> {
    const active = await this.db.activeChallenges.get(activeChallengeId);
    if (!active) {
      throw new Error('Active challenge not found.');
    }

    if (active.status !== 'active') {
      throw new Error('Challenge is no longer active.');
    }

    await this.db.activeChallenges.update(activeChallengeId, {
      taskCompletion: {
        ...active.taskCompletion,
        [taskId]: true,
      },
    });
  }

  /**
   * Mark the entire challenge as completed.
   * Should only be called when all tasks are done.
   */
  async completeChallenge(activeChallengeId: number): Promise<void> {
    const active = await this.db.activeChallenges.get(activeChallengeId);
    if (!active) {
      throw new Error('Active challenge not found.');
    }

    await this.db.activeChallenges.update(activeChallengeId, {
      status: 'completed',
      completedAt: new Date(),
    });

    // Award the challenge badge
    const challenge = getChallengeById(active.challengeId);
    if (challenge) {
      const existingBadge = await this.db.badges
        .where('badgeId')
        .equals(`challenge-${challenge.id}`)
        .first();

      if (!existingBadge) {
        await this.db.badges.add({
          badgeId: `challenge-${challenge.id}`,
          earnedAt: new Date(),
          context: 'challenge',
        });
      }
    }
  }

  /**
   * Abandon an active challenge (user gives up).
   */
  async abandonChallenge(activeChallengeId: number): Promise<void> {
    const active = await this.db.activeChallenges.get(activeChallengeId);
    if (!active) {
      throw new Error('Active challenge not found.');
    }

    await this.db.activeChallenges.update(activeChallengeId, {
      status: 'abandoned',
    });
  }

  /**
   * Calculate progress stats for an active challenge.
   */
  getProgress(active: DBActiveChallenge): ChallengeProgress {
    const challenge = getChallengeById(active.challengeId);
    if (!challenge) {
      return {
        percentage: 0,
        completedTasks: 0,
        totalTasks: 0,
        completedDays: 0,
        totalDays: 0,
      };
    }

    const totalTasks = challenge.days.reduce(
      (sum, day) => sum + day.tasks.length,
      0,
    );
    const completedTasks = Object.values(active.taskCompletion).filter(
      Boolean,
    ).length;

    const completedDays = challenge.days.filter((day) =>
      day.tasks.every((task) => active.taskCompletion[task.id] === true),
    ).length;

    const percentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      percentage,
      completedTasks,
      totalTasks,
      completedDays,
      totalDays: challenge.days.length,
    };
  }

  /**
   * Get today's tasks for an active challenge.
   * Returns null if today is outside the challenge date range.
   */
  getTodaysTasks(active: DBActiveChallenge): TodaysTasks | null {
    const challenge = getChallengeById(active.challengeId);
    if (!challenge) return null;

    const startMs = new Date(active.startDate + 'T12:00:00Z').getTime();
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayMs = new Date(todayStr + 'T12:00:00Z').getTime();
    const dayNumber = Math.floor((todayMs - startMs) / 86400000) + 1;

    const day = challenge.days.find((d) => d.day === dayNumber);
    if (!day) return null;

    return {
      day,
      tasks: day.tasks,
    };
  }
}
