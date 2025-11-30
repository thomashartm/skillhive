export interface Technique {
  id: number;
  disciplineId: number;
  name: string;
  slug: string;
  description: string | null;
  categoryIds: number[];
  tagIds: number[];
  referenceAssets: any[];
  createdAt: string;
  updatedAt: string;
}

interface TechniqueProps {
  disciplineId: number;
  technique: Technique;
  editHandler: () => void;
  deleteHandler: () => void;
}

export function TechniqueTile({
  disciplineId,
  technique,
  editHandler,
  deleteHandler,
}: TechniqueProps) {
  return (
    <div
      key={technique.id}
      className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground mb-2">{technique.name}</h3>
          {technique.description && (
            <div
              className="text-muted-foreground mb-3 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: technique.description }}
            />
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {technique.categoryIds.length > 0 && (
              <div>
                <span className="text-muted-foreground">Categories: </span>
                <span className="text-foreground">
                  {technique.categoryIds
                    .map((id) => categories.find((c) => c.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}

            {technique.tagIds.length > 0 && (
              <div>
                <span className="text-muted-foreground">Tags: </span>
                <div className="inline-flex flex-wrap gap-1">
                  {technique.tagIds.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    return tag ? (
                      <span
                        key={tagId}
                        className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
                        style={tag.color ? { backgroundColor: tag.color } : {}}
                      >
                        {tag.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {technique.referenceAssets && technique.referenceAssets.length > 0 && (
              <div className="mt-3">
                <span className="text-muted-foreground font-medium">Reference Assets:</span>
                <ul className="mt-2 space-y-1">
                  {technique.referenceAssets.map((asset: any) => (
                    <li key={asset.id} className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-4 h-4 text-muted-foreground flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {asset.title || asset.url}
                      </a>
                      {asset.originator && (
                        <span className="text-muted-foreground text-xs">by {asset.originator}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <EditHandlerButton onClick={editHandler} title={title} />
          <button
            onClick={deleteHandler}
            className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
