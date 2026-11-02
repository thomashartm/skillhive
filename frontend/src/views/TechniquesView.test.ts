import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PrimeVue from 'primevue/config'
import Dropdown from 'primevue/dropdown'
import Tooltip from 'primevue/tooltip'
import DataTable from 'primevue/datatable'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import TechniquesView from './TechniquesView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../composables/useApi', () => ({ useApi: () => ({ get: mocks.get }) }))
vi.mock('../stores/auth', () => ({ useAuthStore: () => ({ canEdit: false }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: vi.fn() }) }))

const names = ['armbar', ' Arm drag', 'Évasion', 'Bridge', '50/50 guard', ...Array.from({ length: 12 }, (_, i) => `Sweep ${i}`)]
const techniques = names.map((name, i) => ({ id: String(i), name, categoryIds: [], tagIds: [] }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('localStorage', { getItem: () => 'bjj', setItem: vi.fn() })
  mocks.get.mockImplementation(async (url: string) => url.includes('/techniques?') ? techniques : [])
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
let router: Router
async function render() {
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/techniques', component: TechniquesView },
    { path: '/techniques/:id', component: { template: '<div>Technique detail</div>' } },
  ] })
  await router.push('/techniques')
  const wrapper = mount(RouterView, {
    global: { plugins: [createPinia(), PrimeVue, router], directives: { tooltip: Tooltip }, stubs: { TechniqueForm: true } },
  })
  await flushPromises()
  return wrapper
}

describe('technique alphabet filter', () => {
  it('restores B, page size 50, page position, and sorting after detail and browser Back', async () => {
    const bridges = Array.from({ length: 120 }, (_, i) => ({ id: `b${i}`, name: `Bridge ${String(i).padStart(3, '0')}`, categoryIds: [], tagIds: [] }))
    mocks.get.mockImplementation(async (url: string) => url.includes('/techniques?') ? [...techniques, ...bridges] : [])
    const wrapper = await render()
    await wrapper.get('[aria-label="Filter techniques by first letter"]').findAll('button').find(button => button.text() === 'B')!.trigger('click')
    const table = wrapper.getComponent(DataTable)
    table.vm.$emit('sort', { sortField: 'name', sortOrder: -1 })
    table.vm.$emit('page', { first: 50, rows: 50 })
    await flushPromises()
    const before = wrapper.findAll('.technique-name').map(row => row.text())
    expect(before).toHaveLength(50)
    await wrapper.get('.technique-name').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toBe('Technique detail')
    router.back()
    await flushPromises()
    expect(wrapper.findAll('.technique-name').map(row => row.text())).toEqual(before)
    expect(wrapper.getComponent(DataTable).props()).toMatchObject({ first: 50, rows: 50, sortField: 'name', sortOrder: -1 })
    expect(wrapper.get('[aria-label="Filter techniques by first letter"]').findAll('button').find(button => button.text() === 'B')!.attributes('aria-pressed')).toBe('true')
    await wrapper.get('.technique-name').trigger('click')
    await flushPromises()
    mocks.get.mockImplementation(async (url: string) => url.includes('/techniques?') ? bridges.slice(0, 20) : [])
    router.back()
    await flushPromises()
    expect(wrapper.getComponent(DataTable).props()).toMatchObject({ first: 0, rows: 50 })
    expect(wrapper.findAll('.technique-name')).toHaveLength(20)
    await wrapper.get('[aria-label="Filter techniques by first letter"]').findAll('button').find(button => button.text() === 'A')!.trigger('click')
    expect(wrapper.getComponent(DataTable).props()).toMatchObject({ first: 0, rows: 50 })
    wrapper.unmount()
  })

  it('filters by initial, ignores case and accents, and restores all results', async () => {
    const wrapper = await render()
    const menu = wrapper.get('[aria-label="Filter techniques by first letter"]')
    const select = (label: string) => menu.findAll('button').find(button => button.text() === label)!
    expect(menu.findAll('button')).toHaveLength(28)
    await select('A').trigger('click')
    expect(wrapper.findAll('.technique-name').map(row => row.text())).toEqual(['armbar', 'Arm drag'])
    expect(select('A').attributes('aria-pressed')).toBe('true')
    await select('E').trigger('click')
    expect(wrapper.findAll('.technique-name').map(row => row.text())).toEqual(['Évasion'])
    await select('#').trigger('click')
    expect(wrapper.findAll('.technique-name').map(row => row.text())).toEqual(['50/50 guard'])
    await select('Z').trigger('click')
    expect(wrapper.text()).toContain('No techniques found')
    await select('All').trigger('click')
    expect(wrapper.findAll('.technique-name')).toHaveLength(10)
    expect(mocks.get.mock.calls.filter(([url]) => url.includes('/techniques?'))).toHaveLength(1)
    wrapper.unmount()
  })

  it('returns to the first page when a letter is selected', async () => {
    const wrapper = await render()
    await wrapper.get('button[aria-label="Next Page"]').trigger('click')
    expect(wrapper.findAll('.technique-name').map(row => row.text())).not.toContain('Bridge')
    await wrapper.get('[aria-label="Filter techniques by first letter"]').findAll('button').find(button => button.text() === 'B')!.trigger('click')
    expect(wrapper.findAll('.technique-name').map(row => row.text())).toEqual(['Bridge'])
    wrapper.unmount()
  })

  it('combines the letter with category, tag, and search filters', async () => {
    const wrapper = await render()
    await wrapper.get('[aria-label="Filter techniques by first letter"]').findAll('button').find(button => button.text() === 'A')!.trigger('click')
    mocks.get.mockResolvedValue([techniques[0], techniques[3]])
    const [category, tag] = wrapper.findAllComponents(Dropdown)
    category!.vm.$emit('update:modelValue', 'grips')
    tag!.vm.$emit('update:modelValue', 'beginner')
    tag!.vm.$emit('change')
    await flushPromises()
    expect(mocks.get).toHaveBeenLastCalledWith('/api/v1/techniques?disciplineId=bjj&categoryId=grips&tagId=beginner')
    expect(wrapper.findAll('.technique-name').map(row => row.text())).toEqual(['armbar'])
    vi.useFakeTimers()
    await wrapper.get('input[placeholder="Search techniques..."]').setValue('arm')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(mocks.get).toHaveBeenLastCalledWith('/api/v1/techniques?disciplineId=bjj&categoryId=grips&tagId=beginner&q=arm')
    expect(wrapper.findAll('.technique-name').map(row => row.text())).toEqual(['armbar'])
    vi.useRealTimers()
    await wrapper.get('.technique-name').trigger('click')
    await flushPromises()
    router.back()
    await flushPromises()
    expect((wrapper.get('input[placeholder="Search techniques..."]').element as HTMLInputElement).value).toBe('arm')
    expect(wrapper.findAllComponents(Dropdown).map(dropdown => dropdown.props('modelValue'))).toEqual(['grips', 'beginner'])
    expect(wrapper.findAll('.technique-name').map(row => row.text())).toEqual(['armbar'])
    wrapper.unmount()
  })
})
