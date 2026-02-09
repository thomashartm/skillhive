<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import type { Curriculum } from '../types'
import { useApi } from '../composables/useApi'

const router = useRouter()
const api = useApi()

const curricula = ref<Curriculum[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    curricula.value = await api.get<Curriculum[]>('/api/v1/curricula/public')
  } finally {
    loading.value = false
  }
})

const handleView = (curriculum: Curriculum) => {
  router.push(`/curricula/${curriculum.id}`)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="public-curricula-view">
    <div class="view-header">
      <h1 class="view-title">Public Curricula</h1>
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
        size="small"
        @click="router.push('/curricula')"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <DataTable
      v-else
      :value="curricula"
      striped-rows
      paginator
      :rows="10"
      data-key="id"
      class="public-curriculum-list"
    >
      <template #empty>
        <div class="text-center py-8 text-slate-400">
          No public curricula found yet.
        </div>
      </template>

      <Column field="title" header="Title" sortable>
        <template #body="{ data }">
          <a class="public-name" @click.prevent="handleView(data)">
            {{ data.title }}
          </a>
        </template>
      </Column>

      <Column field="description" header="Description">
        <template #body="{ data }">
          <span class="text-slate-400 text-sm block truncate max-w-md">
            {{ data.description || '—' }}
          </span>
        </template>
      </Column>

      <Column field="elementCount" header="Elements" style="width: 100px">
        <template #body="{ data }">
          <Tag :value="String(data.elementCount || 0)" severity="info" />
        </template>
      </Column>

      <Column field="updatedAt" header="Updated" sortable style="width: 120px">
        <template #body="{ data }">
          <span class="text-slate-500 text-sm">{{ formatDate(data.updatedAt) }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.public-curricula-view {
}

.public-curriculum-list {
  width: 100%;
}

.public-name {
  font-weight: 400;
  font-size: 0.875rem;
  color: #e2e8f0;
  cursor: pointer;
}

.public-name:hover {
  color: var(--primary-color);
}
</style>
