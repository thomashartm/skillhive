import { ref, computed, watch, type Ref, readonly } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDebouncedRef } from './useDebounce'

export interface AssetFilterState {
  /** Text search query, synced to URL ?q= */
  searchQuery: Ref<string>
  /** Selected tag IDs, synced to URL ?tags= */
  selectedTagIds: Ref<string[]>
  /** Debounced search query for API calls (300ms) */
  debouncedSearchQuery: Readonly<Ref<string>>
  /** Add a tag to filter (no-op if already present) */
  addTag: (tagId: string) => void
  /** Remove a tag from filter */
  removeTag: (tagId: string) => void
  /** Clear all filters and reset URL */
  clearAll: () => void
  /** Whether any filter is active */
  hasActiveFilters: Readonly<Ref<boolean>>
}

export function useAssetFilters(): AssetFilterState {
  const route = useRoute()
  const router = useRouter()

  // Initialize from URL query params
  const searchQuery = ref((route.query.q as string) || '')
  const selectedTagIds = ref<string[]>(
    route.query.tags
      ? (route.query.tags as string).split(',').filter(Boolean)
      : []
  )

  const debouncedSearchQuery = useDebouncedRef(searchQuery, 300)

  const hasActiveFilters = computed(
    () => searchQuery.value !== '' || selectedTagIds.value.length > 0
  )

  // Build query object, omitting empty values
  function buildQuery(): Record<string, string> {
    const query: Record<string, string> = {}
    if (searchQuery.value) {
      query.q = searchQuery.value
    }
    if (selectedTagIds.value.length > 0) {
      query.tags = selectedTagIds.value.join(',')
    }
    return query
  }

  // Sync state to URL using router.replace (avoids polluting browser history)
  let skipNextUrlSync = true // Skip initial sync to avoid double-navigation on mount
  watch(
    [searchQuery, selectedTagIds],
    () => {
      if (skipNextUrlSync) {
        skipNextUrlSync = false
        return
      }
      router.replace({ query: buildQuery() })
    },
    { deep: true }
  )

  function addTag(tagId: string) {
    if (!selectedTagIds.value.includes(tagId)) {
      selectedTagIds.value = [...selectedTagIds.value, tagId]
    }
  }

  function removeTag(tagId: string) {
    selectedTagIds.value = selectedTagIds.value.filter(id => id !== tagId)
  }

  function clearAll() {
    searchQuery.value = ''
    selectedTagIds.value = []
  }

  return {
    searchQuery,
    selectedTagIds,
    debouncedSearchQuery: readonly(debouncedSearchQuery),
    addTag,
    removeTag,
    clearAll,
    hasActiveFilters: readonly(hasActiveFilters),
  }
}
