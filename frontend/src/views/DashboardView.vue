<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Dashboard</h1>
    </div>

    <!-- No Discipline Warning -->
    <div v-if="!activeDisciplineId" class="mb-6">
      <Card class="bg-yellow-50 border-yellow-200">
        <template #content>
          <div class="flex items-center gap-3">
            <i class="pi pi-exclamation-triangle text-yellow-600 text-2xl"></i>
            <div>
              <p class="font-semibold text-yellow-800">No Discipline Selected</p>
              <p class="text-sm text-yellow-700">Please select a discipline to view your dashboard</p>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Dashboard Content (only show when discipline is selected) -->
    <div v-else class="space-y-6">
      <!-- Quick Stats -->
      <QuickStats
        :technique-count="techniques.length"
        :asset-count="assets.length"
        :curriculum-count="curricula.length"
      />

      <!-- Main Content: Two Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Recent Curricula (2/3 width on large screens) -->
        <div class="lg:col-span-2">
          <RecentCurricula
            :curricula="recentCurricula"
            @view="handleViewCurriculum"
          />
        </div>

        <!-- Right Column: Quick Save Video (1/3 width on large screens) -->
        <div class="lg:col-span-1">
          <QuickSaveVideo @saved="handleVideoSaved" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import QuickStats from '../components/dashboard/QuickStats.vue'
import RecentCurricula from '../components/dashboard/RecentCurricula.vue'
import QuickSaveVideo from '../components/dashboard/QuickSaveVideo.vue'
import { useCurriculumStore } from '../stores/curricula'
import { useTechniqueStore } from '../stores/techniques'
import { useAssetStore } from '../stores/assets'
import { useDisciplineStore } from '../stores/discipline'

const router = useRouter()
const curriculumStore = useCurriculumStore()
const techniqueStore = useTechniqueStore()
const assetStore = useAssetStore()
const disciplineStore = useDisciplineStore()

const { curricula } = storeToRefs(curriculumStore)
const { techniques } = storeToRefs(techniqueStore)
const { assets } = storeToRefs(assetStore)
const { activeDisciplineId } = storeToRefs(disciplineStore)

// Computed: Recent Curricula (top 5 by updatedAt)
const recentCurricula = computed(() => {
  return [...curricula.value]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
})

// Load all data
const loadData = async () => {
  if (!activeDisciplineId.value) {
    return
  }

  await Promise.all([
    curriculumStore.fetchCurricula(),
    techniqueStore.fetchTechniques(),
    assetStore.fetchAssets()
  ])
}

// Initial load
onMounted(() => {
  loadData()
})

// Watch for discipline changes
watch(activeDisciplineId, () => {
  loadData()
})

// Event handlers
const handleViewCurriculum = (curriculum: any) => {
  router.push(`/curricula/${curriculum.id}`)
}

const handleVideoSaved = () => {
  // Refresh assets after saving a new video
  assetStore.fetchAssets()
}
</script>
