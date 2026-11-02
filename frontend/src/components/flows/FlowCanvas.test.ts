import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { VueFlow } from '@vue-flow/core'
import FlowCanvas from './FlowCanvas.vue'

describe('flow canvas positions', () => {
  it('opens step details from keyboard selection even in read-only mode', () => {
    const wrapper = mount(FlowCanvas, {
      props: { diagram: { id: 'd', name: 'Flow', nodes: [], edges: [] }, editable: false, selectedNode: '', selectedEdge: '' },
      global: { stubs: { VueFlow: { template: '<div />' } } },
    })
    wrapper.getComponent(VueFlow).vm.$emit('nodesChange', [{ type: 'select', id: 'step', selected: true }, { type: 'position', id: 'step', position: { x: 10, y: 20 } }])
    expect(wrapper.emitted('select-node')).toEqual([['step']])
    expect(wrapper.emitted('move')).toBeUndefined()
    wrapper.unmount()
  })
  it('persists final drag positions, including multiple moved nodes', () => {
    const wrapper = mount(FlowCanvas, {
      props: { diagram: { id: 'd', name: 'Flow', nodes: [], edges: [] }, editable: true, selectedNode: '', selectedEdge: '' },
      global: { stubs: { VueFlow: { template: '<div />' } } },
    })
    wrapper.getComponent(VueFlow).vm.$emit('nodeDragStop', { nodes: [
      { id: 'step', position: { x: 125, y: 180 } }, { id: 'other', position: { x: 400, y: 180 } },
    ] })
    expect(wrapper.emitted('move')).toEqual([['step', { x: 125, y: 180 }], ['other', { x: 400, y: 180 }]])
    wrapper.unmount()
  })
})
