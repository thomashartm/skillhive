<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import type { Tag as TagType } from '../../types'

/**
 * TagBadge - Displays a tag as a colored badge
 *
 * @example
 * <TagBadge :tag="tag" />
 * <TagBadge :tag="tag" closable @close="handleRemove" />
 */

interface Props {
  tag: TagType
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  closable: false,
})

const emit = defineEmits<{
  close: []
}>()

const badgeStyle = computed(() => ({
  backgroundColor: props.tag.color || '#6B7280',
  color: '#ffffff',
}))

const handleRemove = () => {
  emit('close')
}
</script>

<template>
  <Tag
    :value="tag.name"
    :style="badgeStyle"
    :icon="closable ? 'pi pi-times' : undefined"
    :class="{ 'cursor-pointer': closable }"
    @click="closable && handleRemove()"
  />
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
