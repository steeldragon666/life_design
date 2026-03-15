'use client';

import { useState, useEffect, useRef } from 'react';

interface SimilarEntry {
  checkin_id: string;
  checkin_date: string;
  journal_entry: string;
  similarity: number;
}

interface SimilarEntriesProps {
  /** Current journal text to find similar entries for */
  currentText: string;
  /** Embedding function from useAILocal */
  embed: (text: string) => Promise<Float32Array>;
  /** Supabase RPC call to find_similar_journal_entries */
  findSimilar: (embedding: Float32Array) => Promise<SimilarEntry[]>;
  /** Whether the AI client is ready */
  isReady: boolean;
  /** Minimum text length before searching */
  minLength?: number;
}

/**
 * Shows the 3 most semantically similar past journal entries
 * below the journal input during check-in.
 * Debounces 800ms to avoid excessive embedding calls.
 */
export default function SimilarEntries({
  currentText,
  embed,
  findSimilar,
  isReady,
  minLength = 40,
}: SimilarEntriesProps) {
  const [entries, setEntries] = useState<SimilarEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!isReady || currentText.trim().length < minLength) {
      setEntries([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const generation = ++generationRef.current;
      setIsSearching(true);
      try {
        const embedding = await embed(currentText);
        if (generation !== generationRef.current) return;

        const similar = await findSimilar(embedding);
        if (generation === generationRef.current) {
          setEntries(similar);
        }
      } catch {
        // Silently fail — similar entries are optional enhancement
      } finally {
        if (generation === generationRef.current) {
          setIsSearching(false);
        }
      }
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentText, embed, findSimilar, isReady, minLength]);

  if (!entries.length && !isSearching) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-white/40">
          Similar past entries
        </span>
        {isSearching && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
        )}
      </div>
      {entries.map((entry) => (
        <div
          key={entry.checkin_id}
          className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-white/30">
              {new Date(entry.checkin_date).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-[10px] text-indigo-400/60">
              {Math.round(entry.similarity * 100)}% similar
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-white/50">
            {entry.journal_entry}
          </p>
        </div>
      ))}
    </div>
  );
}
