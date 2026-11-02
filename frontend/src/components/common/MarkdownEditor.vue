<script setup lang="ts">
import { nextTick, ref, type ComponentPublicInstance } from 'vue'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import MarkdownRenderer from './MarkdownRenderer.vue'

const props = withDefaults(defineProps<{ modelValue: string; id: string; disabled?: boolean; maxlength?: number }>(), { maxlength: 10000 })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const input = ref<ComponentPublicInstance>()
const preview = ref(false)
const formats = [
  { name: 'Bold', icon: 'pi pi-bold', prefix: '**', suffix: '**', placeholder: 'bold text' },
  { name: 'Italic', icon: 'pi pi-italic', prefix: '*', suffix: '*', placeholder: 'italic text' },
  { name: 'Heading', icon: 'pi pi-hashtag', prefix: '## ', suffix: '', placeholder: 'Heading' },
  { name: 'Bullet list', icon: 'pi pi-list', prefix: '- ', suffix: '', placeholder: 'List item' },
  { name: 'Link', icon: 'pi pi-link', prefix: '[', suffix: '](https://example.com)', placeholder: 'link text' },
]

async function format(item: typeof formats[number]) {
  if (props.disabled) return
  const field = input.value?.$el as HTMLTextAreaElement | undefined
  if (!field) return
  const start = field.selectionStart
  const end = field.selectionEnd
  const selection = props.modelValue.slice(start, end) || item.placeholder
  const linePrefix = (item.name === 'Heading' || item.name === 'Bullet list') && start > 0 && props.modelValue[start - 1] !== '\n' ? '\n' : ''
  const replacement = linePrefix + item.prefix + selection + item.suffix
  const value = props.modelValue.slice(0, start) + replacement + props.modelValue.slice(end)
  if (value.length > props.maxlength) return
  emit('update:modelValue', value)
  await nextTick()
  field.focus()
  const offset = start + linePrefix.length + item.prefix.length
  field.setSelectionRange(offset, offset + selection.length)
}
</script>

<template>
  <div class="markdown-editor">
    <div class="flex flex-wrap gap-1 mb-2" role="toolbar" aria-label="Markdown formatting">
      <Button v-for="item in formats" :key="item.name" :icon="item.icon" :aria-label="item.name" :title="item.name"
        severity="secondary" text size="small" :disabled="disabled || preview" @mousedown.prevent @click="format(item)" />
      <Button :label="preview ? 'Edit' : 'Preview'" :aria-label="preview ? 'Edit Markdown' : 'Preview Markdown'"
        :aria-pressed="preview" severity="secondary" text size="small" @click="preview = !preview" />
    </div>
    <div v-if="preview" class="markdown-preview" aria-label="Markdown preview">
      <MarkdownRenderer v-if="modelValue" :content="modelValue" />
      <p v-else class="text-slate-400">Nothing to preview yet.</p>
    </div>
    <Textarea v-else :id="id" ref="input" :model-value="modelValue" :disabled="disabled" :maxlength="maxlength"
      rows="7" class="w-full font-mono text-sm" @update:model-value="value => !disabled && emit('update:modelValue', value ?? '')" />
    <small class="text-slate-400">Markdown supported · {{ modelValue.length }}/{{ maxlength }}</small>
  </div>
</template>

<style scoped>
.markdown-preview { min-height: 10rem; padding: 0.75rem; border: 1px solid #475569; overflow-wrap: anywhere; }
</style>
