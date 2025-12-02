import Link from 'next/link';

export function TechniquesCard() {
  return (
    <Link
      href="/techniques"
      className="block p-6 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Navigate to Techniques"
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-card-foreground mb-1">
            Techniques
          </h2>
          <p className="text-sm text-muted-foreground">
            Browse and manage your technique library
          </p>
        </div>
      </div>
    </Link>
  );
}
