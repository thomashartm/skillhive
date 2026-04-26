<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
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

const isReadOnly = computed(() => activeJob.value !== null && activeJob.value.status !== 'proposed')
const isApplying = computed(() => activeJob.value?.status === 'applying')

let pollHandle: ReturnType<typeof setTimeout> | null = null
const POLL_MS = 3000

function clearPoll() {
  if (pollHandle !== null) {
    clearTimeout(pollHandle)
    pollHandle = null
  }
}

async function pollOnce() {
  pollHandle = null
  try {
    const j = await store.getJob(jobId)
    if (j.status === 'applying') {
      pollHandle = setTimeout(pollOnce, POLL_MS)
    }
  } catch {
    // Stop polling on transient error; user can refresh.
  }
}

watch(isApplying, (applying) => {
  if (applying && pollHandle === null) {
    pollHandle = setTimeout(pollOnce, POLL_MS)
  } else if (!applying) {
    clearPoll()
  }
})

onMounted(async () => {
  await store.getJob(jobId)
  if (activeJob.value?.status === 'applying' && pollHandle === null) {
    pollHandle = setTimeout(pollOnce, POLL_MS)
  }
})

onUnmounted(clearPoll)

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
    case 'applying': return 'info'
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
          detail: `${res.appliedResult?.updated ?? 0} updated, ${res.appliedResult?.deleted ?? 0} deleted, ${(res.appliedResult?.skipped ?? []).length} skipped`,
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

function confirmForceFail() {
  confirm.require({
    header: 'Force-fail this job?',
    message: 'Mark a stuck or interrupted job as failed. The audit trail will record this manual override. Use only when the job appears stuck or after an aborted apply.',
    acceptClass: 'p-button-danger',
    accept: async () => {
      working.value = true
      try {
        await store.forceFailJob(jobId, 'force-failed by admin via UI')
        toast.add({ severity: 'info', summary: 'Marked failed', life: 4000 })
      } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Force-fail failed', detail: err.message, life: 5000 })
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

    <Message v-if="isApplying" severity="info" :closable="false" class="mt-3">
      <div class="applying-banner">
        <ProgressSpinner style="width: 1.25rem; height: 1.25rem" stroke-width="6" />
        <span>Applying approved proposals — this may take a minute. The page will refresh automatically when done.</span>
      </div>
    </Message>

    <Message v-if="activeJob?.status === 'failed'" severity="error" :closable="false" class="mt-3">
      {{ activeJob.error }}
    </Message>

    <Message v-if="activeJob?.status === 'applied'" severity="success" :closable="false" class="mt-3">
      Applied {{ activeJob.appliedResult?.updated ?? 0 }} updates, {{ activeJob.appliedResult?.deleted ?? 0 }} deletes,
      {{ (activeJob.appliedResult?.skipped ?? []).length }} skipped.
    </Message>

    <div v-if="activeJob?.proposals?.length" class="proposals">
      <CleanupProposalRow
        v-for="p in activeJob.proposals" :key="p.index"
        :proposal="p"
        :entity-type="activeJob.entityType"
        :merge-target-name="p.mergeInto ? mergeTargetNameById[p.mergeInto] : undefined"
        :read-only="isReadOnly"
        @approve-toggle="toggleApprove"
        @save-after="saveAfter"
      />
    </div>

    <div v-if="activeJob?.status === 'proposed'" class="footer-bar">
      <Button label="Force-fail (recovery)" icon="pi pi-exclamation-triangle"
              severity="danger" outlined :disabled="working" @click="confirmForceFail" />
      <div class="grow" />
      <Button label="Discard" icon="pi pi-times" severity="warning" :disabled="working" @click="confirmDiscard" />
      <Button :label="`Apply approved (${approvedCount})`" icon="pi pi-check"
              :disabled="working || approvedCount === 0" @click="confirmApply" />
    </div>

    <div v-else-if="isApplying" class="footer-bar">
      <Button label="Force-fail (recovery)" icon="pi pi-exclamation-triangle"
              severity="danger" outlined :disabled="working" @click="confirmForceFail" />
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
.applying-banner { display: flex; align-items: center; gap: 0.75rem; }
.footer-bar { position: sticky; bottom: 0; display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 0; background: var(--surface-ground); border-top: 1px solid var(--surface-border); }
.footer-bar .grow { flex: 1; }
</style>
