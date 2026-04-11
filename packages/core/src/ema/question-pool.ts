import { Dimension } from '../enums';

export interface EMAQuestion {
  id: string;
  dimension: Dimension;
  text: string;
  burdenScore: number;      // 1-5 (how taxing to answer)
  informationValue: number; // 0-1 (how much info this yields)
}

export const QUESTION_POOL: EMAQuestion[] = [
  // Career
  {
    id: 'career-satisfaction',
    dimension: Dimension.Career,
    text: 'How satisfied are you with your work today?',
    burdenScore: 1,
    informationValue: 0.5,
  },
  {
    id: 'career-progress',
    dimension: Dimension.Career,
    text: 'How much progress did you make toward your career goals this week?',
    burdenScore: 3,
    informationValue: 0.8,
  },
  {
    id: 'career-meaning',
    dimension: Dimension.Career,
    text: 'To what extent does your current work feel meaningful and aligned with your values?',
    burdenScore: 4,
    informationValue: 0.9,
  },

  // Finance
  {
    id: 'finance-stress',
    dimension: Dimension.Finance,
    text: 'How stressed are you about money right now?',
    burdenScore: 1,
    informationValue: 0.5,
  },
  {
    id: 'finance-control',
    dimension: Dimension.Finance,
    text: 'How in control of your spending and saving do you feel this week?',
    burdenScore: 3,
    informationValue: 0.8,
  },
  {
    id: 'finance-security',
    dimension: Dimension.Finance,
    text: 'How confident are you in your long-term financial security?',
    burdenScore: 4,
    informationValue: 0.9,
  },

  // Health
  {
    id: 'health-energy',
    dimension: Dimension.Health,
    text: 'How is your energy level today?',
    burdenScore: 1,
    informationValue: 0.4,
  },
  {
    id: 'health-habits',
    dimension: Dimension.Health,
    text: 'How well did you maintain healthy habits (sleep, nutrition, hydration) this week?',
    burdenScore: 3,
    informationValue: 0.8,
  },
  {
    id: 'health-overall',
    dimension: Dimension.Health,
    text: 'How would you rate your overall physical and mental well-being right now?',
    burdenScore: 4,
    informationValue: 0.9,
  },

  // Fitness
  {
    id: 'fitness-activity',
    dimension: Dimension.Fitness,
    text: 'Did you exercise or move your body today?',
    burdenScore: 1,
    informationValue: 0.4,
  },
  {
    id: 'fitness-consistency',
    dimension: Dimension.Fitness,
    text: 'How consistent have you been with your fitness routine this week?',
    burdenScore: 2,
    informationValue: 0.7,
  },
  {
    id: 'fitness-progress',
    dimension: Dimension.Fitness,
    text: 'How are you progressing toward your fitness goals (strength, endurance, flexibility)?',
    burdenScore: 4,
    informationValue: 0.9,
  },

  // Family
  {
    id: 'family-connection',
    dimension: Dimension.Family,
    text: 'How connected do you feel to your family right now?',
    burdenScore: 1,
    informationValue: 0.5,
  },
  {
    id: 'family-quality',
    dimension: Dimension.Family,
    text: 'How would you rate the quality of time you spent with family this week?',
    burdenScore: 3,
    informationValue: 0.8,
  },
  {
    id: 'family-support',
    dimension: Dimension.Family,
    text: 'How supported do you feel by your family, and how well are you supporting them?',
    burdenScore: 4,
    informationValue: 0.9,
  },

  // Social
  {
    id: 'social-interaction',
    dimension: Dimension.Social,
    text: 'How much meaningful social interaction have you had today?',
    burdenScore: 1,
    informationValue: 0.4,
  },
  {
    id: 'social-belonging',
    dimension: Dimension.Social,
    text: 'How strong is your sense of belonging in your social circles?',
    burdenScore: 3,
    informationValue: 0.8,
  },
  {
    id: 'social-depth',
    dimension: Dimension.Social,
    text: 'How satisfied are you with the depth and authenticity of your friendships?',
    burdenScore: 4,
    informationValue: 0.9,
  },

  // Romance
  {
    id: 'romance-closeness',
    dimension: Dimension.Romance,
    text: 'How close and connected do you feel to your partner (or dating life)?',
    burdenScore: 1,
    informationValue: 0.5,
  },
  {
    id: 'romance-satisfaction',
    dimension: Dimension.Romance,
    text: 'How satisfied are you with your romantic relationship or love life this week?',
    burdenScore: 3,
    informationValue: 0.8,
  },
  {
    id: 'romance-growth',
    dimension: Dimension.Romance,
    text: 'How well are you and your partner growing together, or how intentional are you about your romantic goals?',
    burdenScore: 4,
    informationValue: 0.9,
  },

  // Growth
  {
    id: 'growth-learning',
    dimension: Dimension.Growth,
    text: 'Did you learn something new or challenging today?',
    burdenScore: 1,
    informationValue: 0.4,
  },
  {
    id: 'growth-reflection',
    dimension: Dimension.Growth,
    text: 'How much time did you spend on personal development this week?',
    burdenScore: 2,
    informationValue: 0.7,
  },
  {
    id: 'growth-fulfillment',
    dimension: Dimension.Growth,
    text: 'How fulfilled do you feel in terms of personal growth and self-improvement?',
    burdenScore: 4,
    informationValue: 0.9,
  },
];
