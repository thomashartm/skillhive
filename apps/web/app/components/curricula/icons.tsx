/**
 * Icon components for curricula feature
 */

import React from 'react';

export function IconDrag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export function IconTechnique(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M2 4h12v2H2zM2 10h12v2H2z" />
    </svg>
  );
}

export function IconVideo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M2 3h8v10H2zM11 6l3-2v8l-3-2z" />
    </svg>
  );
}

export function IconText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M2 3h12v2H2zM2 7h8v2H2zM2 11h6v2H2z" />
    </svg>
  );
}

export function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M3 4h10v1H3zM5 5h6l-.7 8H5.7L5 5zM6 2h4v1H6z" />
    </svg>
  );
}

export function IconEdit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M2 12.5V10l7.5-7.5 2 2L4 12H2zM11 2l2 2" />
    </svg>
  );
}
