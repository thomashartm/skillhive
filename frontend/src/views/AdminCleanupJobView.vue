<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ConfirmDialog from 'primevue/confirmdialog'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useCleanupStore } from '../stores/cleanup'
import CleanupProposalRow from '../components/admin/CleanupProposalRow.vue'
import type { CleanupJobStatus, CleanupProposedFields } from '../types/cleanup'

const route = useRoute()
const router = useRouter()
const store = useCleanupStore()
const confirm = useConfirm()
const toast = useToast()

const { activeJob } = storeToRefs(store)
const working = ref(false)
const jobId = String(route.params.id)

onMounted(() => store.getJob(jobId))

const approvedCount = computed(() => activeJob.value?.proposals.filter(p => p.approved).length ?? 0)

const mergeTargetNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const p of activeJob.value?.proposals ?? []) {
    map[p.targetId] = p.before.name
  }
  return map
})

function statusSeverity(s: CleanupJobStatus) {
  switch (s) {
    case 'proposed': return 'info'
    case 'applied': return 'success'
    case 'discarded': return 'warn'
    case 'failed': return 'danger'
    default: return 'secondary'
  }
}

async function toggleApprove(index: number, next: boolean) {
  try {
    await store.updateProposal(jobId, index, { approved: next })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Update failed', detail: err.message, life: 5000 })
  }
}

async function saveAfter(index: number, after: CleanupProposedFields) {
  try {
    await store.updateProposal(jobId, index, { after })
    toast.add({ severity: 'success', summary: 'Saved', life: 2000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: err.message, life: 5000 })
  }
}

function confirmApply() {
  confirm.require({
    header: 'Apply approved proposals?',
    message: `Apply ${approvedCount.value} approved proposals? This cannot be undone.`,
    acceptClass: 'p-button-danger',
    accept: async () => {
      working.value = true
      try {
        const res = await store.applyJob(jobId)
        toast.add({
          severity: 'success', summary: 'Applied',
          detail: `${res.appliedResult?.updated ?? 0} updated, ${res.appliedResult?.deleted ?? 0} deleted, ${res.appliedResult?.skipped.length ?? 0} skipped`,
          life: 8000,
        })
      } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Apply failed', detail: err.message, life: 6000 })
      } finally {
        working.value = false
      }
    },
  })
}

function confirmDiscard() {
  confirm.require({
    header: 'Discard job?',
    message: 'Mark this job as discarded? Proposals will no longer be applicable.',
    acceptClass: 'p-button-warning',
    accept: async () => {
      working.value = true
      try {
        await store.discardJob(jobId)
        toast.add({ severity: 'info', summary: 'Discarded', life: 3000 })
      } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Discard failed', detail: err.message, life: 5000 })
      } finally {
        working.value = false
      }
    },
  })
}
</script>

<template>
  <div class="view-padded">
    <Button label="Back to jobs" icon="pi pi-arrow-left" severity="secondary" text class="mb-3" @click="router.push({ name: 'admin-cleanup' })" />

    <div v-if="activeJob" class="job-header">
      <div>
        <h1 class="text-2xl font-bold">Cleanup job</h1>
        <div class="meta">
          <Tag :value="activeJob.status" :severity="statusSeverity(activeJob.status)" />
          <span class="sep">·</span>
          <span>{{ activeJob.entityType }}</span>
          <span class="sep">·</span>
          <span>template: <strong>{{ activeJob.templateName }}</strong></span>
          <span class="sep">·</span>
          <span>{{ activeJob.recordCount }} records</span>
          <span class="sep">·</span>
          <span>{{ new Date(activeJob.createdAt).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <Message v-if="activeJob?.status === 'failed'" severity="error" :closable="false" class="mt-3">
      {{ activeJob.error }}
    </Message>

    <Message v-if="activeJob?.status === 'applied'" severity="success" :closable="false" class="mt-3">
      Applied {{ activeJob.appliedResult?.updated ?? 0 }} updates, {{ activeJob.appliedResult?.deleted ?? 0 }} deletes,
      {{ activeJob.appliedResult?.skipped.length ?? 0 }} skipped.
    </Message>

    <div v-if="activeJob?.proposals?.length" class="proposals">
      <CleanupProposalRow
        v-for="p in activeJob.proposals" :key="p.index"
        :proposal="p"
        :entity-type="activeJob.entityType"
        :merge-target-name="p.mergeInto ? mergeTargetNameById[p.mergeInto] : undefined"
        @approve-toggle="toggleApprove"
        @save-after="saveAfter"
      />
    </div>

    <div v-if="activeJob?.status === 'proposed'" class="footer-bar">
      <Button label="Discard" icon="pi pi-times" severity="warning" :disabled="working" @click="confirmDiscard" />
      <Button :label="`Apply approved (${approvedCount})`" icon="pi pi-check"
              :disabled="working || approvedCount === 0" @click="confirmApply" />
    </div>

    <ConfirmDialog />
  </div>
</template>

<style scoped>
.view-padded { padding: 1.5rem; }
.job-header { margin-bottom: 1rem; }
.meta { color: var(--text-color-secondary); font-size: 0.875rem; margin-top: 0.25rem; }
.sep { margin: 0 0.4rem; opacity: 0.5; }
.proposals { margin-top: 1.5rem; }
.footer-bar { position: sticky; bottom: 0; display: flex; gap: 0.5rem; justify-content: flex-end; padding: 0.75rem 0; background: var(--surface-ground); border-top: 1px solid var(--surface-border); }
</style>
