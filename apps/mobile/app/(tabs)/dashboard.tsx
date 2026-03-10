import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ALL_DIMENSIONS, DIMENSION_LABELS, Dimension, computeOverallScore, computeStreak } from '@life-design/core';
import { supabase } from '../../src/lib/supabase';

export default function DashboardScreen() {
  const [overallScore, setOverallScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [scores, setScores] = useState<{ dimension: Dimension; score: number }[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get latest check-in scores
    const { data: checkins } = await supabase
      .from('checkins')
      .select('id, date, dimension_scores(dimension, score)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1);

    if (checkins && checkins.length > 0) {
      const dimScores = (checkins[0] as { dimension_scores: { dimension: Dimension; score: number }[] }).dimension_scores ?? [];
      setScores(dimScores);
      if (dimScores.length > 0) {
        setOverallScore(computeOverallScore(dimScores));
      }
    }

    // Get streak
    const { data: streakData } = await supabase
      .from('checkins')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(90);

    if (streakData) {
      const dates = streakData.map((c: { date: string }) => c.date);
      setStreak(computeStreak(dates, new Date().toISOString().slice(0, 10)));
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{overallScore.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Overall</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak > 0 ? `${streak} 🔥` : '0'}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Dimension Scores</Text>
      {ALL_DIMENSIONS.map((dim) => {
        const score = scores.find((s) => s.dimension === dim)?.score ?? 0;
        return (
          <View key={dim} style={styles.scoreRow}>
            <Text style={styles.dimLabel}>{DIMENSION_LABELS[dim]}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${score * 10}%` }]} />
            </View>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, paddingVertical: 16 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#4F46E5' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dimLabel: { width: 100, fontSize: 14 },
  barContainer: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginHorizontal: 8 },
  bar: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 4 },
  scoreText: { width: 24, textAlign: 'right', fontSize: 14, fontWeight: '600' },
});
