import { z } from 'zod'

export const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().default(''),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .optional()
    .nullable(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().default(''),
  parentId: z.string().nullable().optional(),
})

export const techniqueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  categoryIds: z.array(z.string()).optional().default([]),
  tagIds: z.array(z.string()).optional().default([]),
})

export const assetSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(2000).optional().default(''),
  type: z.enum(['video', 'web', 'image']).default('video'),
  videoType: z.enum(['short', 'full', 'instructional', 'seminar']).nullable().optional(),
  originator: z.string().max(200).optional().default(''),
  techniqueIds: z.array(z.string()).optional().default([]),
  tagIds: z.array(z.string()).optional().default([]),
})

export const curriculumSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().default(''),
  isPublic: z.boolean().optional().default(false),
})

export const curriculumElementSchema = z.object({
  type: z.enum(['technique', 'asset', 'text', 'image', 'list']),
  techniqueId: z.string().nullable().optional(),
  assetId: z.string().nullable().optional(),
  title: z.string().max(300).nullable().optional(),
  details: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  duration: z.string().max(50).nullable().optional(),
  items: z.array(z.string().max(500)).max(100).optional(),
})

export type TagFormData = z.infer<typeof tagSchema>
export type CategoryFormData = z.infer<typeof categorySchema>
export type TechniqueFormData = z.infer<typeof techniqueSchema>
export type AssetFormData = z.infer<typeof assetSchema>
export type CurriculumFormData = z.infer<typeof curriculumSchema>
export type CurriculumElementFormData = z.infer<typeof curriculumElementSchema>
