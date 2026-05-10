<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '../services/api'

// No necesitamos la constante API
const myList = ref<any[]>([])
const loading = ref(true)

const fetchList = async () => {
  loading.value = true
  try {
    myList.value = await api.getAll()
  } catch (e) {
    console.error('Error loading list:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

// Estadísticas calculadas (Computed properties)
const totalEpisodes = computed(() =>
  myList.value.reduce((sum, a) => sum + (a.episodesWatched || a.episodes || 0), 0)
)

const totalHours = computed(() => Math.round(totalEpisodes.value * 24 / 60))
const totalDays = computed(() => (totalHours.value / 24).toFixed(1))

const scoreDistribution = computed(() => {
  const dist: Record<number, number> = {}
  for (let i = 1; i <= 10; i++) dist[i] = 0
  myList.value.filter(a => a.userScore).forEach(a => {
    dist[a.userScore] = (dist[a.userScore] || 0) + 1
  })
  const maxVal = Math.max(...Object.values(dist), 1)
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1
    return { score: n, count: dist[n] || 0, pct: Math.round(((dist[n] || 0) / maxVal) * 100) }
  })
})

const statusDistribution = computed(() => {
  const statuses = ['Visto', 'Viendo', 'Pendiente', 'En Espera', 'Abandonado']
  const total = myList.value.length || 1
  return statuses.map(s => ({
    label: s,
    count: myList.value.filter(a => a.watchStatus === s).length,
    pct: Math.round((myList.value.filter(a => a.watchStatus === s).length / total) * 100),
  }))
})

// Cálculo de los géneros más vistos
const topGenres = computed(() => {
  const map: Record<string, number> = {}
  myList.value.forEach(a => {
    if (!a.genres) return
    a.genres.split(', ').forEach((g: string) => {
      const genre = g.trim()
      map[genre] = (map[genre] || 0) + 1
    })
  })
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const max = sorted[0]?.[1] || 1
  return sorted.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
})

// Desglose de estados para el gráfico de tipo donut
const donutSegments = computed(() => {
  const statuses = [
    { label: 'Visto', color: '#22c55e' },
    { label: 'Viendo', color: '#3b82f6' },
    { label: 'Pendiente', color: '#a855f7' },
    { label: 'En Espera', color: '#eab308' },
    { label: 'Abandonado', color: '#ef4444' },
  ]
  const total = myList.value.length || 1
  let cumulative = 0
  return statuses.map(s => {
    const count = myList.value.filter(a => a.watchStatus === s.label).length
    const pct = count / total
    const start = cumulative
    cumulative += pct
    return { ...s, count, pct: Math.round(pct * 100), start, end: cumulative }
  })
})

// Generación del gradiente cónico para el gráfico donut
const donutGradient = computed(() => {
  if (myList.value.length === 0) return 'conic-gradient(#374151 0% 100%)'
  const parts = donutSegments.value
    .filter(s => s.count > 0)
    .map(s => `${s.color} ${Math.round(s.start * 360)}deg ${Math.round(s.end * 360)}deg`)
  return `conic-gradient(${parts.join(', ')})`
})

const scoreColors: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#eab308',
  5: '#84cc16', 6: '#22c55e', 7: '#14b8a6', 8: '#3b82f6', 9: '#8b5cf6', 10: '#ec4899',
}

const statusColors: Record<string, string> = {
  Visto: 'bg-green-500', Viendo: 'bg-blue-500', Pendiente: 'bg-purple-500',
  'En Espera': 'bg-yellow-500', Abandonado: 'bg-red-500',
}
const statusEmoji: Record<string, string> = {
  Visto: '✅', Viendo: '▶️', Pendiente: '📌', 'En Espera': '⏸️', Abandonado: '❌',
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center items-center h-48">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
    </div>

    <div v-else-if="myList.length === 0" class="text-center py-20 text-gray-500">
      <p class="text-5xl mb-4">📊</p>
      <p class="text-lg font-semibold text-gray-300 mb-1">Aún no hay datos que mostrar</p>
      <p class="text-sm">Añade animes a tu lista para ver estadísticas.</p>
    </div>

    <div v-else class="space-y-6">

      <!-- Tarjetas de resumen cuantitativo -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-gray-800/60 border border-gray-700/40 rounded-2xl p-5 text-center">
          <p class="text-4xl font-bold text-white">{{ myList.length }}</p>
          <p class="text-gray-400 text-sm mt-1">Animes en lista</p>
        </div>
        <div class="bg-blue-900/30 border border-blue-700/30 rounded-2xl p-5 text-center">
          <p class="text-4xl font-bold text-blue-400">{{ totalEpisodes.toLocaleString() }}</p>
          <p class="text-gray-400 text-sm mt-1">Episodios vistos</p>
        </div>
        <div class="bg-purple-900/30 border border-purple-700/30 rounded-2xl p-5 text-center">
          <p class="text-4xl font-bold text-purple-400">{{ totalHours.toLocaleString() }}</p>
          <p class="text-gray-400 text-sm mt-1">Horas invertidas</p>
        </div>
        <div class="bg-amber-900/30 border border-amber-700/30 rounded-2xl p-5 text-center">
          <p class="text-4xl font-bold text-amber-400">{{ totalDays }}</p>
          <p class="text-gray-400 text-sm mt-1">Días de anime</p>
        </div>
      </div>

      <!-- Fila de distribución: Gráfico de donut y Top Géneros -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- Donut breakdown por estado -->
        <div class="bg-gray-800/50 border border-gray-700/30 rounded-2xl p-6">
          <h3 class="text-white font-bold mb-5 text-base">🍩 Distribución por Estado</h3>
          <div class="flex items-center gap-6">
            <!-- Gráfico visual de Donut -->
            <div
              class="shrink-0 w-32 h-32 rounded-full"
              :style="{
                background: donutGradient,
                '--hole': '60%',
              }"
              style="
                mask: radial-gradient(circle, transparent 38%, black 39%);
                -webkit-mask: radial-gradient(circle, transparent 38%, black 39%);
              "
            ></div>
            <!-- Leyenda detallada por estado -->
            <div class="space-y-2 flex-1">
              <div
                v-for="seg in donutSegments"
                :key="seg.label"
                class="flex items-center gap-2"
              >
                <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: seg.color }"></span>
                <span class="text-gray-300 text-sm flex-1 truncate">{{ statusEmoji[seg.label] }} {{ seg.label }}</span>
                <span class="text-white font-semibold text-sm">{{ seg.count }}</span>
                <span class="text-gray-500 text-xs w-8 text-right">{{ seg.pct }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Géneros Destacados -->
        <div class="bg-gray-800/50 border border-gray-700/30 rounded-2xl p-6">
          <h3 class="text-white font-bold mb-5 text-base">🏆 Top Géneros Destacados</h3>
          <div v-if="topGenres.length === 0" class="text-gray-500 text-sm">No hay géneros en tu lista.</div>
          <div v-else class="space-y-3">
            <div v-for="genre in topGenres" :key="genre.name" class="flex items-center gap-3">
              <span class="text-gray-300 text-xs w-24 shrink-0 truncate">{{ genre.name }}</span>
              <div class="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
                  :style="{ width: genre.pct + '%' }"
                ></div>
              </div>
              <span class="text-gray-400 text-xs w-5 text-right shrink-0">{{ genre.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Histograma de distribución de puntuaciones personales -->
      <div class="bg-gray-800/50 border border-gray-700/30 rounded-2xl p-6">
        <h3 class="text-white font-bold mb-5 text-base">⭐ Distribución de Puntuaciones</h3>
        <div class="flex items-end gap-2 h-36">
          <div
            v-for="item in scoreDistribution"
            :key="item.score"
            class="flex-1 flex flex-col items-center gap-1"
          >
            <span class="text-gray-400 text-xs">{{ item.count || '' }}</span>
            <div
              class="w-full rounded-t-md transition-all duration-700"
              :style="{
                height: item.pct + '%',
                minHeight: item.count > 0 ? '6px' : '0',
                background: scoreColors[item.score],
                opacity: item.count > 0 ? 1 : 0.15,
              }"
            ></div>
            <span class="text-gray-500 text-xs">{{ item.score }}</span>
          </div>
        </div>
      </div>

      <!-- Desglose detallado de animes por estado de visualización -->
      <div class="bg-gray-800/50 border border-gray-700/30 rounded-2xl p-6">
        <h3 class="text-white font-bold mb-5 text-base">📋 Animes por Estado</h3>
        <div class="space-y-3">
          <div v-for="s in statusDistribution" :key="s.label" class="flex items-center gap-3">
            <span class="text-gray-300 text-xs w-24 shrink-0">{{ statusEmoji[s.label] }} {{ s.label }}</span>
            <div class="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="statusColors[s.label]"
                :style="{ width: s.pct + '%' }"
              ></div>
            </div>
            <span class="text-white font-semibold text-sm w-5 text-right shrink-0">{{ s.count }}</span>
            <span class="text-gray-500 text-xs w-8 text-right shrink-0">{{ s.pct }}%</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
