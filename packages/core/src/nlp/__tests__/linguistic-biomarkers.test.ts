import { describe, it, expect } from 'vitest';
import {
  analyzeLinguisticBiomarkers,
  detectCognitiveDistortions,
  analyzeEmotionalTone,
  analyzePronounUsage,
  analyzeSyntacticComplexity,
  generateBiomarkerInsight,
  type LinguisticBiomarkers,
} from '../linguistic-biomarkers';

describe('analyzeLinguisticBiomarkers', () => {
  it('returns null for text under 20 words', () => {
    const result = analyzeLinguisticBiomarkers('I feel okay today.');
    expect(result).toBeNull();
  });

  it('returns a valid result for text with 20+ words', () => {
    const text =
      'Today I went to the store and bought some groceries for dinner. I felt pretty good about my choices and enjoyed the walk home.';
    const result = analyzeLinguisticBiomarkers(text);
    expect(result).not.toBeNull();
    expect(result!.cognitiveDistortions).toBeDefined();
    expect(result!.emotionalTone).toBeDefined();
    expect(result!.pronounRatio).toBeDefined();
    expect(result!.syntacticComplexity).toBeDefined();
    expect(result!.overallConcernLevel).toBeDefined();
    expect(result!.distortionScore).toBeGreaterThanOrEqual(0);
    expect(result!.distortionScore).toBeLessThanOrEqual(100);
  });
});

describe('detectCognitiveDistortions', () => {
  it('detects all-or-nothing thinking', () => {
    const result = detectCognitiveDistortions(
      'Everything is ruined and nothing will ever work. It is completely broken and totally destroyed.',
    );
    expect(result.allOrNothingThinking).toBeGreaterThan(0.3);
  });

  it('detects catastrophizing', () => {
    const result = detectCognitiveDistortions(
      "This is a terrible disaster, I can't handle it. It is the most awful and horrible thing that has ever happened.",
    );
    expect(result.catastrophizing).toBeGreaterThan(0.3);
  });

  it('detects personalization', () => {
    const result = detectCognitiveDistortions(
      "It's all my fault, I caused this problem. I should have known better because of me everything went wrong.",
    );
    expect(result.personalization).toBeGreaterThan(0.3);
  });

  it('detects overgeneralization', () => {
    const result = detectCognitiveDistortions(
      'Everyone always ignores me, no one ever listens. Nobody cares every time I try to speak up.',
    );
    expect(result.overgeneralization).toBeGreaterThan(0.3);
  });

  it('returns low scores for neutral text', () => {
    const result = detectCognitiveDistortions(
      'I went to the park today and had a nice walk. The weather was pleasant and I saw some birds.',
    );
    expect(result.allOrNothingThinking).toBeLessThan(0.2);
    expect(result.catastrophizing).toBeLessThan(0.2);
    expect(result.personalization).toBeLessThan(0.2);
    expect(result.overgeneralization).toBeLessThan(0.2);
  });

  it('returns scores between 0 and 1', () => {
    const result = detectCognitiveDistortions(
      'Everything is always terrible and it is my fault that nobody ever listens.',
    );
    expect(result.allOrNothingThinking).toBeGreaterThanOrEqual(0);
    expect(result.allOrNothingThinking).toBeLessThanOrEqual(1);
    expect(result.catastrophizing).toBeGreaterThanOrEqual(0);
    expect(result.catastrophizing).toBeLessThanOrEqual(1);
    expect(result.personalization).toBeGreaterThanOrEqual(0);
    expect(result.personalization).toBeLessThanOrEqual(1);
    expect(result.overgeneralization).toBeGreaterThanOrEqual(0);
    expect(result.overgeneralization).toBeLessThanOrEqual(1);
  });
});

describe('analyzeEmotionalTone', () => {
  it('calculates correct tone for positive text', () => {
    const result = analyzeEmotionalTone(
      'I feel happy and grateful today. Everything is wonderful and I am so excited about the amazing opportunities ahead.',
    );
    expect(result.positiveWordRatio).toBeGreaterThan(0);
    expect(result.positiveWordRatio).toBeGreaterThan(result.negativeWordRatio);
    expect(result.emotionalIntensity).toBeGreaterThan(0);
  });

  it('calculates correct tone for negative text', () => {
    const result = analyzeEmotionalTone(
      'I feel sad and frustrated. I am overwhelmed with anxiety and stress. Everything feels hopeless and difficult.',
    );
    expect(result.negativeWordRatio).toBeGreaterThan(0);
    expect(result.negativeWordRatio).toBeGreaterThan(result.positiveWordRatio);
    expect(result.emotionalIntensity).toBeGreaterThan(0);
  });

  it('returns low intensity for neutral text', () => {
    const result = analyzeEmotionalTone(
      'I went to the store and bought bread. Then I came home and put it on the counter in the kitchen.',
    );
    expect(result.emotionalIntensity).toBeLessThan(0.3);
  });

  it('returns ratios between 0 and 1', () => {
    const result = analyzeEmotionalTone(
      'I feel happy but also a bit sad and worried about things.',
    );
    expect(result.positiveWordRatio).toBeGreaterThanOrEqual(0);
    expect(result.positiveWordRatio).toBeLessThanOrEqual(1);
    expect(result.negativeWordRatio).toBeGreaterThanOrEqual(0);
    expect(result.negativeWordRatio).toBeLessThanOrEqual(1);
    expect(result.emotionalIntensity).toBeGreaterThanOrEqual(0);
    expect(result.emotionalIntensity).toBeLessThanOrEqual(1);
  });
});

describe('analyzePronounUsage', () => {
  it('scores high on first-person-singular for I-heavy text', () => {
    const result = analyzePronounUsage(
      'I went to my house and I made myself dinner. I think my life is about me and my choices.',
    );
    expect(result.firstPersonSingular).toBeGreaterThan(0.2);
  });

  it('scores low on first-person-singular for plural/third-person text', () => {
    const result = analyzePronounUsage(
      'They went to their house and she made them dinner. He thought about what they could do together.',
    );
    expect(result.firstPersonSingular).toBeLessThan(0.05);
    expect(result.thirdPerson).toBeGreaterThan(0.2);
  });

  it('detects first-person plural pronouns', () => {
    const result = analyzePronounUsage(
      'We went to our favorite restaurant and we enjoyed ourselves. Our group had a wonderful time together with us.',
    );
    expect(result.firstPersonPlural).toBeGreaterThan(0.15);
  });

  it('returns ratios that are valid proportions', () => {
    const result = analyzePronounUsage(
      'I told you that he and she went with them to our house.',
    );
    expect(result.firstPersonSingular).toBeGreaterThanOrEqual(0);
    expect(result.firstPersonPlural).toBeGreaterThanOrEqual(0);
    expect(result.secondPerson).toBeGreaterThanOrEqual(0);
    expect(result.thirdPerson).toBeGreaterThanOrEqual(0);
  });
});

describe('analyzeSyntacticComplexity', () => {
  it('reports shorter average sentence length for short simple sentences', () => {
    const simple = analyzeSyntacticComplexity(
      'I ran. He sat. She left. They ate. We slept.',
    );
    const complex = analyzeSyntacticComplexity(
      'The extraordinary circumstances surrounding the unprecedented event led to a remarkable series of consequences that fundamentally altered the trajectory of everything involved.',
    );
    expect(simple.averageSentenceLength).toBeLessThan(
      complex.averageSentenceLength,
    );
  });

  it('reports lower vocabulary richness for repetitive text', () => {
    const repetitive = analyzeSyntacticComplexity(
      'The dog saw the dog and the dog chased the dog around the dog park where the dog played.',
    );
    const varied = analyzeSyntacticComplexity(
      'The quick brown fox jumped over a lazy sleeping hound near the ancient mossy wooden fence beside the creek.',
    );
    expect(repetitive.vocabularyRichness).toBeLessThan(varied.vocabularyRichness);
  });

  it('calculates average word length', () => {
    const result = analyzeSyntacticComplexity(
      'I am a cat in a hat on a mat by a bat.',
    );
    expect(result.averageWordLength).toBeGreaterThan(0);
    expect(result.averageWordLength).toBeLessThan(10);
  });
});

describe('overallConcernLevel', () => {
  it('returns none for neutral text', () => {
    const text =
      'Today I went to the store and bought some groceries. The weather was nice and I had a pleasant walk back home from the market.';
    const result = analyzeLinguisticBiomarkers(text);
    expect(result).not.toBeNull();
    expect(result!.overallConcernLevel).toBe('none');
  });

  it('returns elevated for text with multiple distortion indicators', () => {
    const text =
      "Everything is always terrible and nothing ever works. I can't handle this awful disaster. It's all my fault, I caused everything bad. Nobody ever listens to me and everyone always ignores me. I feel hopeless and overwhelmed.";
    const result = analyzeLinguisticBiomarkers(text);
    expect(result).not.toBeNull();
    expect(result!.overallConcernLevel).toBe('elevated');
  });
});

describe('generateBiomarkerInsight', () => {
  it('produces educational (not diagnostic) language', () => {
    const biomarkers: LinguisticBiomarkers = {
      cognitiveDistortions: {
        allOrNothingThinking: 0.7,
        catastrophizing: 0.3,
        personalization: 0.1,
        overgeneralization: 0.5,
      },
      distortionScore: 60,
      emotionalTone: {
        positiveWordRatio: 0.02,
        negativeWordRatio: 0.15,
        emotionalIntensity: 0.6,
      },
      pronounRatio: {
        firstPersonSingular: 0.15,
        firstPersonPlural: 0.02,
        secondPerson: 0.01,
        thirdPerson: 0.03,
      },
      syntacticComplexity: {
        averageSentenceLength: 12,
        vocabularyRichness: 0.7,
        averageWordLength: 4.5,
      },
      overallConcernLevel: 'moderate',
    };

    const insight = generateBiomarkerInsight(biomarkers);
    expect(insight.length).toBeGreaterThan(0);
    expect(insight.toLowerCase()).not.toContain('diagnosis');
    expect(insight.toLowerCase()).not.toContain('disorder');
    expect(insight.toLowerCase()).not.toContain('clinical');
    expect(insight.toLowerCase()).not.toContain('treatment');
    expect(insight.toLowerCase()).not.toContain('disease');
  });

  it('never uses diagnostic language even for elevated concern', () => {
    const biomarkers: LinguisticBiomarkers = {
      cognitiveDistortions: {
        allOrNothingThinking: 0.9,
        catastrophizing: 0.8,
        personalization: 0.7,
        overgeneralization: 0.9,
      },
      distortionScore: 90,
      emotionalTone: {
        positiveWordRatio: 0.0,
        negativeWordRatio: 0.3,
        emotionalIntensity: 0.9,
      },
      pronounRatio: {
        firstPersonSingular: 0.25,
        firstPersonPlural: 0.0,
        secondPerson: 0.0,
        thirdPerson: 0.01,
      },
      syntacticComplexity: {
        averageSentenceLength: 8,
        vocabularyRichness: 0.4,
        averageWordLength: 4.0,
      },
      overallConcernLevel: 'elevated',
    };

    const insight = generateBiomarkerInsight(biomarkers);
    expect(insight.toLowerCase()).not.toContain('diagnosis');
    expect(insight.toLowerCase()).not.toContain('disorder');
    expect(insight.toLowerCase()).not.toContain('clinical');
    expect(insight.toLowerCase()).not.toContain('treatment');
    expect(insight.toLowerCase()).not.toContain('disease');
  });

  it('returns a neutral message for no concerns', () => {
    const biomarkers: LinguisticBiomarkers = {
      cognitiveDistortions: {
        allOrNothingThinking: 0.0,
        catastrophizing: 0.0,
        personalization: 0.0,
        overgeneralization: 0.0,
      },
      distortionScore: 0,
      emotionalTone: {
        positiveWordRatio: 0.1,
        negativeWordRatio: 0.01,
        emotionalIntensity: 0.2,
      },
      pronounRatio: {
        firstPersonSingular: 0.08,
        firstPersonPlural: 0.04,
        secondPerson: 0.02,
        thirdPerson: 0.05,
      },
      syntacticComplexity: {
        averageSentenceLength: 15,
        vocabularyRichness: 0.8,
        averageWordLength: 5.0,
      },
      overallConcernLevel: 'none',
    };

    const insight = generateBiomarkerInsight(biomarkers);
    expect(insight.length).toBeGreaterThan(0);
  });
});
