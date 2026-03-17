<script setup lang="ts">
import { computed } from 'vue'
import MultiSelect from 'primevue/multiselect'
import type { Tag } from '../../types'

/**
 * TagFilterSelect - Multi-select dropdown for filtering entities by tags.
 * Selected tags are shown as colored chips. Dropdown includes type-ahead filtering.
 *
 * @example
 * <TagFilterSelect
 *   :available-tags="tags"
 *   :selected-tag-ids="selectedTagIds"
 *   @add-tag="addTag"
 *   @remove-tag="removeTag"
 * />
 */

interface Props {
  /** All available tags (from tagStore) */
  availableTags: Tag[]
  /** Currently selected tag IDs */
  selectedTagIds: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add-tag': [tagId: string]
  'remove-tag': [tagId: string]
}>()

const tagOptions = computed(() =>
  props.availableTags.map(tag => ({
    label: tag.name,
    value: tag.id,
    color: tag.color,
  }))
)

// Bridge between MultiSelect v-model (string[]) and our emit-based API
const selectedValues = computed({
  get: () => props.selectedTagIds,
  set: (newIds: string[]) => {
    // Determine which tags were added/removed
    const added = newIds.filter(id => !props.selectedTagIds.includes(id))
    const removed = props.selectedTagIds.filter(id => !newIds.includes(id))

    for (const id of added) {
      emit('add-tag', id)
    }
    for (const id of removed) {
      emit('remove-tag', id)
    }
  },
})
</script>

<template>
  <MultiSelect
    v-model="selectedValues"
    :options="tagOptions"
    option-label="label"
    option-value="value"
    placeholder="Filter by tags..."
    class="w-full"
    display="chip"
    filter
    :filter-placeholder="'Search tags...'"
  />
</template>
