import Link from 'next/link';

export function TrainingSessionsCard() {
  return (
    <Link
      href="/sessions"
      className="block p-6 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Navigate to Training Sessions"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-card-foreground mb-1">
            Training Sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            View and manage your scheduled training sessions
          </p>
        </div>
      </div>
    </Link>
  );
}
