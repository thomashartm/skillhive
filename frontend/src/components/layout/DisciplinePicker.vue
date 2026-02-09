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
    class="w-full discipline-select"
    @update:modelValue="onSelect({ value: $event })"
  />
</template>

<style scoped>
.discipline-select {
  font-size: 0.75rem;
  width: 10rem;
  min-width: 10rem;
  max-width: 10rem;
}

.discipline-select :deep(.p-select-label) {
  font-size: 0.75rem;
  padding: 0.375rem 0.5rem;
}

.discipline-select :deep(.p-select-list-container) {
  font-size: 0.75rem;
}

.discipline-select :deep(.p-select-option) {
  font-size: 0.75rem;
  padding: 0.375rem 0.5rem;
}
</style>
