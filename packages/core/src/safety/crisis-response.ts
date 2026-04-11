import { CrisisLevel, type CrisisResponse, type CrisisResource } from './types';

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'Lifeline',
    phone: '13 11 14',
    description: '24/7 crisis support and suicide prevention',
    url: 'https://www.lifeline.org.au',
  },
  {
    name: 'Beyond Blue',
    phone: '1300 22 4636',
    description: 'Anxiety, depression and suicide prevention support',
    url: 'https://www.beyondblue.org.au',
  },
  {
    name: 'Emergency Services',
    phone: '000',
    description: 'For immediate danger to life',
  },
  {
    name: '13YARN',
    phone: '13 92 76',
    description: 'Crisis support for Aboriginal and Torres Strait Islander peoples',
    url: 'https://www.13yarn.org.au',
  },
  {
    name: 'Kids Helpline',
    phone: '1800 55 1800',
    description: 'Free 24/7 counselling for young people under 25',
    url: 'https://kidshelpline.com.au',
  },
  {
    name: 'Suicide Call Back Service',
    phone: '1300 659 467',
    description: 'Free 24/7 telephone and video counselling',
    url: 'https://www.suicidecallbackservice.org.au',
  },
];

export function buildCrisisResponse(level: CrisisLevel): CrisisResponse {
  if (level === CrisisLevel.High) {
    return {
      level,
      message:
        "I hear you, and I want you to know that what you're feeling matters. " +
        "You don't have to go through this alone. Please reach out to one of " +
        "these services — they're available right now and ready to help.",
      resources: CRISIS_RESOURCES,
    };
  }

  if (level === CrisisLevel.Medium) {
    return {
      level,
      message:
        "It sounds like you're going through a really difficult time. " +
        "I want to make sure you have support available. These services " +
        "are here for you whenever you need them.",
      resources: CRISIS_RESOURCES,
    };
  }

  if (level === CrisisLevel.Low) {
    return {
      level,
      message:
        "It sounds like things are tough right now. " +
        "If you ever need someone to talk to, these services are available.",
      resources: CRISIS_RESOURCES,
    };
  }

  return {
    level,
    message: '',
    resources: [],
  };
}

export { CRISIS_RESOURCES };
