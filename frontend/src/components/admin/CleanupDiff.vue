<script setup lang="ts">
import { computed } from 'vue'
import type { CleanupProposedFields, CleanupRecordSnapshot } from '../../types/cleanup'

const props = defineProps<{
  before: CleanupRecordSnapshot
  after?: CleanupProposedFields | null
  entityType: 'category' | 'technique'
}>()

interface Row { label: string; before: string; after: string; changed: boolean }

const rows = computed<Row[]>(() => {
  const b = props.before
  const a = props.after
  const out: Row[] = []
  const push = (label: string, bVal: string, aVal: string) => {
    out.push({ label, before: bVal, after: aVal, changed: bVal !== aVal })
  }
  const str = (v: unknown) => {
    if (v === undefined || v === null) return '—'
    if (Array.isArray(v)) return v.join(', ') || '—'
    return String(v)
  }
  push('name',        str(b.name),        str(a?.name        ?? b.name))
  push('slug',        str(b.slug),        str(a?.slug        ?? b.slug))
  push('description', str(b.description), str(a?.description ?? b.description))
  if (props.entityType === 'category') {
    push('parentId',  str(b.parentId),    str(a?.parentId    ?? b.parentId))
  } else {
    push('categoryIds', str(b.categoryIds), str(a?.categoryIds ?? b.categoryIds))
  }
  return out
})
</script>

<template>
  <table class="diff-table">
    <thead>
      <tr><th>Field</th><th>Before</th><th>After</th></tr>
    </thead>
    <tbody>
      <tr v-for="r in rows" :key="r.label" :class="{ changed: r.changed }">
        <td class="field">{{ r.label }}</td>
        <td class="before">{{ r.before }}</td>
        <td class="after">{{ r.after }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.diff-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.diff-table th, .diff-table td { padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--surface-border); }
.diff-table th { color: var(--text-color-secondary); font-weight: 500; }
.diff-table .field { color: var(--text-color-secondary); width: 120px; }
.diff-table tr.changed .after { color: #5eead4; font-weight: 500; }
</style>
