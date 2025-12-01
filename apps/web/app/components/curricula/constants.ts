/**
 * Constants for curricula feature
 */

export const CURRICULUM_LIMITS = {
  MAX_ELEMENTS: 50,
  MAX_TITLE_LENGTH: 255,
};

export const metadata = {
  title: 'Curricula - SkillHive',
  description: 'Create and organize your training curricula',
};

export const sidebarItems = [
  { href: '/curricula', label: 'All Curricula' },
  { href: '/curricula/my-curricula', label: 'My Curricula' },
  { href: '/curricula/shared', label: 'Shared with Me' },
  { href: '/curricula/create', label: 'Create Curriculum' },
];
