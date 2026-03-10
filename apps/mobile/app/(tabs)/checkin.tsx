import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { ALL_DIMENSIONS, DIMENSION_LABELS, Dimension, DurationType } from '@life-design/core';
import { supabase } from '../../src/lib/supabase';

export default function CheckInScreen() {
  const [mood, setMood] = useState(5);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [journal, setJournal] = useState('');
  const [loading, setLoading] = useState(false);

  function getMoodEmoji(value: number): string {
    if (value <= 3) return '😔';
    if (value <= 6) return '😐';
    return '😊';
  }

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
    setMood(5);
    setScores({});
    setJournal('');
    setLoading(false);
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Daily Check-in</Text>

      <Text style={styles.label}>Mood {getMoodEmoji(mood)} {mood}/10</Text>
      <View style={styles.sliderRow}>
        <Slider
          style={{ flex: 1 }}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={mood}
          onValueChange={setMood}
          minimumTrackTintColor="#4F46E5"
          maximumTrackTintColor="#E5E7EB"
        />
      </View>

      <Text style={styles.sectionTitle}>Dimensions</Text>
      {ALL_DIMENSIONS.map((dim) => (
        <View key={dim} style={styles.dimRow}>
          <Text style={styles.dimLabel}>{DIMENSION_LABELS[dim]}</Text>
          <View style={styles.scoreButtons}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setScores((prev) => ({ ...prev, [dim]: n }))}
                style={[
                  styles.scoreButton,
                  scores[dim] === n && styles.scoreButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.scoreButtonText,
                    scores[dim] === n && styles.scoreButtonTextActive,
                  ]}
                >
                  {n}
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
  sliderRow: { marginBottom: 16 },
  dimRow: { marginBottom: 16 },
  dimLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  scoreButtons: { flexDirection: 'row', gap: 4 },
  scoreButton: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center',
  },
  scoreButtonActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  scoreButtonText: { fontSize: 11, color: '#333' },
  scoreButtonTextActive: { color: '#fff' },
  textArea: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12,
    fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
  },
  button: { backgroundColor: '#4F46E5', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
