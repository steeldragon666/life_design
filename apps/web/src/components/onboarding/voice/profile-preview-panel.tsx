import { ArrowRight, Briefcase, Calendar, CheckCircle2, Heart, MapPin, Target, User } from 'lucide-react';
import GlassContainer from '../glass-container';
import type { ExtractedProfile } from '../hooks/use-onboarding-conversation';

interface ProfilePreviewPanelProps {
  extractedProfile: ExtractedProfile;
  isProcessing: boolean;
  onManualComplete: () => void;
}

export function ProfilePreviewPanel({
  extractedProfile,
  isProcessing,
  onManualComplete,
}: ProfilePreviewPanelProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <GlassContainer size="full" variant="subtle">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-sage-600" />
          <h3 className="text-lg font-semibold text-stone-800">Your Story</h3>
        </div>

        <div className="space-y-3 text-sm">
          {extractedProfile.name ? (
            <div className="flex items-center gap-2 text-stone-700">
              <User className="h-4 w-4 text-sage-500" />
              <span>{extractedProfile.name}</span>
              <CheckCircle2 className="h-3 w-3 text-sage-500" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-stone-400">
              <User className="h-4 w-4" />
              <span className="italic">Your name...</span>
            </div>
          )}

          {extractedProfile.location && (
            <div className="flex items-center gap-2 text-stone-700">
              <MapPin className="h-4 w-4 text-sage-500" />
              <span>{extractedProfile.location}</span>
            </div>
          )}

          {extractedProfile.profession && (
            <div className="flex items-center gap-2 text-stone-700">
              <Briefcase className="h-4 w-4 text-sage-500" />
              <span>{extractedProfile.profession}</span>
            </div>
          )}

          {extractedProfile.interests && extractedProfile.interests.length > 0 && (
            <div className="flex items-start gap-2 text-stone-700">
              <Heart className="h-4 w-4 text-sage-500 mt-0.5" />
              <span>{extractedProfile.interests.join(', ')}</span>
            </div>
          )}

          {extractedProfile.goals && extractedProfile.goals.length > 0 && (
            <div className="flex items-start gap-2 text-stone-700">
              <Target className="h-4 w-4 text-sage-500 mt-0.5" />
              <span>{extractedProfile.goals.length} goal(s) captured</span>
            </div>
          )}
        </div>

        {Object.keys(extractedProfile).length === 0 && (
          <p className="text-stone-400 text-sm italic mt-4">
            As we talk, I&apos;ll gently capture the essence of your story...
          </p>
        )}
      </GlassContainer>

      {extractedProfile.goals && extractedProfile.goals.length > 0 && (
        <GlassContainer size="full" variant="subtle">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-sage-600" />
            <h3 className="text-lg font-semibold text-stone-800">Your Goals</h3>
          </div>
          <div className="space-y-2">
            {extractedProfile.goals.map((goal, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200"
              >
                <span className="text-sm text-stone-700">{goal.title}</span>
                <span className="text-xs text-stone-500 ml-2 capitalize">
                  ({goal.horizon})
                </span>
              </div>
            ))}
          </div>
        </GlassContainer>
      )}

      {extractedProfile.name && (
        <button
          onClick={onManualComplete}
          disabled={isProcessing}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-sage-500 to-sage-600 text-white font-semibold shadow-lg shadow-sage-500/25 hover:shadow-xl hover:shadow-sage-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          Begin My Journey
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
