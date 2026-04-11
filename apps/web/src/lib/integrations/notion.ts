/**
 * Notion integration using Notion API.
 * Requires NOTION_CLIENT_ID and NOTION_CLIENT_SECRET env variables.
 *
 * TODO: SECURITY — Migrate to user_connections table with AES-256-GCM encryption
 * via oauth-manager.ts. Currently stores tokens as plaintext in the legacy
 * integrations table. See: packages/core/src/connectors/oauth-manager.ts
 *
 * Used by the AI mentor system to:
 * - Track project progress and task completion rates
 * - Detect work overload from task volume
 * - Correlate productivity patterns with Career/Growth dimensions
 */

import { createClient } from '@/lib/supabase/server';

export interface NotionProductivityData {
  totalTasks: number;
  completedToday: number;
  overdueCount: number;
  activeProjects: string[];
  recentPages: Array<{
    title: string;
    lastEdited: string;
  }>;
}

async function getAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'notion')
    .eq('status', 'connected')
    .single();

  return data?.access_token_encrypted ?? null;
}

export async function getNotionProductivity(userId: string): Promise<NotionProductivityData | null> {
  const token = await getAccessToken(userId);
  if (!token) return null;

  try {
    // Search for databases (task trackers)
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 20,
      }),
    });

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const pages = (searchData.results ?? []) as Array<Record<string, unknown>>;

    const recentPages = pages.slice(0, 5).map((page) => {
      const props = page.properties as Record<string, Record<string, unknown>> | undefined;
      const titleProp = props?.title ?? props?.Name ?? props?.name;
      let title = 'Untitled';
      if (titleProp && Array.isArray((titleProp as Record<string, unknown>).title)) {
        const titleArr = (titleProp as Record<string, unknown>).title as Array<{ plain_text: string }>;
        title = titleArr.map((t) => t.plain_text).join('') || 'Untitled';
      }

      return {
        title,
        lastEdited: page.last_edited_time as string ?? '',
      };
    });

    // Count tasks by checking for Status/checkbox properties
    let completedToday = 0;
    let overdueCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    for (const page of pages) {
      const props = page.properties as Record<string, Record<string, unknown>> | undefined;
      if (!props) continue;

      // Check for checkbox-style completion
      const statusProp = props.Status ?? props.status ?? props.Done ?? props.done;
      if (statusProp) {
        const lastEdited = (page.last_edited_time as string ?? '').split('T')[0];
        if (lastEdited === todayStr) {
          const statusType = (statusProp as Record<string, unknown>).type;
          if (statusType === 'checkbox' && (statusProp as Record<string, unknown>).checkbox === true) {
            completedToday++;
          }
          if (statusType === 'status') {
            const statusObj = (statusProp as Record<string, unknown>).status as Record<string, unknown> | null;
            if (statusObj?.name === 'Done' || statusObj?.name === 'Completed') {
              completedToday++;
            }
          }
        }
      }

      // Check for overdue items
      const dueProp = props.Due ?? props.due ?? props['Due Date'] ?? props.deadline;
      if (dueProp) {
        const dateObj = (dueProp as Record<string, unknown>).date as Record<string, unknown> | null;
        if (dateObj?.start && (dateObj.start as string) < todayStr) {
          overdueCount++;
        }
      }
    }

    const activeProjects = recentPages
      .filter((p) => p.lastEdited > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .map((p) => p.title);

    return {
      totalTasks: pages.length,
      completedToday,
      overdueCount,
      activeProjects,
      recentPages,
    };
  } catch {
    return null;
  }
}

/**
 * Build Notion context string for AI mentor system prompt.
 */
export async function buildNotionContext(userId: string): Promise<string | null> {
  const data = await getNotionProductivity(userId);
  if (!data) return null;

  const lines: string[] = ['\nNotion Productivity:'];

  lines.push(`- Tasks completed today: ${data.completedToday}`);

  if (data.overdueCount > 0) {
    lines.push(`- ALERT: ${data.overdueCount} overdue task${data.overdueCount > 1 ? 's' : ''} — consider helping prioritize`);
  }

  if (data.activeProjects.length > 0) {
    lines.push(`- Active projects: ${data.activeProjects.join(', ')}`);
  }

  if (data.recentPages.length > 0) {
    lines.push(`- Recently edited: ${data.recentPages.slice(0, 3).map((p) => `"${p.title}"`).join(', ')}`);
  }

  return lines.join('\n');
}
