export interface ScreenTimeEntry {
  date: string;              // YYYY-MM-DD
  appCategory: string;       // 'social_media', 'productivity', 'entertainment', 'health', 'communication', 'other'
  durationMinutes: number;
  pickupCount: number;       // number of times device was picked up
  notificationCount: number;
  firstUseTime: string;      // HH:mm
  lastUseTime: string;       // HH:mm
}

export interface ScreenTimeSummary {
  totalMinutes: number;
  categoryBreakdown: Record<string, number>; // category -> minutes
  pickupCount: number;
  lateNightMinutes: number;  // usage after 22:00
  productivityRatio: number; // productivity / total
  socialMediaMinutes: number;
}
