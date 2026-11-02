<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, type EdgeProps } from '@vue-flow/core'

const props = defineProps<EdgeProps<{ condition: string; lane: number }>>()
const curve = computed(() => {
  const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty } = props
  const lane = props.data.lane
  if (props.source === props.target || tx <= sx) {
    const top = Math.min(sy, ty) - 100 - lane * 45
    return { path: `M ${sx} ${sy} C ${sx + 80} ${sy}, ${sx + 80} ${top}, ${sx} ${top} L ${tx} ${top} C ${tx - 80} ${top}, ${tx - 80} ${ty}, ${tx} ${ty}`, x: (sx + tx) / 2, y: top }
  }
  const bend = Math.max(50, (tx - sx) / 2)
  const offset = lane * 60
  return { path: `M ${sx} ${sy} C ${sx + bend} ${sy + offset}, ${tx - bend} ${ty + offset}, ${tx} ${ty}`, x: (sx + tx) / 2, y: (sy + ty) / 2 + offset * 0.75 }
})
const label = computed(() => props.data.condition.length > 60 ? props.data.condition.slice(0, 57) + '…' : props.data.condition)
</script>

<template>
  <BaseEdge :id="id" :path="curve.path" :marker-end="markerEnd" :label="label" :label-x="curve.x" :label-y="curve.y"
    :style="{ stroke: selected ? '#38bdf8' : '#94a3b8', strokeWidth: selected ? 3 : 2 }"
    :label-style="{ fill: '#e2e8f0', fontSize: 12 }" :label-bg-style="{ fill: '#0f172a' }" :label-bg-padding="[8, 5]" />
  <title>{{ data.condition || 'Transition' }}</title>
</template>
