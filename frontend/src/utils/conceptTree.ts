import type { ConceptNode } from '../types/concepts'

// IDs, rather than names or parent paths, keep links stable after renames/moves.
export function conceptTreeLink(disciplineId: string, nodeId = '', readOnly = true): string {
  const query = new URLSearchParams({ disciplineId })
  if (nodeId) query.set('nodeId', nodeId)
  return `/concept-trees${readOnly ? '/view' : ''}?${query}`
}

export function familyFor(nodes: ConceptNode[], id: string): ConceptNode | undefined {
  let node = nodes.find(n => n.id === id)
  const seen = new Set<string>()
  while (node?.parentId && !seen.has(node.id)) {
    seen.add(node.id)
    node = nodes.find(n => n.id === node!.parentId)
  }
  return node && !node.parentId ? node : undefined
}

export function descendants(nodes: ConceptNode[], id: string): Set<string> {
  const result = new Set([id])
  const queue = [id]
  for (let index = 0; index < queue.length; index++) {
    for (const node of nodes) {
      if (node.parentId === queue[index] && !result.has(node.id)) {
        result.add(node.id)
        queue.push(node.id)
      }
    }
  }
  return result
}

export function moveNode(nodes: ConceptNode[], id: string, parentId: string): ConceptNode[] {
  if (!nodes.some(n => n.id === id)) throw new Error('Node no longer exists.')
  if (parentId && !nodes.some(n => n.id === parentId)) throw new Error('Destination no longer exists.')
  if (descendants(nodes, id).has(parentId)) throw new Error('Choose a destination outside this branch.')
  return nodes.map(n => n.id === id ? { ...n, parentId } : n)
}

export function nodePath(nodes: ConceptNode[], node: ConceptNode): string {
  const names = [node.name]
  const seen = new Set([node.id])
  let current = nodes.find(n => n.id === node.parentId)
  while (current && !seen.has(current.id)) {
    names.unshift(current.name)
    seen.add(current.id)
    current = nodes.find(n => n.id === current!.parentId)
  }
  return names.join(' / ')
}
