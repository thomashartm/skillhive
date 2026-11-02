import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import { conceptTreeLink } from '../utils/conceptTree'

export const conceptTreeRoutes = [
  {
    path: 'concept-paths/view/:disciplineId?/:nodeId?',
    alias: '/concept-trees/view/:disciplineId?/:nodeId?',
    name: 'concept-paths-view',
    component: () => import('../views/ConceptTreesView.vue'),
    props: { readOnly: true },
  },
  {
    path: 'concept-paths/:disciplineId?/:nodeId?',
    alias: '/concept-trees/:disciplineId?/:nodeId?',
    name: 'concept-paths',
    component: () => import('../views/ConceptTreesView.vue'),
  },
] satisfies RouteRecordRaw[]

// Keep bookmarks and previously shared links working, with a canonical path URL.
export function redirectLegacyConceptTree(to: RouteLocationNormalized) {
  if (to.name !== 'concept-paths' && to.name !== 'concept-paths-view') return
  const { disciplineId: oldDiscipline, nodeId: oldNode, ...query } = to.query
  if (!to.path.startsWith('/concept-trees') && oldDiscipline === undefined && oldNode === undefined) return
  const disciplineId = to.params.disciplineId || oldDiscipline
  const nodeId = to.params.nodeId || oldNode
  return {
    path: conceptTreeLink(typeof disciplineId === 'string' ? disciplineId : '', typeof nodeId === 'string' ? nodeId : '', to.name === 'concept-paths-view'),
    query, hash: to.hash, replace: true,
  }
}
