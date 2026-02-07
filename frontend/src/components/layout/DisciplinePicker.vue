<script setup lang="ts">
import { onMounted } from 'vue'
import Select from 'primevue/select'
import { useDisciplineStore } from '../../stores/discipline'

const disciplineStore = useDisciplineStore()

onMounted(() => {
  if (disciplineStore.disciplines.length === 0) {
    disciplineStore.fetchDisciplines()
  }
})

function onSelect(event: { value: string }) {
  disciplineStore.setActiveDiscipline(event.value)
}
</script>

<template>
  <Select
    :modelValue="disciplineStore.activeDisciplineId"
    :options="disciplineStore.disciplines"
    optionLabel="name"
    optionValue="id"
    placeholder="Select Discipline"
    :loading="disciplineStore.loading"
    class="w-full"
    @update:modelValue="onSelect({ value: $event })"
  />
</template>
