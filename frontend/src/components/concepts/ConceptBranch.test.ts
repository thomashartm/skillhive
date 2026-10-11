import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConceptBranch from './ConceptBranch.vue'
import type { ConceptNode } from '../../types/concepts'

const nodes: ConceptNode[] = [
  { id: 'family', parentId: '', name: 'Guard passing', description: '', curriculumIds: [], techniqueIds: [], assetIds: [] },
  { id: 'branch', parentId: 'family', name: 'Pressure', description: '', curriculumIds: [], techniqueIds: ['technique'], assetIds: [] },
  { id: 'leaf', parentId: 'branch', name: 'Knee cut', description: '', curriculumIds: [], techniqueIds: [], assetIds: ['asset'] },
]

describe('ConceptBranch', () => {
  it('renders three levels, emits selection, and collapses a branch accessibly', async () => {
    const wrapper = mount(ConceptBranch, { props: { node: nodes[0]!, nodes, selectedId: '', editable: true } })
    expect(wrapper.findAll('.concept-card')).toHaveLength(3)
    expect(wrapper.findAll('.kind').map(n => n.text())).toEqual(['Family', 'Node', 'Leaf'])
    await wrapper.findAll('.concept-card')[2]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['leaf']])
    const toggle = wrapper.get('[aria-label="Collapse Pressure"]')
    await toggle.trigger('click')
    expect(wrapper.findAll('.concept-card')).toHaveLength(2)
    expect(toggle.attributes('aria-expanded')).toBe('false')
    // Returning via a URL/history entry must reveal a collapsed descendant.
    await wrapper.setProps({ selectedId: 'leaf' })
    expect(wrapper.findAll('.concept-card')).toHaveLength(3)
  })
  it('offers editing for every element and propagates the selected node', async () => {
    const wrapper = mount(ConceptBranch, { props: { node: nodes[0]!, nodes, selectedId: '', editable: true, orientation: 'horizontal' } })
    expect(wrapper.findAll('.branch.horizontal')).toHaveLength(3)
    for (const node of nodes) await wrapper.get(`[aria-label="Edit ${node.name}"]`).trigger('click')
    expect(wrapper.emitted('edit')).toEqual(nodes.map(node => [node]))
    await wrapper.setProps({ editable: false })
    expect(wrapper.findAll('.edit-element')).toHaveLength(0)
    expect(wrapper.findAll('.concept-card')).toHaveLength(3)
  })
  it('only permits dragging and dropping for admins', async () => {
    const wrapper = mount(ConceptBranch, { props: { node: nodes[0]!, nodes, selectedId: '', editable: false } })
    const card = wrapper.get('.concept-card')
    expect(card.attributes('draggable')).toBe('false')
    await card.trigger('drop', { dataTransfer: { getData: () => 'leaf' } })
    expect(wrapper.emitted('move')).toBeUndefined()
    await wrapper.setProps({ editable: true })
    await card.trigger('drop', { dataTransfer: { getData: () => 'leaf' } })
    expect(wrapper.emitted('move')).toEqual([['leaf', 'family']])
  })
})
