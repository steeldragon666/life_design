/**
 * GET  /api/companion/memory?layer=episodic|semantic|relational|therapeutic|all
 * DELETE /api/companion/memory?layer=episodic|semantic|relational|therapeutic|all
 *
 * Memory management endpoints for the DRM companion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ── Layer helpers ─────────────────────────────────────────────────────────────

type MemoryLayer = 'episodic' | 'semantic' | 'relational' | 'therapeutic' | 'all';

const VALID_LAYERS: ReadonlySet<MemoryLayer> = new Set([
  'episodic',
  'semantic',
  'relational',
  'therapeutic',
  'all',
]);

const LAYER_TO_TABLE: Record<Exclude<MemoryLayer, 'all'>, string> = {
  episodic: 'episodic_memory',
  semantic: 'semantic_memory',
  relational: 'relational_memory',
  therapeutic: 'therapeutic_memory',
};

function parseLayer(raw: string | null): MemoryLayer | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (VALID_LAYERS.has(lower as MemoryLayer)) return lower as MemoryLayer;
  return null;
}

function resolveTableNames(layer: MemoryLayer): Array<Exclude<MemoryLayer, 'all'>> {
  if (layer === 'all') {
    return ['episodic', 'semantic', 'relational', 'therapeutic'];
  }
  return [layer];
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rawLayer = request.nextUrl.searchParams.get('layer');
  const layer = parseLayer(rawLayer);
  if (!layer) {
    return NextResponse.json(
      {
        error:
          'layer query parameter is required. Valid values: episodic, semantic, relational, therapeutic, all',
      },
      { status: 400 },
    );
  }

  const serviceClient = createServiceRoleClient();
  const layers = resolveTableNames(layer);

  const results = await Promise.allSettled(
    layers.map((l) =>
      serviceClient
        .from(LAYER_TO_TABLE[l])
        .select('*')
        .eq('user_id', user.id)
        .then(({ data, error }) => ({ layer: l, data, error })),
    ),
  );

  const memory: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(String(result.reason));
      continue;
    }
    const { layer: l, data, error } = result.value;
    if (error) {
      errors.push(`${l}: ${error.message}`);
    } else {
      memory[l] = data;
    }
  }

  if (errors.length > 0) {
    console.error('[companion/memory GET] Errors:', errors);
    // Return partial data with error context rather than a hard 500
    return NextResponse.json({ memory, errors }, { status: 207 });
  }

  return NextResponse.json({ memory });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rawLayer = request.nextUrl.searchParams.get('layer');
  const layer = parseLayer(rawLayer);
  if (!layer) {
    return NextResponse.json(
      {
        error:
          'layer query parameter is required. Valid values: episodic, semantic, relational, therapeutic, all',
      },
      { status: 400 },
    );
  }

  const serviceClient = createServiceRoleClient();
  const layers = resolveTableNames(layer);

  const results = await Promise.allSettled(
    layers.map((l) =>
      serviceClient
        .from(LAYER_TO_TABLE[l])
        .delete()
        .eq('user_id', user.id)
        .then(({ error }) => ({ layer: l, error })),
    ),
  );

  const deleted: string[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(String(result.reason));
      continue;
    }
    const { layer: l, error } = result.value;
    if (error) {
      errors.push(`${l}: ${error.message}`);
    } else {
      deleted.push(l);
    }
  }

  if (errors.length > 0) {
    console.error('[companion/memory DELETE] Errors:', errors);
    return NextResponse.json({ deleted, errors }, { status: 207 });
  }

  return NextResponse.json({ deleted });
}
