<script setup lang="ts">
import { ref, watch } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

// Configure marked globally for consistent behavior
marked.use({
  breaks: true,
  gfm: true
})

const props = defineProps<{
  content: string
}>()

const renderedHtml = ref('')

const parseMarkdown = async (content: string) => {
  if (!content) {
    renderedHtml.value = ''
    return
  }
  
  try {
    // marked.parse may return Promise in v17
    let raw = marked.parse(content)
    if (raw instanceof Promise) {
      raw = await raw
    }
    
    // Sanitize and return - allow common HTML tags
    renderedHtml.value = DOMPurify.sanitize(raw as string, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'blockquote'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    })
  } catch (error) {
    console.error('[MarkdownRenderer] Error:', error)
    renderedHtml.value = content // Fallback to raw content
  }
}

watch(() => props.content, (newContent) => {
  parseMarkdown(newContent)
}, { immediate: true })
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
  font-size: 0.875em;
}
</style>
