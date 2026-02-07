<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

const renderedHtml = computed(() => {
  if (!props.content) return ''
  const raw = marked.parse(props.content) as string
  return DOMPurify.sanitize(raw)
})
</script>

<template>
  <div class="markdown-content" v-html="renderedHtml" />
</template>

<style scoped>
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(p) {
  margin-bottom: 0.5rem;
}

.markdown-content :deep(a) {
  color: var(--primary-color);
  text-decoration: underline;
}

.markdown-content :deep(code) {
  background: var(--surface-100);
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  font-size: 0.875em;
}
</style>
