'use client';

import Link from 'next/link';

import { HiPencil, HiEye, HiTrash } from 'react-icons/hi';
import { HiGlobeAlt, HiEyeSlash, HiDocumentPlus } from 'react-icons/hi2';

interface ActionLinkProps {
  prefix: string;
  id: string;
  title: string;
}

interface CreateLinkProps {
  path: string;
  title: string;
}

interface ActionHandlerProps {
  onClick: () => void;
  title: string;
  isPublic?: boolean;
}

export function EditActionLink({ prefix, id, title }: ActionLinkProps) {
  return (
    <Link
      href={`/${prefix}/${id}/edit`}
      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
      title={title}
    >
      <HiPencil className="w-5 h-5" />
    </Link>
  );
}

export function ViewActionLink({ prefix, id, title }: ActionLinkProps) {
  return (
    <Link
      href={`/${prefix}/${id}`}
      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
      title={title}
    >
      <HiEye className="w-5 h-5" />
    </Link>
  );
}

export function ToogleVisibilityButton({ onClick, title, isPublic }: ActionHandlerProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
      title={title}
    >
      {isPublic ? <HiEyeSlash className="w-5 h-5" /> : <HiGlobeAlt className="w-5 h-5" />}
    </button>
  );
}

export function DeleteButton({ onClick, title }: ActionHandlerProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
      title={title}
    >
      <HiTrash className="w-5 h-5" />
    </button>
  );
}

export function CreateLink({ path, title }: CreateLinkProps) {
  return (
    <Link
      href={path}
      className="inline-block px-6 py-3 rounded-md hover:bg-primary/90"
      title={title}
    >
      <HiDocumentPlus className="w-5 h-5" />
    </Link>
  );
}
