<template>
  <div>
    <Button
      label="Add Element"
      icon="pi pi-plus"
      @click="toggle"
      aria-haspopup="true"
      aria-controls="add-element-menu"
    />
    <Menu ref="menu" id="add-element-menu" :model="items" :popup="true" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'

const emit = defineEmits<{
  'add-technique': []
  'add-asset': []
  'add-text': []
}>()

const menu = ref()

const items = ref([
  {
    label: 'Add Technique',
    icon: 'pi pi-bookmark',
    command: () => emit('add-technique')
  },
  {
    label: 'Add Asset',
    icon: 'pi pi-video',
    command: () => emit('add-asset')
  },
  {
    label: 'Add Text Note',
    icon: 'pi pi-align-left',
    command: () => emit('add-text')
  }
])

const toggle = (event: Event) => {
  menu.value.toggle(event)
}
</script>
