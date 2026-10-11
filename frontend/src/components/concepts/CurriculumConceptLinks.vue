<script setup lang="ts">
import { ref, watch } from 'vue'
import { useApi } from '../../composables/useApi'
import { conceptTreeLink, nodePath } from '../../utils/conceptTree'
import type { ConceptTree } from '../../types/concepts'

const props = defineProps<{ curriculumId: string; disciplineId: string }>()
const api = useApi()
const links = ref<{ id: string; label: string }[]>([])
const error = ref('')
let sequence = 0
watch(() => [props.curriculumId, props.disciplineId], async () => {
  const current = ++sequence
  links.value = []
  error.value = ''
  try {
    const tree = await api.get<ConceptTree>(`/api/v1/concept-trees?disciplineId=${encodeURIComponent(props.disciplineId)}`)
    if (sequence !== current) return
    links.value = (tree.nodes ?? [])
      .filter(node => node.curriculumIds?.includes(props.curriculumId))
      .map(node => ({ id: node.id, label: nodePath(tree.nodes, node) }))
  } catch {
    if (sequence === current) error.value = 'Could not load linked concept trees.'
  }
}, { immediate: true })
</script>

<template>
  <section v-if="links.length || error" class="concept-links" aria-label="Linked concept trees">
    <h2>Concept trees</h2>
    <p v-if="error" role="status">{{ error }}</p>
    <ul v-else>
      <li v-for="link in links" :key="link.id">
        <RouterLink :to="conceptTreeLink(disciplineId, link.id)"><i class="pi pi-sitemap" aria-hidden="true" /> {{ link.label }}</RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.concept-links { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #35353e; border-radius: 8px; }
h2 { font-size: .9rem; margin: 0 0 .75rem; }
ul { list-style: none; margin: 0; padding: 0; }
li + li { margin-top: .5rem; }
a { color: var(--p-primary-color, #34d399); font-size: .85rem; overflow-wrap: anywhere; }
p { color: #a1a1aa; font-size: .85rem; }
</style>
