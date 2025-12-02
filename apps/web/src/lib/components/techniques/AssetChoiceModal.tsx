'use client';

/**
 * Modal for choosing between searching existing assets or creating a new one
 */

interface AssetChoiceModalProps {
  onSearchExisting: () => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export function AssetChoiceModal({ onSearchExisting, onCreateNew, onClose }: AssetChoiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Add Reference Asset</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Choose whether to reference an existing asset or create a new one.
        </p>

        <div className="space-y-3">
          {/* Search Existing Asset Option */}
          <button
            type="button"
            onClick={onSearchExisting}
            className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">Search Existing Assets</h3>
                <p className="text-sm text-muted-foreground">
                  Find and reference an asset that already exists in your library
                </p>
              </div>
            </div>
          </button>

          {/* Create New Asset Option */}
          <button
            type="button"
            onClick={onCreateNew}
            className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">Create New Asset</h3>
                <p className="text-sm text-muted-foreground">
                  Add a new reference asset with a video link, web page, or image
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
