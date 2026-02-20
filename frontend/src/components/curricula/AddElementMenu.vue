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
  'add-image': []
  'add-list': []
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
  },
  {
    label: 'Add Image',
    icon: 'pi pi-image',
    command: () => emit('add-image')
  },
  {
    label: 'Add List',
    icon: 'pi pi-list',
    command: () => emit('add-list')
  }
])

const toggle = (event: Event) => {
  menu.value.toggle(event)
}
</script>
