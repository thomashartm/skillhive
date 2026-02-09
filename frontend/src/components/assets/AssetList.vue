<template>
  <DataTable
    :value="assets"
    :loading="loading"
    striped-rows
    paginator
    :rows="10"
    :rows-per-page-options="[10, 25, 50]"
    data-key="id"
    class="asset-list"
  >
    <template #empty>
      <div class="text-center py-8 text-slate-400">
        <i class="pi pi-inbox text-4xl mb-3 block" />
        <p>No assets found</p>
      </div>
    </template>

    <Column header="" style="width: 70px">
      <template #body="{ data }">
        <img
          v-if="data.thumbnailUrl"
          :src="data.thumbnailUrl"
          :alt="data.title"
          class="w-14 h-10 object-cover"
        />
        <div v-else class="w-14 h-10 bg-white/5 flex items-center justify-center">
          <i class="pi pi-link text-slate-500 text-xs" />
        </div>
      </template>
    </Column>

    <Column field="title" header="Title" sortable>
      <template #body="{ data }">
        <a class="asset-name" @click.prevent="emit('view', data)">
          {{ data.title }}
        </a>
      </template>
    </Column>

    <Column header="Techniques" style="width: 180px">
      <template #body="{ data }">
        <div class="flex flex-wrap gap-1">
          <a
            v-for="tech in resolveTechniques(data.techniqueIds)"
            :key="tech.id"
            class="technique-chip"
            @click.stop="emit('viewTechnique', tech.id)"
          >
            {{ tech.name }}
          </a>
          <span v-if="!data.techniqueIds?.length" class="text-xs text-slate-500">&mdash;</span>
        </div>
      </template>
    </Column>

    <Column header="Tags" style="width: 160px">
      <template #body="{ data }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="tag in resolveTags(data.tagIds)"
            :key="tag.id"
            class="tag-chip"
            :style="tag.color ? { borderColor: tag.color, color: tag.color } : {}"
          >
            {{ tag.name }}
          </span>
          <span v-if="!data.tagIds?.length" class="text-xs text-slate-500">&mdash;</span>
        </div>
      </template>
    </Column>

    <Column field="type" header="Type" sortable style="width: 90px">
      <template #body="{ data }">
        <span class="text-xs text-slate-400">{{ data.type }}</span>
      </template>
    </Column>

    <Column v-if="authStore.canEdit" header="" style="width: 80px">
      <template #body="{ data }">
        <div class="flex gap-1 justify-end">
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            size="small"
            text
            @click="emit('edit', data)"
            v-tooltip.top="'Edit'"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            text
            @click="emit('delete', data)"
            v-tooltip.top="'Delete'"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import type { Asset, Technique, Tag } from '../../types'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

interface Props {
  assets: Asset[]
  techniques: Technique[]
  tags: Tag[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [asset: Asset]
  delete: [asset: Asset]
  view: [asset: Asset]
  viewTechnique: [techniqueId: string]
}>()

const resolveTechniques = (techniqueIds: string[] | undefined): Technique[] => {
  if (!techniqueIds?.length) return []
  return props.techniques.filter(t => techniqueIds.includes(t.id))
}

const resolveTags = (tagIds: string[] | undefined): Tag[] => {
  if (!tagIds?.length) return []
  return props.tags.filter(t => tagIds.includes(t.id))
}
</script>

<style scoped>
.asset-list :deep(.p-datatable-wrapper) {
  overflow-x: auto;
}

.asset-name {
  font-weight: 400;
  font-size: 0.875rem;
  color: #e2e8f0;
  cursor: pointer;
}

.asset-name:hover {
  color: var(--primary-color);
}

.technique-chip {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  font-size: 0.65rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.technique-chip:hover {
  color: var(--primary-color);
}

.tag-chip {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  font-size: 0.65rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  white-space: nowrap;
}
</style>
