import { describe, expect, it } from 'vitest'
import { descendants, moveNode, nodePath } from './conceptTree'
import type { ConceptNode } from '../types/concepts'

const nodes: ConceptNode[] = [
  { id: 'a', parentId: '', name: 'Family A', description: '', techniqueIds: [], assetIds: [] },
  { id: 'b', parentId: '', name: 'Family B', description: '', techniqueIds: [], assetIds: [] },
  { id: 'branch', parentId: 'a', name: 'Branch', description: '', techniqueIds: ['technique'], assetIds: [] },
  { id: 'leaf', parentId: 'branch', name: 'Leaf', description: '', techniqueIds: [], assetIds: ['asset'] },
]

describe('concept tree moves', () => {
  it('moves across families and preserves descendants and links without changing the source', () => {
    const moved = moveNode(nodes, 'branch', 'b')
    expect(moved[2]?.parentId).toBe('b')
    expect(moved[2]?.techniqueIds).toEqual(['technique'])
    expect(moved[3]).toEqual(nodes[3])
    expect(nodes[2]?.parentId).toBe('a')
    expect(nodePath(moved, moved[3]!)).toBe('Family B / Branch / Leaf')
  })
  it('rejects self, descendant, and nonexistent destinations', () => {
    expect(() => moveNode(nodes, 'a', 'leaf')).toThrow('outside this branch')
    expect(() => moveNode(nodes, 'a', 'a')).toThrow('outside this branch')
    expect(() => moveNode(nodes, 'a', 'missing')).toThrow('Destination')
    expect(() => moveNode(nodes, 'missing', 'a')).toThrow('Node')
  })
  it('promotes a branch to a family', () => {
    expect(moveNode(nodes, 'branch', '')[2]?.parentId).toBe('')
  })
  it('identifies exactly the subtree for deletion', () => {
    expect([...descendants(nodes, 'branch')]).toEqual(['branch', 'leaf'])
  })
})
