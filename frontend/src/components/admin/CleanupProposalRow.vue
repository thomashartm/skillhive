<script setup lang="ts">
import { ref, watch } from 'vue'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import CleanupDiff from './CleanupDiff.vue'
import type { CleanupProposal, CleanupEntityType, CleanupProposedFields } from '../../types/cleanup'

const props = withDefaults(
  defineProps<{
    proposal: CleanupProposal
    entityType: CleanupEntityType
    mergeTargetName?: string
    readOnly?: boolean
  }>(),
  { readOnly: false },
)
const emit = defineEmits<{
  (e: 'approveToggle', index: number, next: boolean): void
  (e: 'saveAfter', index: number, after: CleanupProposedFields): void
}>()

const editing = ref(false)
const draft = ref<CleanupProposedFields>({ name: '', slug: '', description: '' })

function startEdit() {
  if (props.readOnly) return
  editing.value = true
}

watch(() => props.proposal, (p) => {
  if (p.after) {
    draft.value = {
      name: p.after.name,
      slug: p.after.slug,
      description: p.after.description,
      parentId: p.after.parentId ?? null,
      categoryIds: p.after.categoryIds ? [...p.after.categoryIds] : [],
    }
  }
}, { immediate: true })

function save() {
  emit('saveAfter', props.proposal.index, draft.value)
  editing.value = false
}
</script>

<template>
  <div class="row">
    <div class="row-header">
      <Tag v-if="proposal.action === 'update'" value="UPDATE" severity="info" />
      <Tag v-else value="MERGE" severity="warn" />
      <span class="target">{{ proposal.before.name }} <span class="slug">({{ proposal.before.slug }})</span></span>
      <span v-if="proposal.action === 'delete'" class="merge-into">
        → merge into <strong>{{ mergeTargetName || proposal.mergeInto }}</strong>
      </span>
      <div class="grow" />
      <div class="approve">
        <template v-if="readOnly">
          <Tag
            :value="proposal.approved ? 'Approved' : 'Not approved'"
            :severity="proposal.approved ? 'success' : 'secondary'"
          />
        </template>
        <template v-else>
          <Checkbox :modelValue="proposal.approved" :binary="true"
                    @update:modelValue="emit('approveToggle', proposal.index, $event as boolean)" />
          <span>Approve</span>
        </template>
      </div>
    </div>

    <div class="rationale">{{ proposal.rationale }}</div>

    <div v-if="proposal.action === 'update' && !editing">
      <CleanupDiff :before="proposal.before" :after="proposal.after" :entity-type="entityType" />
      <div v-if="!readOnly" class="mt-2">
        <Button label="Edit after" icon="pi pi-pencil" size="small" text @click="startEdit" />
      </div>
    </div>

    <div v-else-if="proposal.action === 'update' && editing && !readOnly" class="edit-form">
      <div class="form-row">
        <label>name</label>
        <InputText v-model="draft.name" />
      </div>
      <div class="form-row">
        <label>slug</label>
        <InputText v-model="draft.slug" />
      </div>
      <div class="form-row">
        <label>description</label>
        <Textarea v-model="draft.description" :rows="4" />
      </div>
      <div v-if="entityType === 'category'" class="form-row">
        <label>parentId</label>
        <InputText :modelValue="draft.parentId ?? ''" @update:modelValue="draft.parentId = ($event || null)" />
      </div>
      <div v-else class="form-row">
        <label>categoryIds (comma separated)</label>
        <InputText
          :modelValue="(draft.categoryIds ?? []).join(',')"
          @update:modelValue="draft.categoryIds = String($event).split(',').map(s => s.trim()).filter(Boolean)"
        />
      </div>
      <div class="flex gap-2 mt-2">
        <Button label="Cancel" severity="secondary" size="small" @click="editing = false" />
        <Button label="Save" icon="pi pi-check" size="small" @click="save" />
      </div>
    </div>

    <div v-else>
      <CleanupDiff :before="proposal.before" :after="null" :entity-type="entityType" />
    </div>
  </div>
</template>

<style scoped>
.row { padding: 0.75rem 1rem; border: 1px solid var(--surface-border); border-radius: 6px; margin-bottom: 0.75rem; }
.row-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
.target { font-weight: 500; }
.slug { color: var(--text-color-secondary); font-weight: 400; }
.merge-into { color: var(--text-color-secondary); margin-left: 0.5rem; }
.grow { flex: 1; }
.approve { display: inline-flex; align-items: center; gap: 0.35rem; }
.rationale { color: var(--text-color-secondary); font-style: italic; margin-bottom: 0.5rem; }
.edit-form { display: flex; flex-direction: column; gap: 0.5rem; }
.form-row { display: flex; flex-direction: column; gap: 0.25rem; }
.form-row label { font-size: 0.75rem; color: var(--text-color-secondary); }
</style>
