interface LabelProps {
  isPublic: boolean;
  title: string;
}
//{curriculum.isPublic ? 'Public' : 'Private'}
export function PublicPrivateLabel({ isPublic, title }: LabelProps) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs ${
        isPublic
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      }`}
    >
      {title}
    </span>
  );
}
