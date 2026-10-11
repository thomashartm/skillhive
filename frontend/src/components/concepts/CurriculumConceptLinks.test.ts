import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CurriculumConceptLinks from './CurriculumConceptLinks.vue'

const get = vi.hoisted(() => vi.fn())
vi.mock('../../composables/useApi', () => ({ useApi: () => ({ get }) }))
const options = {
  props: { curriculumId: 'course', disciplineId: 'bjj' },
  global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
}
it('links back to each associated level and ignores legacy and unrelated nodes', async () => {
  get.mockResolvedValue({ nodes: [
    { id: 'family', parentId: '', name: 'Guard', curriculumIds: ['course'] },
    { id: 'branch', parentId: 'family', name: 'Half guard', curriculumIds: ['course'] },
    { id: 'leaf', parentId: 'branch', name: 'Frames', curriculumIds: ['course'] },
    { id: 'legacy', parentId: '', name: 'Legacy', curriculumIds: null },
    { id: 'other', parentId: '', name: 'Other', curriculumIds: ['other-course'] },
  ] })
  const wrapper = mount(CurriculumConceptLinks, options)
  await flushPromises()
  expect(get).toHaveBeenCalledWith('/api/v1/concept-trees?disciplineId=bjj')
  expect(wrapper.findAll('a').map(a => a.attributes('href'))).toEqual(['family', 'branch', 'leaf'].map(id => `/concept-trees/view?disciplineId=bjj&nodeId=${id}`))
  expect(wrapper.findAll('a')[2]!.text()).toContain('Guard / Half guard / Frames')
  wrapper.unmount()
})

describe('optional tree links', () => {
  it('does not show an empty section for an unassociated curriculum', async () => {
    get.mockResolvedValue({ nodes: [] })
    const wrapper = mount(CurriculumConceptLinks, options)
    await flushPromises()
    expect(wrapper.find('section').exists()).toBe(false)
    wrapper.unmount()
  })
  it('shows an error without blocking the curriculum', async () => {
    get.mockRejectedValue(new Error('offline'))
    const wrapper = mount(CurriculumConceptLinks, options)
    await flushPromises()
    expect(wrapper.text()).toContain('Could not load linked concept trees.')
    wrapper.unmount()
  })
})
