import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ConnectionMode, VueFlow } from '@vue-flow/core'
import FlowCanvas from './FlowCanvas.vue'

describe('flow canvas interactions', () => {
  it.each([true, false])('handles endpoint dragging and keyboard deletion only when editable=%s', async editable => {
    const wrapper = mount(FlowCanvas, {
      props: { diagram: { id: 'd', name: 'Flow', nodes: [], edges: [] }, editable, selectedNode: '', selectedEdge: 'arrow' },
      global: { stubs: { VueFlow: { template: '<div />' } } },
    })
    expect(wrapper.getComponent(VueFlow).attributes('connection-mode')).toBe(ConnectionMode.Strict)
    wrapper.getComponent(VueFlow).vm.$emit('edgeUpdate', { edge: { id: 'arrow' }, connection: { source: 'start', target: 'finish' } })
    await wrapper.trigger('keydown', { key: 'Delete' })
    expect(wrapper.emitted('reconnect')).toEqual(editable ? [['arrow', { source: 'start', target: 'finish' }]] : undefined)
    expect(wrapper.emitted('delete-edge')).toEqual(editable ? [['arrow']] : undefined)
    wrapper.unmount()
  })
  it('ignores deletion while typing and supports Backspace on the canvas', async () => {
    const wrapper = mount(FlowCanvas, {
      props: { diagram: { id: 'd', name: 'Flow', nodes: [], edges: [] }, editable: true, selectedNode: '', selectedEdge: 'arrow' },
      global: { stubs: { VueFlow: { template: '<div><input /></div>' } } },
    })
    await wrapper.get('input').trigger('keydown', { key: 'Backspace' })
    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('delete-edge')).toBeUndefined()
    await wrapper.trigger('keydown', { key: 'Backspace' })
    expect(wrapper.emitted('delete-edge')).toEqual([['arrow']])
    await wrapper.setProps({ selectedEdge: '' })
    await wrapper.trigger('keydown', { key: 'Delete' })
    expect(wrapper.emitted('delete-edge')).toHaveLength(1)
    wrapper.unmount()
  })
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
