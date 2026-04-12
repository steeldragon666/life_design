import {
  THERAPEUTIC_TECHNIQUES,
  getTechniquesForModality,
  getTechniqueById,
} from '../modalities';
import { TherapeuticModality } from '../../types';

const ALL_MODALITIES = Object.values(TherapeuticModality);

describe('THERAPEUTIC_TECHNIQUES', () => {
  it('has exactly 28 techniques', () => {
    expect(THERAPEUTIC_TECHNIQUES).toHaveLength(28);
  });

  it('each technique has a non-empty id', () => {
    for (const t of THERAPEUTIC_TECHNIQUES) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
    }
  });

  it('each technique has a non-empty name', () => {
    for (const t of THERAPEUTIC_TECHNIQUES) {
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
    }
  });

  it('each technique has a valid modality', () => {
    for (const t of THERAPEUTIC_TECHNIQUES) {
      expect(ALL_MODALITIES).toContain(t.modality);
    }
  });

  it('each technique has a non-empty promptGuidance', () => {
    for (const t of THERAPEUTIC_TECHNIQUES) {
      expect(typeof t.promptGuidance).toBe('string');
      expect(t.promptGuidance.length).toBeGreaterThan(0);
    }
  });

  it('each technique has a description field', () => {
    for (const t of THERAPEUTIC_TECHNIQUES) {
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('all technique ids are unique', () => {
    const ids = THERAPEUTIC_TECHNIQUES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all 7 modalities are represented', () => {
    const modalitiesPresent = new Set(THERAPEUTIC_TECHNIQUES.map((t) => t.modality));
    for (const modality of ALL_MODALITIES) {
      expect(modalitiesPresent).toContain(modality);
    }
  });
});

describe('getTechniquesForModality', () => {
  it('returns 4 techniques per modality', () => {
    for (const modality of ALL_MODALITIES) {
      const techniques = getTechniquesForModality(modality);
      expect(techniques).toHaveLength(4);
    }
  });

  it('returned techniques all belong to the requested modality', () => {
    for (const modality of ALL_MODALITIES) {
      const techniques = getTechniquesForModality(modality);
      for (const t of techniques) {
        expect(t.modality).toBe(modality);
      }
    }
  });

  it('returns a non-empty array for CBT', () => {
    const cbt = getTechniquesForModality(TherapeuticModality.CBT);
    expect(cbt.length).toBeGreaterThan(0);
  });

  it('returns a non-empty array for Mindfulness', () => {
    const mindfulness = getTechniquesForModality(TherapeuticModality.Mindfulness);
    expect(mindfulness.length).toBeGreaterThan(0);
  });
});

describe('getTechniqueById', () => {
  it('returns a technique for a valid id', () => {
    const firstId = THERAPEUTIC_TECHNIQUES[0]!.id;
    const result = getTechniqueById(firstId);
    expect(result).toBeDefined();
    expect(result!.id).toBe(firstId);
  });

  it('returns undefined for an unknown id', () => {
    expect(getTechniqueById('this-id-does-not-exist')).toBeUndefined();
  });

  it('returns undefined for an empty string id', () => {
    expect(getTechniqueById('')).toBeUndefined();
  });

  it('finds a known CBT technique by id', () => {
    const result = getTechniqueById('cbt_thought_record');
    expect(result).toBeDefined();
    expect(result!.modality).toBe(TherapeuticModality.CBT);
  });

  it('finds a known DBT technique by id', () => {
    const result = getTechniqueById('dbt_tipp');
    expect(result).toBeDefined();
    expect(result!.modality).toBe(TherapeuticModality.DBT);
  });
});
