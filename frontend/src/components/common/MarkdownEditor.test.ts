import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PrimeVue from 'primevue/config'
import MarkdownEditor from './MarkdownEditor.vue'

describe('Markdown editor', () => {
  it('formats selected text without losing surrounding content and previews it safely', async () => {
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: 'Keep your grip secure', id: 'description', 'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }) },
      global: { plugins: [PrimeVue] },
    })
    const input = wrapper.get('textarea').element
    input.setSelectionRange(10, 14)
    await wrapper.get('button[aria-label="Bold"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Keep your **grip** secure'])
    await wrapper.get('button[aria-label="Preview Markdown"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('strong').text()).toBe('grip')
    await wrapper.setProps({ modelValue: '<script>alert(1)</script>[bad](javascript:alert(1))' })
    await flushPromises()
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('a[href^="javascript:"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('does not edit while disabled', async () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: 'Saved', id: 'description', disabled: true }, global: { plugins: [PrimeVue] } })
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
    await wrapper.get('button[aria-label="Bold"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
