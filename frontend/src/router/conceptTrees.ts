import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import { conceptTreeLink } from '../utils/conceptTree'

export const conceptTreeRoutes = [
  {
    path: 'concept-trees/view/:disciplineId?/:nodeId?',
    name: 'concept-trees-view',
    component: () => import('../views/ConceptTreesView.vue'),
    props: { readOnly: true },
  },
  {
    path: 'concept-trees/:disciplineId?/:nodeId?',
    name: 'concept-trees',
    component: () => import('../views/ConceptTreesView.vue'),
  },
] satisfies RouteRecordRaw[]

// Keep bookmarks and previously shared links working, with a canonical path URL.
export function redirectLegacyConceptTree(to: RouteLocationNormalized) {
  if (to.name !== 'concept-trees' && to.name !== 'concept-trees-view') return
  const { disciplineId: oldDiscipline, nodeId: oldNode, ...query } = to.query
  if (oldDiscipline === undefined && oldNode === undefined) return
  const disciplineId = to.params.disciplineId || oldDiscipline
  const nodeId = to.params.nodeId || oldNode
  if (typeof disciplineId !== 'string' || !disciplineId) return
  return {
    path: conceptTreeLink(disciplineId, typeof nodeId === 'string' ? nodeId : '', to.name === 'concept-trees-view'),
    query, hash: to.hash, replace: true,
  }
}
