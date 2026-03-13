import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ALL_DIMENSIONS, DIMENSION_LABELS, Dimension } from '@life-design/core';
import DimensionDetailClient from './dimension-detail-client';

interface PageProps {
  params: Promise<{ dimension: string }>;
}

export async function generateStaticParams() {
  return ALL_DIMENSIONS.map((dim) => ({ dimension: dim }));
}

export async function generateMetadata({ params }: PageProps) {
  const { dimension } = await params;
  const label = DIMENSION_LABELS[dimension as Dimension];
  if (!label) return { title: 'Dimension — Life Design OS' };
  return {
    title: `${label} — Life Design OS`,
    description: `Deep dive into your ${label.toLowerCase()} dimension: score history, feature contributions, cross-dimension correlations, forecasts, and recommended actions.`,
  };
}

/**
 * Server component for the Dimension Detail page.
 *
 * Validates the dynamic `dimension` parameter against the canonical list,
 * fetches the user's latest score for this dimension from Supabase, and
 * passes all data to the client component for rendering.
 *
 * Real Supabase queries can expand the `serverData` object as tables are
 * populated. The client component uses mock data for any missing fields.
 */
export default async function DimensionDetailPage({ params }: PageProps) {
  const { dimension } = await params;

  // Validate dimension parameter
  if (!ALL_DIMENSIONS.includes(dimension as Dimension)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch latest dimension score
  const { data: latestScoreRow } = await supabase
    .from('dimension_scores')
    .select('score, created_at')
    .eq('user_id', user.id)
    .eq('dimension', dimension)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch last 90 days of score history for this dimension
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: scoreHistory } = await supabase
    .from('dimension_scores')
    .select('score, created_at')
    .eq('user_id', user.id)
    .eq('dimension', dimension)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  // Fetch total checkin count for cold-start detection
  const { count: totalCheckins } = await supabase
    .from('checkins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const serverData = {
    currentScore: (latestScoreRow?.score as number) ?? null,
    scoreHistory: (scoreHistory ?? []) as { score: number; created_at: string }[],
    totalCheckins: totalCheckins ?? 0,
  };

  return (
    <DimensionDetailClient
      dimension={dimension as Dimension}
      serverData={serverData}
    />
  );
}
