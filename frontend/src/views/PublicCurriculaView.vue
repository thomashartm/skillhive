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
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Public Curricula</h2>
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
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
      class="p-datatable-sm"
    >
      <template #empty>
        <div class="text-center py-8 text-gray-500">
          No public curricula found yet.
        </div>
      </template>

      <Column field="title" header="Title" sortable>
        <template #body="{ data }">
          <button
            class="font-semibold text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0"
            @click="handleView(data)"
          >
            {{ data.title }}
          </button>
        </template>
      </Column>

      <Column field="description" header="Description">
        <template #body="{ data }">
          <span class="text-gray-600 text-sm">
            {{ data.description ? data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') : '—' }}
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
          <span class="text-gray-500 text-sm">{{ formatDate(data.updatedAt) }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.public-curricula-view {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
