import type { Dimension } from '@life-design/core';
import type { GuardianLogEntry, FeatureWeight } from '../ml/types';

interface ActionTrigger {
  triggerType: GuardianLogEntry['triggerType'];
  dimensionsAffected: Dimension[];
  topFeatures: FeatureWeight[];
}

const TEMPLATES: Record<string, string[]> = {
  burnout: [
    'You\'ve had {feature1} and {feature2} for {days} days. Consider blocking 2 hours for recovery today.',
    'Your {dim1} has been declining while work pressure is up. A short break could help recalibrate.',
  ],
  isolation: [
    'Your social connections have been quiet for {days} days. Even a short call with someone you trust can help.',
    'Digital fatigue is up and social time is down. Consider reaching out to a friend today.',
  ],
  flow_state: [
    'You\'re in a great rhythm! Keep protecting your deep work time and recovery balance.',
    'Everything is clicking -- your {dim1} and {dim2} are both trending up.',
  ],
};

export type { ActionTrigger };

export class ActionSynthesizer {
  generate(trigger: ActionTrigger): string {
    const templates = TEMPLATES[trigger.triggerType] ?? TEMPLATES.burnout;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const dim1 = trigger.dimensionsAffected[0] ?? 'wellbeing';
    const dim2 = trigger.dimensionsAffected[1] ?? 'balance';
    const feature1 = trigger.topFeatures[0]?.humanLabel ?? 'recent patterns';
    const feature2 = trigger.topFeatures[1]?.humanLabel ?? 'your routine';
    return template
      .replace('{dim1}', String(dim1))
      .replace('{dim2}', String(dim2))
      .replace('{feature1}', feature1)
      .replace('{feature2}', feature2)
      .replace('{days}', '3+');
  }
}
