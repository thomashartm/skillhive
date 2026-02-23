<template>
  <Card>
    <template #title>
      <h2 class="text-xl font-semibold">Recent Curricula</h2>
    </template>
    <template #content>
      <div v-if="curricula.length === 0" class="text-center py-8 text-slate-400">
        <i class="pi pi-inbox text-4xl mb-4"></i>
        <p>No curricula yet. Create your first curriculum!</p>
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="curriculum in curricula"
          :key="curriculum.id"
          class="border border-white/10 p-4 hover:bg-white/5 cursor-pointer transition-colors"
          @click="handleView(curriculum)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-lg mb-1 truncate">{{ curriculum.title }}</h3>
              <div v-if="curriculum.description" class="description-preview">
                <MarkdownRenderer :content="curriculum.description" class="text-slate-400 text-sm" />
              </div>
              <div class="flex items-center gap-3 text-sm text-slate-500">
                <span v-if="curriculum.elementCount !== undefined">
                  <i class="pi pi-list mr-1"></i>
                  {{ curriculum.elementCount }} element{{ curriculum.elementCount !== 1 ? 's' : '' }}
                </span>
                <span v-if="curriculum.duration">
                  <i class="pi pi-stopwatch mr-1"></i>
                  {{ curriculum.duration }}
                </span>
                <span>
                  <i class="pi pi-clock mr-1"></i>
                  {{ formatDate(curriculum.updatedAt) }}
                </span>
              </div>
            </div>
            <Tag v-if="curriculum.isPublic" value="Public" severity="success" class="ml-2" />
            <Tag v-else value="Private" severity="secondary" class="ml-2" />
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import MarkdownRenderer from '../common/MarkdownRenderer.vue'

interface Curriculum {
  id: string
  title: string
  description: string
  elementCount?: number
  duration?: string | null
  updatedAt: string
  isPublic: boolean
}

interface Props {
  curricula: Curriculum[]
}

interface Emits {
  (e: 'view', curriculum: Curriculum): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleView = (curriculum: Curriculum) => {
  emit('view', curriculum)
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}
</script>

<style scoped>
.description-preview {
  max-height: 1.5rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.description-preview :deep(p) {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.description-preview :deep(ul),
.description-preview :deep(ol),
.description-preview :deep(h1),
.description-preview :deep(h2),
.description-preview :deep(h3),
.description-preview :deep(br) {
  display: none;
}
</style>
