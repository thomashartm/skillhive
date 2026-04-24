<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useCleanupStore } from '../../stores/cleanup'
import type { CleanupEntityType, CleanupTemplate } from '../../types/cleanup'

const props = defineProps<{
  visible: boolean
  disciplineId: string
  entityType: CleanupEntityType
}>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'created', jobId: string): void
}>()

const store = useCleanupStore()
const toast = useToast()

const selectedTemplateId = ref<string | null>(null)
const parentId = ref<string>('')
const categoryId = ref<string>('')
const search = ref<string>('')
const running = ref(false)

const templates = ref<CleanupTemplate[]>([])

async function loadTemplates() {
  if (!props.disciplineId) return
  await store.listTemplates(props.disciplineId, props.entityType)
  templates.value = store.templates
  selectedTemplateId.value = templates.value[0]?.id ?? null
}

watch(() => [props.visible, props.entityType], ([v]) => {
  if (v) loadTemplates()
})

async function run() {
  if (!selectedTemplateId.value) {
    toast.add({ severity: 'warn', summary: 'Pick a template first', life: 3000 })
    return
  }
  running.value = true
  try {
    const job = await store.runAnalysis({
      disciplineId: props.disciplineId,
      entityType: props.entityType,
      templateId: selectedTemplateId.value,
      filter: {
        parentId: parentId.value || undefined,
        categoryId: categoryId.value || undefined,
        search: search.value || undefined,
      },
    })
    toast.add({ severity: 'success', summary: 'Analysis complete', detail: `${job.proposals.length} proposals`, life: 3000 })
    emit('created', job.id)
    emit('update:visible', false)
  } catch (err: any) {
    const msg = err?.message || 'Analysis failed'
    const severity = msg.includes('413') ? 'warn' : 'error'
    toast.add({ severity, summary: 'Analysis failed', detail: msg, life: 6000 })
  } finally {
    running.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible" @update:visible="$emit('update:visible', $event)"
    header="New cleanup analysis" modal :style="{ width: '520px' }"
    :closable="!running"
  >
    <div class="flex flex-col gap-3">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Template</label>
        <Select v-model="selectedTemplateId" :options="templates" option-label="name" option-value="id" class="w-full" placeholder="Pick a template" />
      </div>
      <div v-if="entityType === 'category'">
        <label class="block text-sm text-gray-400 mb-1">Only under parent ID (optional)</label>
        <InputText v-model="parentId" class="w-full" placeholder="e.g. cat_xxx" />
      </div>
      <div v-else>
        <label class="block text-sm text-gray-400 mb-1">Only in category ID (optional)</label>
        <InputText v-model="categoryId" class="w-full" placeholder="e.g. cat_xxx" />
      </div>
      <div>
        <label class="block text-sm text-gray-400 mb-1">Name contains (optional)</label>
        <InputText v-model="search" class="w-full" />
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" :disabled="running" @click="$emit('update:visible', false)" />
      <Button label="Run analysis" icon="pi pi-play" :loading="running" @click="run" />
    </template>
  </Dialog>
</template>
