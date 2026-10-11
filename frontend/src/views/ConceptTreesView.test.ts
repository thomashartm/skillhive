import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PrimeVue from 'primevue/config'
import ConceptTreesView from './ConceptTreesView.vue'
import ConceptBranch from '../components/concepts/ConceptBranch.vue'

const mocks = vi.hoisted(() => ({
  auth: { isAdmin: true },
  discipline: { activeDisciplineId: 'bjj' },
  get: vi.fn(), put: vi.fn(),
}))
vi.mock('../stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('../stores/discipline', () => ({ useDisciplineStore: () => mocks.discipline }))
vi.mock('../composables/useApi', () => ({ useApi: () => ({ get: mocks.get, put: mocks.put }) }))
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: vi.fn() }) }))

const root = { id: 'family', parentId: '', name: 'Passing', description: '', techniqueIds: ['tech'], assetIds: ['asset'], layout: { orientation: 'horizontal', alignment: 'end' } }
const forest = { disciplineId: 'bjj', revision: 2, nodes: [root] }
function render(readOnly = false) {
  return mount(ConceptTreesView, {
    props: { readOnly },
    global: { plugins: [PrimeVue], stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.isAdmin = true
  mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? structuredClone(forest) : url.includes('techniques') ? [{ id: 'tech', name: 'Knee cut' }] : [{ id: 'asset', title: 'Passing lesson' }])
})

describe('concept tree viewing modes', () => {
  it.each([false, true])('renders saved layouts and links for non-admins (readOnly prop %s)', async readOnly => {
    mocks.auth.isAdmin = false
    const wrapper = render(readOnly)
    await flushPromises()
    expect(wrapper.text()).toContain('Read-only view')
    expect(wrapper.findAll('.edit-element')).toHaveLength(0)
    expect(wrapper.findAll('.layout-controls')).toHaveLength(0)
    expect(wrapper.find('.forest.align-end').exists()).toBe(true)
    expect(wrapper.find('.branch.horizontal').exists()).toBe(true)
    await wrapper.get('.concept-card').trigger('click')
    expect(wrapper.get('a[href="/techniques/tech"]').text()).toContain('Knee cut')
    expect(wrapper.get('a[href="/assets/asset"]').text()).toContain('Passing lesson')
    expect(mocks.put).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('prevents even admins from editing in read-only preview', async () => {
    const wrapper = render(true)
    await flushPromises()
    expect(wrapper.findAll('.edit-element')).toHaveLength(0)
    expect(wrapper.findAll('.layout-controls')).toHaveLength(0)
    // A child event cannot bypass the mode guard.
    wrapper.getComponent(ConceptBranch).vm.$emit('edit', root)
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(mocks.put).not.toHaveBeenCalled()
    await wrapper.setProps({ readOnly: false })
    expect(wrapper.find('.edit-element').exists()).toBe(true)
    expect(wrapper.find('.layout-controls').exists()).toBe(true)
    wrapper.unmount()
  })
  it('restores saved controls and chart after a rejected layout save', async () => {
    mocks.put.mockRejectedValue(new Error('Reload before trying again.'))
    const wrapper = render()
    await flushPromises()
    const orientation = wrapper.findAllComponents({ name: 'Select' }).find(select => select.props('ariaLabelledby') === 'orientation-label-family')!
    orientation.vm.$emit('update:modelValue', 'vertical')
    await flushPromises()
    expect(wrapper.text()).toContain('Reload before trying again.')
    expect(wrapper.find('.branch.horizontal').exists()).toBe(true)
    const restored = wrapper.findAllComponents({ name: 'Select' }).find(select => select.props('ariaLabelledby') === 'orientation-label-family')!
    expect(restored.vm === orientation.vm).toBe(false)
    expect(restored.props('modelValue')).toBe('horizontal')
    wrapper.unmount()
  })
  it('uses centered vertical rendering for previously saved families without layout settings', async () => {
    const { layout: _layout, ...legacyRoot } = root
    mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? { ...forest, nodes: [legacyRoot] } : [])
    const wrapper = render(true)
    await flushPromises()
    expect(wrapper.find('.forest.align-center').exists()).toBe(true)
    expect(wrapper.find('.branch.horizontal').exists()).toBe(false)
    wrapper.unmount()
  })
  it('saves family layout without changing links or other node data', async () => {
    mocks.put.mockImplementation(async (_url, body) => ({ ...forest, nodes: body.nodes, revision: 3 }))
    const wrapper = render()
    await flushPromises()
    const selects = wrapper.findAllComponents({ name: 'Select' })
    const orientation = selects.find(select => select.props('ariaLabelledby') === 'orientation-label-family')!
    orientation.vm.$emit('update:modelValue', 'vertical')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/api/v1/concept-trees?disciplineId=bjj', { revision: 2, nodes: [{ ...root, layout: { orientation: 'vertical', alignment: 'end' } }] })
    expect(wrapper.find('.branch.horizontal').exists()).toBe(false)
    wrapper.unmount()
  })
})
