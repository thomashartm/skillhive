/**
 * Barrel export for curricula components
 * Provides a clean public API for importing curricula-related functionality
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Utilities
export * from './utils';

// Icons
export * from './icons';

// Hooks
export * from './hooks/useCurriculaList';
export * from './hooks/useCurriculumDetail';
export * from './hooks/useCurriculumElements';

// Buttons
export * from './buttons/AddElementButton';
export * from './buttons/DragHandle';
export * from './buttons/ElementActions';

// Element components
export * from './elements/InlineTextEditor';
export * from './elements/ElementContent';
export * from './elements/ElementPanel';
export * from './elements/ElementList';
export * from './elements/CurriculumElementsSection';

// Modals
export * from './modals/TechniqueSelectionModal';
export * from './modals/AssetSelectionModal';
export * from './modals/TextElementModal';
