import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { ALL_DIMENSIONS, DIMENSION_LABELS, Dimension, DurationType } from '@life-design/core';
import { supabase } from '../../src/lib/supabase';

const SCORE_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Low' },
  { value: 2, emoji: '🙂', label: 'Okay' },
  { value: 3, emoji: '😌', label: 'Steady' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '😁', label: 'Great' },
] as const;

export default function CheckInScreen() {
  const [mood, setMood] = useState(3);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [journal, setJournal] = useState('');
  const [loading, setLoading] = useState(false);

  const moodOption = SCORE_OPTIONS.find((o) => o.value === mood);

  async function handleSubmit() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const dimensionScores = ALL_DIMENSIONS
      .filter((dim) => scores[dim] !== undefined)
      .map((dim) => ({ dimension: dim, score: scores[dim] }));

    const { data: checkin, error } = await supabase
      .from('checkins')
      .insert({
        user_id: user.id,
        date: today,
        mood,
        duration_type: DurationType.Quick,
        journal_entry: journal || null,
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    if (dimensionScores.length > 0) {
      await supabase.from('dimension_scores').insert(
        dimensionScores.map((s) => ({
          checkin_id: checkin.id,
          dimension: s.dimension,
          score: s.score,
        })),
      );
    }

    Alert.alert('Success', 'Check-in saved!');
    setMood(3);
    setScores({});
    setJournal('');
    setLoading(false);
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Daily Check-in</Text>

      <Text style={styles.label}>Mood {moodOption?.emoji ?? '😌'} {mood}/5</Text>
      <View style={styles.moodRow}>
        {SCORE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setMood(option.value)}
            style={[
              styles.moodButton,
              mood === option.value && styles.moodButtonActive,
            ]}
          >
            <Text style={styles.moodEmoji}>{option.emoji}</Text>
            <Text
              style={[
                styles.moodLabel,
                mood === option.value && styles.moodLabelActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Dimensions</Text>
      {ALL_DIMENSIONS.map((dim) => (
        <View key={dim} style={styles.dimRow}>
          <Text style={styles.dimLabel}>{DIMENSION_LABELS[dim]}</Text>
          <View style={styles.scoreButtons}>
            {SCORE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setScores((prev) => ({ ...prev, [dim]: option.value }))}
                style={[
                  styles.scoreButton,
                  scores[dim] === option.value && styles.scoreButtonActive,
                ]}
              >
                <Text style={styles.scoreEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.scoreButtonText,
                    scores[dim] === option.value && styles.scoreButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.label}>Journal (optional)</Text>
      <TextInput
        style={styles.textArea}
        placeholder="How are you feeling today?"
        value={journal}
        onChangeText={setJournal}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Check-in'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 12 },
  moodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  moodButton: {
    flex: 1, alignItems: 'center', padding: 10, borderRadius: 12,
    borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  moodButtonActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  moodEmoji: { fontSize: 22, marginBottom: 2 },
  moodLabel: { fontSize: 10, color: '#666' },
  moodLabelActive: { color: '#4F46E5', fontWeight: '600' },
  dimRow: { marginBottom: 16 },
  dimLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  scoreButtons: { flexDirection: 'row', gap: 6 },
  scoreButton: {
    flex: 1, alignItems: 'center', padding: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  scoreButtonActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  scoreEmoji: { fontSize: 16, marginBottom: 2 },
  scoreButtonText: { fontSize: 9, color: '#666' },
  scoreButtonTextActive: { color: '#4F46E5', fontWeight: '600' },
  textArea: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12,
    fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
  },
  button: { backgroundColor: '#4F46E5', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
