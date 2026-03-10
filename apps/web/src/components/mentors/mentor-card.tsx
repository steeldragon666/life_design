import Link from 'next/link';

interface MentorInfo {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface MentorCardProps {
  mentor: MentorInfo;
  isActive?: boolean;
  userMentorId?: string;
  onActivate: (mentorId: string) => void;
}

export default function MentorCard({
  mentor,
  isActive,
  userMentorId,
  onActivate,
}: MentorCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold">{mentor.name}</h3>
      <p className="mt-2 text-gray-600">{mentor.description}</p>

      <div className="mt-4 flex items-center gap-3">
        {isActive ? (
          <>
            <span className="text-sm font-medium text-green-600">Active</span>
            {userMentorId && (
              <Link
                href={`/mentors/${userMentorId}/chat`}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                Chat
              </Link>
            )}
          </>
        ) : (
          <button
            onClick={() => onActivate(mentor.id)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Activate
          </button>
        )}
      </div>
    </div>
  );
}
