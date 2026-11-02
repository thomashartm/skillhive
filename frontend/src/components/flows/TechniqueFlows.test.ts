import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import PrimeVue from 'primevue/config'
import TechniqueFlows from './TechniqueFlows.vue'
import FlowCanvas from './FlowCanvas.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), role: 'editor', confirm: vi.fn() }))
vi.mock('../../composables/useApi', () => ({ useApi: () => ({ get: mocks.get, put: mocks.put }) }))
vi.mock('../../stores/auth', () => ({ useAuthStore: () => ({ getRoleForDiscipline: (id: string) => id === 'bjj' ? mocks.role : 'viewer' }) }))
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: mocks.confirm }) }))

const initial = {
  revision: 3,
  diagrams: [{ id: 'main', name: 'Main flow', nodes: [
    { id: 'start', type: 'start', name: 'Establish grip', label: 'First', description: '**Grip** securely', assetId: 'video', position: { x: 0, y: 0 } },
    { id: 'decision', type: 'decision', name: 'Grip secure?', label: '', description: '', assetId: '', position: { x: 300, y: 0 } },
  ], edges: [{ id: 'retry', source: 'decision', target: 'start', condition: 'Grip lost' }] }],
}

async function render(disciplineId = 'bjj') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: {} }] })
  await router.push('/techniques/tech')
  const wrapper = mount(TechniqueFlows, {
    props: { techniqueId: 'tech', disciplineId },
    global: { plugins: [PrimeVue, router], stubs: { FlowCanvas: { template: '<div />', props: ['diagram', 'editable'] }, teleport: true } },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.role = 'editor'
  mocks.confirm.mockImplementation(({ accept }) => accept())
  mocks.get.mockImplementation(async (url: string) => url.includes('/flows') ? structuredClone(initial) : [
    { id: 'video', title: 'Grip lesson', type: 'video', active: true, url: 'https://example.com/video' },
    { id: 'image', title: 'Grip picture', type: 'image', active: true, url: 'https://example.com/picture.jpg' },
    { id: 'web', title: 'Article', type: 'web', active: true },
  ])
  mocks.put.mockImplementation(async (_url: string, body: object) => ({ ...structuredClone(body), revision: 4 }))
})

describe('technique flow editing', () => {
  it('adds the chosen step type from the Add step menu', async () => {
    const { wrapper } = await render()
    await wrapper.get('button[aria-label="Add a step"]').trigger('click')
    await flushPromises()
    const decision = wrapper.findAll('[role="menuitem"]').find(item => item.text().includes('Add decision'))
    expect(decision).toBeDefined()
    await decision!.get('a').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#step-name').element.value).toBe('Decision')
    await wrapper.get('button[aria-label="Save diagrams"]').trigger('click')
    await flushPromises()
    expect(mocks.put.mock.calls[0]![1].diagrams[0].nodes.at(-1)).toMatchObject({ type: 'decision', name: 'Decision' })
    wrapper.unmount()
  })
  it('saves a conditional loop and preserves step details and positions', async () => {
    const { wrapper } = await render()
    await wrapper.getComponent(FlowCanvas).vm.$emit('select-edge', 'retry')
    await flushPromises()
    await wrapper.get('#flow-condition').setValue('If the grip is lost')
    await wrapper.get('button[aria-label="Save diagrams"]').trigger('click')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/api/v1/techniques/tech/flows', expect.objectContaining({ revision: 3, diagrams: [expect.objectContaining({
      nodes: initial.diagrams[0]!.nodes,
      edges: [{ id: 'retry', source: 'decision', target: 'start', condition: 'If the grip is lost' }],
    })] }))
    expect(wrapper.text()).toContain('Saved')
    wrapper.unmount()
  })

  it('keeps a failed save dirty and protects navigation until edits are discarded', async () => {
    mocks.put.mockRejectedValue(new Error('Changed by another editor'))
    const { wrapper, router } = await render()
    await wrapper.get('#flow-name').setValue('My draft')
    await wrapper.get('button[aria-label="Save diagrams"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Changed by another editor')
    expect(wrapper.get<HTMLInputElement>('#flow-name').element.value).toBe('My draft')
    expect(wrapper.text()).toContain('Unsaved changes')
    mocks.confirm.mockImplementation(({ reject }) => reject())
    await router.push('/techniques')
    expect(router.currentRoute.value.path).toBe('/techniques/tech')
    wrapper.unmount()
  })

  it('removes attached transitions when deleting a step', async () => {
    const { wrapper } = await render()
    wrapper.getComponent(FlowCanvas).vm.$emit('select-node', 'start')
    await flushPromises()
    await wrapper.get('button[aria-label="Delete step"]').trigger('click')
    await flushPromises()
    await wrapper.get('button[aria-label="Save diagrams"]').trigger('click')
    await flushPromises()
    const saved = mocks.put.mock.calls[0]![1]
    expect(saved.diagrams[0].nodes.map((n: { id: string }) => n.id)).toEqual(['decision'])
    expect(saved.diagrams[0].edges).toEqual([])
    wrapper.unmount()
  })

  it('views Markdown and media without offering writes to viewers of the owning discipline', async () => {
    const { wrapper } = await render('other')
    expect(wrapper.find('button[aria-label="Save diagrams"]').exists()).toBe(false)
    expect(wrapper.getComponent(FlowCanvas).props('editable')).toBe(false)
    wrapper.getComponent(FlowCanvas).vm.$emit('select-node', 'start')
    await flushPromises()
    expect(wrapper.get('strong').text()).toBe('Grip')
    expect(wrapper.get('a[href="/assets/video"]').text()).toContain('Grip lesson')
    wrapper.getComponent(FlowCanvas).vm.$emit('connect', { source: 'start', target: 'start' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Unsaved changes')
    expect(mocks.put).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps diagrams usable if the media library fails', async () => {
    mocks.get.mockImplementation(async (url: string) => {
      if (url.includes('/flows')) return structuredClone(initial)
      throw new Error('Media unavailable')
    })
    const { wrapper } = await render()
    expect(wrapper.findComponent(FlowCanvas).exists()).toBe(true)
    expect(wrapper.text()).toContain('Media unavailable')
    wrapper.unmount()
  })
})
