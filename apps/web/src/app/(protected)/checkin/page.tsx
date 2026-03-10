import { createClient } from '@/lib/supabase/server';
import { getCheckInByDate } from '@/lib/services/checkin-service';
import CheckInClient from './checkin-client';

export default async function CheckInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = user
    ? await getCheckInByDate(user.id, today)
    : { data: null };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Daily Check-in</h1>
      {existing ? (
        <p className="text-gray-600">
          You&apos;ve already completed your check-in for today. Come back tomorrow!
        </p>
      ) : (
        <CheckInClient date={today} />
      )}
    </div>
  );
}
