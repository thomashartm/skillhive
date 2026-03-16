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
 * <TagBadge :tag="tag" clickable @click="handleFilter" />
 */

interface Props {
  tag: TagType
  closable?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  closable: false,
  clickable: false,
})

const emit = defineEmits<{
  close: []
  click: []
}>()

const badgeStyle = computed(() => ({
  backgroundColor: props.tag.color || '#6B7280',
  color: '#ffffff',
}))

const handleClick = () => {
  if (props.closable) {
    emit('close')
  } else if (props.clickable) {
    emit('click')
  }
}
</script>

<template>
  <Tag
    :value="tag.name"
    :style="badgeStyle"
    :icon="closable ? 'pi pi-times' : undefined"
    :class="{ 'tag-badge--interactive': closable || clickable }"
    @click.stop="handleClick"
  />
</template>

<style scoped>
.tag-badge--interactive {
  cursor: pointer;
  transition: filter 0.15s ease;
}

.tag-badge--interactive:hover {
  filter: brightness(1.2);
}
</style>
