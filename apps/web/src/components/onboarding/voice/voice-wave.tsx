import { cn } from '@/lib/utils';

interface VoiceWaveProps {
  isActive: boolean;
}

export function VoiceWave({ isActive }: VoiceWaveProps) {
  return (
    <div className="flex items-center gap-[3px] h-6">
      {[1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          className={cn(
            'w-[3px] rounded-sm transition-all duration-300',
            isActive ? 'bg-gradient-to-t from-cyan-400 to-teal-300' : 'bg-white/20'
          )}
          style={{
            height: isActive ? `${[8, 16, 12, 20, 10][index - 1]}px` : '4px',
            animationDelay: `${(index - 1) * 0.1}s`,
            animation: isActive
              ? `voiceWave 1s ease-in-out infinite ${(index - 1) * 0.1}s`
              : 'none',
          }}
        />
      ))}
    </div>
  );
}
