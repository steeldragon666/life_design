import { CheckCircle2, Play, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass-container';

interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: string;
  description: string;
  previewText: string;
}

interface VoiceOptionCardProps {
  voice: VoiceOption;
  isSelected: boolean;
  supportsSpeechSynthesis: boolean;
  onPreview: () => void;
  onSelect: () => void;
  onPreviewUnavailable: () => void;
}

export function VoiceOptionCard({
  voice,
  isSelected,
  supportsSpeechSynthesis,
  onPreview,
  onSelect,
  onPreviewUnavailable,
}: VoiceOptionCardProps) {
  return (
    <GlassCard
      isActive={isSelected}
      className={cn(
        'relative p-6 transition-all duration-500',
        isSelected && 'ring-2 ring-sage-500/30'
      )}
    >
      {isSelected && (
        <div className="absolute top-4 right-4">
          <div className="h-6 w-6 rounded-full bg-sage-500 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        </div>
      )}

      <div
        className={cn(
          'h-16 w-16 rounded-full flex items-center justify-center mb-4',
          voice.gender === 'female'
            ? 'bg-gradient-to-br from-pink-100 to-purple-100'
            : 'bg-gradient-to-br from-sage-100 to-teal-100'
        )}
      >
        <User
          className={cn(
            'h-8 w-8',
            voice.gender === 'female' ? 'text-pink-500' : 'text-sage-600'
          )}
        />
      </div>

      <h3 className="text-lg font-semibold text-stone-800 mb-1">{voice.name}</h3>
      <p className="text-xs text-stone-500 mb-1 uppercase tracking-wider">
        {voice.accent} &bull; {voice.gender}
      </p>
      <p className="text-sm text-stone-500 leading-relaxed mb-4">{voice.description}</p>

      <div className="flex gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation();
            if (!supportsSpeechSynthesis) {
              onPreviewUnavailable();
              return;
            }
            onPreview();
          }}
          className="flex-1 py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          disabled={!supportsSpeechSynthesis}
        >
          <Play className="w-4 h-4" />
          Preview
        </button>
        <button
          onClick={onSelect}
          className={cn(
            'flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors',
            isSelected
              ? 'bg-sage-100 text-sage-600'
              : 'bg-sage-600 hover:bg-sage-500 text-white'
          )}
        >
          {isSelected ? 'Selected' : 'Choose'}
        </button>
      </div>
    </GlassCard>
  );
}
