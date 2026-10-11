import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import PrimeVue from 'primevue/config'
import ConceptTreesView from './ConceptTreesView.vue'
import ConceptBranch from '../components/concepts/ConceptBranch.vue'

const mocks = vi.hoisted(() => ({
  auth: { isAdmin: true },
  discipline: { activeDisciplineId: 'bjj', setActiveDiscipline(id: string) { this.activeDisciplineId = id } },
  get: vi.fn(), put: vi.fn(),
}))
vi.mock('../stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('../stores/discipline', () => ({ useDisciplineStore: () => mocks.discipline }))
vi.mock('../composables/useApi', () => ({ useApi: () => ({ get: mocks.get, put: mocks.put }) }))
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: vi.fn() }) }))

const root = { id: 'family', parentId: '', name: 'Passing', description: '', curriculumIds: ['course'], techniqueIds: ['tech'], assetIds: ['asset'], layout: { orientation: 'horizontal', alignment: 'end' } }
const forest = { disciplineId: 'bjj', revision: 2, nodes: [root] }
let router: Router
async function render(readOnly = false, url = '/concept-trees') {
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/concept-trees', component: {} }, { path: '/concept-trees/view', component: {} }, { path: '/:pathMatch(.*)*', component: {} }] })
  await router.push(url)
  return mount(ConceptTreesView, {
    props: { readOnly },
    global: { plugins: [PrimeVue, router], stubs: { teleport: true } },
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.isAdmin = true
  mocks.discipline = reactive({ activeDisciplineId: 'bjj', setActiveDiscipline(id: string) { this.activeDisciplineId = id } })
  mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? structuredClone(forest) : url.includes('techniques') ? [{ id: 'tech', name: 'Knee cut' }] : url.includes('curricula') ? [{ id: 'course', title: 'Passing curriculum' }] : [{ id: 'asset', title: 'Passing lesson' }])
})

describe('concept tree viewing modes', () => {
  it.each([false, true])('renders saved layouts and links for non-admins (readOnly prop %s)', async readOnly => {
    mocks.auth.isAdmin = false
    const wrapper = await render(readOnly)
    await flushPromises()
    expect(wrapper.text()).toContain('Read-only view')
    expect(wrapper.findAll('.edit-element')).toHaveLength(0)
    expect(wrapper.findAll('.layout-controls')).toHaveLength(0)
    expect(wrapper.find('.forest.align-end').exists()).toBe(true)
    expect(wrapper.find('.branch.horizontal').exists()).toBe(true)
    await wrapper.get('.concept-card').trigger('click')
    await flushPromises()
    expect(wrapper.get('a[href="/techniques/tech"]').text()).toContain('Knee cut')
    expect(wrapper.get('a[href="/assets/asset"]').text()).toContain('Passing lesson')
    expect(wrapper.get('a[href="/curricula/course"]').text()).toContain('Passing curriculum')
    expect(mocks.put).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('prevents even admins from editing in read-only preview', async () => {
    const wrapper = await render(true)
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
  it('renders trees loaded from API responses containing null link arrays', async () => {
    mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? { ...forest, nodes: [{ ...root, assetIds: null, techniqueIds: null, curriculumIds: null }] } : [])
    const wrapper = await render(true)
    await flushPromises()
    expect(wrapper.get('.concept-card').text()).toContain('0 techniques · 0 assets')
    await wrapper.get('.concept-card').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('No assets linked yet.')
    wrapper.unmount()
  })
  it('restores saved controls and chart after a rejected layout save', async () => {
    mocks.put.mockRejectedValue(new Error('Reload before trying again.'))
    const wrapper = await render()
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
    const wrapper = await render(true)
    await flushPromises()
    expect(wrapper.find('.forest.align-center').exists()).toBe(true)
    expect(wrapper.find('.branch.horizontal').exists()).toBe(false)
    wrapper.unmount()
  })
  it('saves family layout without changing links or other node data', async () => {
    mocks.put.mockImplementation(async (_url, body) => ({ ...forest, nodes: body.nodes, revision: 3 }))
    const wrapper = await render()
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

const branch = { ...root, id: 'branch', parentId: 'family', name: 'Pressure' }
const leaf = { ...root, id: 'leaf', parentId: 'branch', name: 'Knee cut' }
const secondFamily = { ...root, id: 'other', name: 'Guard' }

describe('concept tree URLs and curriculum associations', () => {
  it('opens a leaf in the URL discipline and retains that context in share and edit links', async () => {
    mocks.discipline.activeDisciplineId = 'jkd'
    mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? { ...forest, nodes: [root, branch, leaf, secondFamily] } : [])
    const wrapper = await render(true, '/concept-trees/view?disciplineId=bjj&nodeId=leaf')
    await flushPromises()
    expect(mocks.discipline.activeDisciplineId).toBe('bjj')
    expect(mocks.get).toHaveBeenCalledWith('/api/v1/concept-trees?disciplineId=bjj')
    expect(wrapper.get('.details h2').text()).toBe('Knee cut')
    expect(wrapper.findAll('.family-chart')).toHaveLength(1)
    expect(wrapper.get('.breadcrumb').text()).toBe('Passing / Pressure / Knee cut')
    expect(wrapper.get('a.view-mode-link').attributes('href')).toBe('/concept-trees?disciplineId=bjj&nodeId=leaf')
    expect(wrapper.get('.details a.element-link').attributes('href')).toBe('/concept-trees/view?disciplineId=bjj&nodeId=leaf')
    wrapper.unmount()
  })
  it('restores family and element selection on browser back and forward without refetching', async () => {
    mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? { ...forest, nodes: [root, branch, leaf, secondFamily] } : [])
    const wrapper = await render(true)
    await flushPromises()
    wrapper.getComponent(ConceptBranch).vm.$emit('select', 'leaf')
    await flushPromises()
    expect(router.currentRoute.value.query.nodeId).toBe('leaf')
    const filter = wrapper.findAllComponents({ name: 'Select' }).find(s => s.props('ariaLabel') === 'Filter by family')!
    filter.vm.$emit('update:modelValue', 'other')
    await flushPromises()
    expect(wrapper.get('.details h2').text()).toBe('Guard')
    router.back()
    await flushPromises()
    expect(wrapper.get('.details h2').text()).toBe('Knee cut')
    router.forward()
    await flushPromises()
    expect(wrapper.get('.details h2').text()).toBe('Guard')
    expect(mocks.get).toHaveBeenCalledTimes(4)
    wrapper.unmount()
  })
  it('resolves an existing URL after a branch is moved and renamed', async () => {
    mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? { ...forest, nodes: [root, { ...branch, parentId: 'other', name: 'Renamed' }, leaf, secondFamily] } : [])
    const wrapper = await render(true, '/concept-trees/view?disciplineId=bjj&nodeId=leaf')
    await flushPromises()
    expect(wrapper.get('.family-toolbar h2').text()).toBe('Guard')
    expect(wrapper.get('.breadcrumb').text()).toBe('Guard / Renamed / Knee cut')
    wrapper.unmount()
  })
  it('shows a useful message for a deleted element and allows returning to all families', async () => {
    const wrapper = await render(true, '/concept-trees/view?disciplineId=bjj&nodeId=deleted')
    await flushPromises()
    expect(wrapper.text()).toContain('Tree element not found')
    const button = wrapper.findAll('button').find(b => b.text() === 'Show all families')!
    await button.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.nodeId).toBeUndefined()
    expect(wrapper.get('.concept-card').text()).toContain('Passing')
    wrapper.unmount()
  })
  it('clears the URL selection when changing disciplines and restores it on back navigation', async () => {
    mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? { ...forest, disciplineId: url.includes('jkd') ? 'jkd' : 'bjj' } : [])
    const wrapper = await render(true, '/concept-trees/view?disciplineId=bjj&nodeId=family')
    await flushPromises()
    mocks.discipline.setActiveDiscipline('jkd')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ disciplineId: 'jkd' })
    expect(wrapper.find('.details').exists()).toBe(false)
    router.back()
    await flushPromises()
    expect(mocks.discipline.activeDisciplineId).toBe('bjj')
    expect(wrapper.get('.details h2').text()).toBe('Passing')
    wrapper.unmount()
  })
  it.each(['family', 'branch', 'leaf'])('can associate and remove curricula on %s', async id => {
    const data = { ...forest, nodes: [root, branch, leaf].map(n => ({ ...n, curriculumIds: [] })) }
    mocks.get.mockImplementation(async (url: string) => url.includes('concept-trees') ? structuredClone(data) : url.includes('curricula') ? [{ id: 'course', title: 'Passing curriculum' }] : [])
    mocks.put.mockImplementation(async (_url, body) => ({ ...data, nodes: body.nodes, revision: body.revision + 1 }))
    const wrapper = await render(false, `/concept-trees?disciplineId=bjj&nodeId=${id}`)
    await flushPromises()
    const edit = wrapper.findAll('button').find(b => b.text() === 'Edit / link')!
    await edit.trigger('click')
    await flushPromises()
    const curricula = wrapper.findAllComponents({ name: 'MultiSelect' }).find(s => s.props('inputId') === 'concept-curricula')!
    expect(curricula.props('options')).toEqual([{ id: 'course', title: 'Passing curriculum' }])
    curricula.vm.$emit('update:modelValue', ['course'])
    await wrapper.get('form.node-form').trigger('submit')
    await flushPromises()
    expect(mocks.put.mock.calls[0]![1].nodes.find((n: { id: string }) => n.id === id).curriculumIds).toEqual(['course'])
    expect(wrapper.get('a[href="/curricula/course"]').text()).toContain('Passing curriculum')
    await edit.trigger('click')
    await flushPromises()
    wrapper.findAllComponents({ name: 'MultiSelect' }).find(s => s.props('inputId') === 'concept-curricula')!.vm.$emit('update:modelValue', [])
    await wrapper.get('form.node-form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('No curricula linked yet.')
    wrapper.unmount()
  })
})
