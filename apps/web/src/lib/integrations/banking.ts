/**
 * Open Banking integration using UK Open Banking Standard.
 * Requires OPENBANKING_CLIENT_ID and OPENBANKING_CLIENT_SECRET env variables.
 * Uses a registered AISP (Account Information Service Provider) connection.
 *
 * TODO: SECURITY — Migrate to user_connections table with AES-256-GCM encryption
 * via oauth-manager.ts. Currently stores tokens as plaintext in the legacy
 * integrations table. See: packages/core/src/connectors/oauth-manager.ts
 *
 * Used by the AI mentor system to:
 * - Track spending patterns and correlate with Finance dimension
 * - Detect unusual spending spikes
 * - Monitor saving progress toward financial goals
 * - Provide budget-aware lifestyle suggestions
 */

import { createClient } from '@/lib/supabase/server';

export interface SpendingSummary {
  totalSpentToday: number;
  totalSpentThisWeek: number;
  totalSpentThisMonth: number;
  topCategories: Array<{
    category: string;
    amount: number;
  }>;
  unusualSpending: boolean;
  currency: string;
}

export interface AccountBalance {
  available: number;
  current: number;
  currency: string;
}

async function getAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at, metadata')
    .eq('user_id', userId)
    .eq('provider', 'banking')
    .eq('status', 'connected')
    .single();

  if (!data) return null;

  // Refresh if expired
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    const refreshed = await refreshBankingToken(data.refresh_token_encrypted);
    if (!refreshed) return null;

    await supabase
      .from('integrations')
      .update({
        access_token_encrypted: refreshed.access_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'banking');

    return refreshed.access_token;
  }

  return data.access_token_encrypted;
}

async function refreshBankingToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.OPENBANKING_CLIENT_ID;
  const clientSecret = process.env.OPENBANKING_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(process.env.OPENBANKING_TOKEN_URL ?? 'https://ob.example.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getSpendingSummary(userId: string): Promise<SpendingSummary | null> {
  const token = await getAccessToken(userId);
  if (!token) return null;

  const supabase = await createClient();

  // Get account ID from integration metadata
  const { data: integration } = await supabase
    .from('integrations')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', 'banking')
    .single();

  const accountId = (integration?.metadata as Record<string, string>)?.account_id;
  if (!accountId) return null;

  try {
    const apiBase = process.env.OPENBANKING_API_URL ?? 'https://ob.example.com';
    const res = await fetch(
      `${apiBase}/accounts/${accountId}/transactions?fromBookingDateTime=${getMonthStart()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-fapi-financial-id': process.env.OPENBANKING_FINANCIAL_ID ?? '',
        },
      },
    );

    if (!res.ok) return null;
    const data = await res.json();

    const transactions = (data.Data?.Transaction ?? []) as Array<Record<string, unknown>>;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let totalSpentToday = 0;
    let totalSpentThisWeek = 0;
    let totalSpentThisMonth = 0;
    const categoryTotals: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.CreditDebitIndicator !== 'Debit') continue;
      const amount = parseFloat((tx.Amount as Record<string, string>)?.Amount ?? '0');
      const date = ((tx.BookingDateTime as string) ?? '').split('T')[0];
      const category = (tx.TransactionInformation as string) ?? 'Other';

      totalSpentThisMonth += amount;
      if (date >= weekAgo) totalSpentThisWeek += amount;
      if (date === todayStr) totalSpentToday += amount;

      categoryTotals[category] = (categoryTotals[category] ?? 0) + amount;
    }

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }));

    // Detect unusual spending (more than 1.5x average daily)
    const daysInMonth = now.getDate();
    const avgDaily = daysInMonth > 0 ? totalSpentThisMonth / daysInMonth : 0;
    const unusualSpending = totalSpentToday > avgDaily * 1.5 && totalSpentToday > 50;

    const currency = (data.Data?.Transaction?.[0]?.Amount as Record<string, string>)?.Currency ?? 'GBP';

    return {
      totalSpentToday: Math.round(totalSpentToday * 100) / 100,
      totalSpentThisWeek: Math.round(totalSpentThisWeek * 100) / 100,
      totalSpentThisMonth: Math.round(totalSpentThisMonth * 100) / 100,
      topCategories,
      unusualSpending,
      currency,
    };
  } catch {
    return null;
  }
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Build Open Banking context string for AI mentor system prompt.
 * NOTE: Only includes aggregated summaries — never individual transaction details.
 */
export async function buildBankingContext(userId: string): Promise<string | null> {
  const data = await getSpendingSummary(userId);
  if (!data) return null;

  const lines: string[] = ['\nFinancial Overview:'];

  lines.push(`- Spent today: ${data.currency} ${data.totalSpentToday}`);
  lines.push(`- Spent this week: ${data.currency} ${data.totalSpentThisWeek}`);
  lines.push(`- Spent this month: ${data.currency} ${data.totalSpentThisMonth}`);

  if (data.topCategories.length > 0) {
    lines.push(`- Top spending: ${data.topCategories.slice(0, 3).map((c) => `${c.category} (${data.currency} ${c.amount})`).join(', ')}`);
  }

  if (data.unusualSpending) {
    lines.push('- ALERT: Spending today is notably higher than average — gently check if this is planned or impulsive');
  }

  lines.push('- IMPORTANT: Never share exact financial figures with the user unless they ask. Use general terms like "higher than usual" or "on track".');

  return lines.join('\n');
}
