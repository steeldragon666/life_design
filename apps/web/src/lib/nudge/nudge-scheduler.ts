// ---------------------------------------------------------------------------
// Nudge Scheduler
// ---------------------------------------------------------------------------
// Manages the lifecycle of nudges (timely reminders and suggestions).
// Polls for pending nudges and surfaces the most relevant one.
// ---------------------------------------------------------------------------

import type { LifeDesignDB, DBNudge } from '@/lib/db/schema';

export class NudgeScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL_MS = 60_000; // 1 minute

  constructor(private db: LifeDesignDB) {}

  /**
   * Update the schedule times for nudges.
   */
  updateSchedule(schedule: Record<string, { hour: number; minute: number }>): void {
    // In a full implementation, this would save to the user's settings table in db.
    // For now it is a no-op that satisfies the interface.
  }

  /**
   * Start the scheduler polling loop.
   * Checks for due nudges every minute.
   */
  start(): void {
    if (this.intervalId !== null) return;

    // Run an initial check
    this.checkAndSchedule().catch(() => {});

    // Then poll periodically
    this.intervalId = setInterval(() => {
      this.checkAndSchedule().catch(() => {});
    }, this.POLL_INTERVAL_MS);
  }

  /**
   * Stop the scheduler polling loop.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get the most relevant active (non-dismissed) nudge that is due.
   */
  async getActiveNudge(): Promise<DBNudge | null> {
    const now = new Date();

    try {
      const nudges = await this.db.nudges
        .where('dismissed')
        .equals(0)
        .toArray();

      // Filter to nudges that are currently due
      const dueNudges = nudges.filter(
        (n) => new Date(n.scheduledFor) <= now,
      );

      if (dueNudges.length === 0) return null;

      // Return the most recently scheduled nudge
      dueNudges.sort(
        (a, b) =>
          new Date(b.scheduledFor).getTime() -
          new Date(a.scheduledFor).getTime(),
      );

      return dueNudges[0];
    } catch {
      return null;
    }
  }

  /**
   * Mark a nudge as read/dismissed so it won't appear again.
   */
  async markAsRead(nudgeId: number | string): Promise<void> {
    const id = typeof nudgeId === 'string' ? parseInt(nudgeId, 10) : nudgeId;
    try {
      await this.db.nudges.update(id, { dismissed: true });
    } catch {
      // Nudge may have been already deleted
    }
  }

  /**
   * Schedule a new nudge to be shown at a future time.
   */
  async scheduleNudge(nudge: {
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    scheduledFor: Date;
  }): Promise<number> {
    const id = await this.db.nudges.add({
      type: nudge.type,
      title: nudge.title,
      message: nudge.message,
      actionUrl: nudge.actionUrl,
      scheduledFor: nudge.scheduledFor,
      dismissed: false,
      createdAt: new Date(),
    });
    return id as number;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Check whether to auto-generate nudges based on user activity.
   */
  private async checkAndSchedule(): Promise<void> {
    try {
      // Check if user has checked in today
      const today = new Date().toISOString().slice(0, 10);
      const todaysCheckIn = await this.db.checkIns
        .where('date')
        .equals(today)
        .first();

      if (!todaysCheckIn) {
        // Check if we already have a reminder nudge for today
        const existingNudges = await this.db.nudges
          .where('dismissed')
          .equals(0)
          .toArray();

        const hasReminder = existingNudges.some(
          (n) => n.type === 'checkin_reminder' &&
            new Date(n.createdAt).toISOString().slice(0, 10) === today,
        );

        if (!hasReminder) {
          // Schedule a check-in reminder
          const now = new Date();
          // Only schedule if it's after 6 PM
          if (now.getHours() >= 18) {
            await this.scheduleNudge({
              type: 'checkin_reminder',
              title: 'Daily check-in',
              message: 'You haven\'t checked in today. A quick reflection can make a big difference.',
              actionUrl: '/checkin',
              scheduledFor: now,
            });
          }
        }
      }
    } catch {
      // Silently ignore errors in the background scheduler
    }
  }
}
