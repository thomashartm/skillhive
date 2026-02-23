<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Techniques Card -->
    <Card class="stat-card" @click="$emit('click:techniques')">
      <template #content>
        <div class="flex items-center gap-4">
          <div class="bg-blue-900/40 p-3">
            <i class="pi pi-bookmark text-blue-400 text-2xl"></i>
          </div>
          <div>
            <div class="text-slate-400 text-sm">Techniques</div>
            <div class="text-3xl font-bold">{{ techniqueCount }}</div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Assets Card -->
    <Card class="stat-card" @click="$emit('click:assets')">
      <template #content>
        <div class="flex items-center gap-4">
          <div class="bg-purple-900/40 p-3">
            <i class="pi pi-video text-purple-400 text-2xl"></i>
          </div>
          <div>
            <div class="text-slate-400 text-sm">Assets</div>
            <div class="text-3xl font-bold">{{ assetCount }}</div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Curricula Card -->
    <Card class="stat-card" @click="$emit('click:curricula')">
      <template #content>
        <div class="flex items-center gap-4">
          <div class="bg-green-900/40 p-3">
            <i class="pi pi-list text-green-400 text-2xl"></i>
          </div>
          <div>
            <div class="text-slate-400 text-sm">Curricula</div>
            <div class="text-3xl font-bold">{{ curriculumCount }}</div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card'

interface Props {
  techniqueCount: number
  assetCount: number
  curriculumCount: number
}

defineProps<Props>()

defineEmits<{
  'click:techniques': []
  'click:assets': []
  'click:curricula': []
}>()
</script>

<style scoped>
.stat-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
