<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '../services/api'

const emit = defineEmits(['open-anime'])

// No necesitamos la constante API aquí

const myList = ref<any[]>([])
const loading = ref(true)
const activeTab = ref('Todos')
const filterGenre = ref('')
const filterMinScore = ref(0)
const sortBy = ref('title')
const editingNotes = ref<number | null>(null)
const tempNotes = ref('')
const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>(
  (localStorage.getItem('myListViewMode') as 'list' | 'grid') || 'list'
)

const TABS = [
  { key: 'Todos', label: 'Todos', emoji: '📋' },
  { key: 'Viendo', label: 'Viendo', emoji: '▶️' },
  { key: 'Al día', label: 'Al día', emoji: '📺' },
  { key: 'Pendiente', label: 'Pendientes', emoji: '📌' },
  { key: 'Visto', label: 'Vistos', emoji: '✅' },
  { key: 'En Espera', label: 'En Espera', emoji: '⏸️' },
  { key: 'Abandonado', label: 'Abandonados', emoji: '❌' },
]

const watchStatusOptions = ['Visto', 'Viendo', 'Al día', 'En Espera', 'Pendiente', 'Abandonado']
const watchStatusEmoji: Record<string, string> = {
  'Visto': '✅', 'Viendo': '▶️', 'Al día': '📺', 'En Espera': '⏸️', 'Pendiente': '📌', 'Abandonado': '❌',
}
const statusBadge: Record<string, string> = {
  'Visto':     'bg-emerald-500/15 text-emerald-300 border-emerald-400/40 shadow-emerald-500/10',
  'Viendo':    'bg-blue-500/15 text-blue-300 border-blue-400/40 shadow-blue-500/10',
  'Al día':   'bg-cyan-500/15 text-cyan-300 border-cyan-400/40 shadow-cyan-500/10',
  'En Espera': 'bg-amber-500/15 text-amber-300 border-amber-400/40 shadow-amber-500/10',
  'Pendiente': 'bg-violet-500/15 text-violet-300 border-violet-400/40 shadow-violet-500/10',
  'Abandonado':'bg-rose-500/15 text-rose-300 border-rose-400/40 shadow-rose-500/10',
}

const setViewMode = (mode: 'list' | 'grid') => {
  viewMode.value = mode
  localStorage.setItem('myListViewMode', mode)
}

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

const removeFromList = async (malId: number) => {
  if (!confirm('¿Eliminar de tu lista?')) return
  await api.delete(malId)
  myList.value = myList.value.filter(a => a.malId !== malId)
}

const updateField = async (item: any) => {
  await api.save(item)
}

const saveNotes = async (item: any) => {
  item.notes = tempNotes.value
  editingNotes.value = null
  await updateField(item)
}

const updateEpisodesWatched = async (item: any, value: number) => {
  item.episodesWatched = value
  await updateField(item)
}

const episodeProgress = (item: any) => {
  if (!item.episodes || item.episodes === 0) return 0
  return Math.round(((item.episodesWatched || 0) / item.episodes) * 100)
}

const countByTab = (key: string) =>
  key === 'Todos' ? myList.value.length : myList.value.filter(a => a.watchStatus === key).length

const allGenresInList = computed(() => {
  const set = new Set<string>()
  myList.value.forEach(a => { if (a.genres) a.genres.split(', ').forEach((g: string) => set.add(g.trim())) })
  return Array.from(set).sort()
})

const filteredList = computed(() => {
  let list = activeTab.value === 'Todos'
    ? [...myList.value]
    : myList.value.filter(a => a.watchStatus === activeTab.value)

  if (filterGenre.value) list = list.filter(a => a.genres?.includes(filterGenre.value))
  if (filterMinScore.value > 0) list = list.filter(a => a.userScore >= filterMinScore.value)

  // Búsqueda por título
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.titleEnglish?.toLowerCase().includes(q)
    )
  }

  return list.sort((a, b) => {
    if (sortBy.value === 'score') return (b.userScore || 0) - (a.userScore || 0)
    if (sortBy.value === 'jikan_score') return (b.score || 0) - (a.score || 0)
    return a.title.localeCompare(b.title)
  })
})

const stats = computed(() => ({
  total: myList.value.length,
  watched: myList.value.filter(a => a.watchStatus === 'Visto').length,
  watching: myList.value.filter(a => a.watchStatus === 'Viendo').length,
  pending: myList.value.filter(a => a.watchStatus === 'Pendiente').length,
  avgScore: myList.value.filter(a => a.userScore).length
    ? (myList.value.filter(a => a.userScore).reduce((s, a) => s + a.userScore, 0) / myList.value.filter(a => a.userScore).length).toFixed(1)
    : '–',
}))

const exportCsv = async () => {
  const headers = await api.getHeaders()
  const res = await fetch(`http://localhost:8080/api/user-anime/export/csv`, { headers })
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mi_lista_anime.csv'
  a.click()
}

const openAnime = async (malId: number) => {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`)
    const data = await res.json()
    emit('open-anime', data.data)
  } catch {}
}

onMounted(fetchList)
defineExpose({ fetchList })
</script>

<template>
  <div>

    <!-- Tarjetas de estadísticas -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
      <div class="stat-card stat-gray">
        <p class="stat-number stat-num-gray">{{ stats.total }}</p>
        <p class="stat-label">📋 Total</p>
      </div>
      <div class="stat-card stat-blue">
        <p class="stat-number stat-num-blue">{{ stats.watching }}</p>
        <p class="stat-label">▶️ Viendo</p>
      </div>
      <div class="stat-card stat-purple">
        <p class="stat-number stat-num-purple">{{ stats.pending }}</p>
        <p class="stat-label">📌 Pendientes</p>
      </div>
      <div class="stat-card stat-green">
        <p class="stat-number stat-num-green">{{ stats.watched }}</p>
        <p class="stat-label">✅ Vistos</p>
      </div>
      <div class="stat-card stat-amber">
        <p class="stat-number stat-num-amber">{{ stats.avgScore }}</p>
        <p class="stat-label">⭐ Puntuación media</p>
      </div>
    </div>

    <!-- Barra de herramientas: búsqueda, vista y exportación -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <!-- Búsqueda interna en la lista -->
      <div class="relative flex-1 min-w-[180px]">
        <input v-model="searchQuery" type="text" placeholder="🔍 Buscar en mi lista..."
          class="w-full rounded-xl px-4 py-2 text-sm outline-none"
          style="background:var(--ml-bg);color:var(--ml-text);border:1px solid var(--ml-border);" />
        <button v-if="searchQuery" @click="searchQuery = ''"
          class="absolute right-3 top-2 text-xs" style="color:#64748b">✕</button>
      </div>

      <!-- Selector de vista: Cuadrícula o Lista -->
      <div class="flex rounded-xl overflow-hidden shrink-0" style="background:var(--ml-bg-2);border:1px solid var(--ml-border);">
        <button @click="setViewMode('list')" class="btn-view px-3 py-2 text-sm" title="Vista lista"
          :class="viewMode === 'list' ? 'active' : ''"
          :style="viewMode === 'list' ? 'background:#2563eb;color:white' : 'color:#64748b'">☰</button>
        <button @click="setViewMode('grid')" class="btn-view px-3 py-2 text-sm" title="Vista cuadrícula"
          :class="viewMode === 'grid' ? 'active' : ''"
          :style="viewMode === 'grid' ? 'background:#2563eb;color:white' : 'color:#64748b'">⊞</button>
      </div>

      <!-- Exportar la lista actual a CSV -->
      <button @click="exportCsv"
        class="btn-export rounded-xl px-4 py-2 text-sm flex items-center gap-1.5 shrink-0"
        style="background:var(--ml-bg-2);color:#64748b;border:1px solid var(--ml-border);"
        title="Exportar lista como CSV">
        📤 Exportar CSV
      </button>
    </div>

    <!-- Pestañas de filtrado por estado -->
    <div class="flex gap-1 overflow-x-auto mb-5 pb-1 scrollbar-none">
      <button v-for="tab in TABS" :key="tab.key" @click="activeTab = tab.key"
        :class="['tab-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border shrink-0', activeTab === tab.key ? 'tab-active' : '']"
        :style="activeTab === tab.key
          ? 'background:#2563eb;color:white;border-color:transparent'
          : `background:var(--ml-bg-2);color:#64748b;border-color:var(--ml-border)`">
        <span>{{ tab.emoji }} {{ tab.label }}</span>
        <span :style="activeTab === tab.key ? 'background:rgba(255,255,255,0.2)' : `background:var(--ml-badge-off)`"
          class="text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center">{{ countByTab(tab.key) }}</span>
      </button>
    </div>

    <!-- Filtros de género, puntuación y ordenación -->
    <div class="flex flex-wrap items-center gap-2 mb-6 rounded-xl px-4 py-3" style="background:var(--ml-bg-3);border:1px solid var(--ml-border);">
      <span class="text-xs font-medium mr-1" style="color:#64748b">Filtrar:</span>

      <select v-model="filterGenre" class="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
        style="background:var(--ml-bg);color:var(--ml-text-2);border:1px solid var(--ml-border);">
        <option value="">Todos los géneros</option>
        <option v-for="g in allGenresInList" :key="g" :value="g">{{ g }}</option>
      </select>

      <select v-model="filterMinScore" class="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
        style="background:var(--ml-bg);color:var(--ml-text-2);border:1px solid var(--ml-border);">
        <option :value="0">Cualquier puntuación</option>
        <option v-for="n in [5, 6, 7, 8, 9, 10]" :key="n" :value="n">≥ {{ n }} / 10</option>
      </select>

      <div class="ml-auto flex items-center gap-2">
        <span class="text-xs" style="color:#64748b">Ordenar: </span>
        <select v-model="sortBy" class="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
          style="background:var(--ml-bg);color:var(--ml-text-2);border:1px solid var(--ml-border);">
          <option value="title">A–Z</option>
          <option value="score">Mi puntuación ↓</option>
          <option value="jikan_score">Puntuación Jikan ↓</option>
        </select>
      </div>
    </div>

    <!-- Indicador de carga (Spinner) -->
    <div v-if="loading" class="flex justify-center items-center h-48">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
    </div>

    <!-- Mensaje para lista vacía o sin resultados -->
    <div v-else-if="filteredList.length === 0" class="text-center py-20 text-gray-500">
      <p class="text-5xl mb-4">🎌</p>
      <p class="text-lg font-semibold text-gray-300 mb-1">
        {{ searchQuery ? `No se encontró "${searchQuery}"` : activeTab === 'Todos' ? 'Tu lista está vacía' : `No hay
        animes en "${activeTab}"` }}
      </p>
      <p class="text-sm">Explora y añade animes desde la vista principal.</p>
    </div>

    <!-- VISTA DE LISTA DETALLADA -->
    <div v-else-if="viewMode === 'list'" class="space-y-2">
      <div v-for="item in filteredList" :key="item.id"
        class="group rounded-2xl overflow-hidden flex items-stretch transition-all hover:shadow-lg"
        style="background:var(--ml-bg);border:1px solid var(--ml-border);">
        <!-- Imagen con enlace al modal de información -->
        <img :src="item.imageUrl" :alt="item.title"
          class="w-16 h-20 object-cover shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
          @click="openAnime(item.malId)"
          :title="'Ver info de ' + item.title">

        <!-- Información y metadatos del anime -->
        <div class="flex-1 px-4 py-3 flex flex-col justify-center min-w-0">
          <div class="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 class="text-white font-semibold text-sm truncate cursor-pointer hover:underline"
              @click="openAnime(item.malId)">{{ item.title }}</h3>
            <span :class="statusBadge[item.watchStatus]"
              class="text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 shadow-sm">{{ watchStatusEmoji[item.watchStatus]
              }} {{ item.watchStatus }}</span>
          </div>

          <p v-if="item.genres" class="text-gray-500 text-xs truncate mb-1">{{ item.genres }}</p>

          <!-- Barra de progreso de episodios -->
          <div v-if="item.watchStatus === 'Viendo' && item.episodes" class="flex items-center gap-2 mt-1 mb-1">
            <div class="flex-1 rounded-full h-1.5 overflow-hidden" style="background:var(--ml-border);">
              <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                :style="{ width: episodeProgress(item) + '%' }"></div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <input type="number" :value="item.episodesWatched || 0"
                @change="updateEpisodesWatched(item, +($event.target as HTMLInputElement).value)" :max="item.episodes"
                min="0"
                class="w-10 text-xs rounded px-1 py-0.5 outline-none text-center"
                style="background:var(--ml-bg-input);color:var(--ml-text);" />
              <span class="text-xs" style="color:#64748b">/ {{ item.episodes }}</span>
            </div>
          </div>

          <!-- Edición de notas en línea (Inline) -->
          <div v-if="editingNotes === item.id" class="flex gap-2 mt-1">
            <input v-model="tempNotes" @keyup.enter="saveNotes(item)" @keyup.esc="editingNotes = null"
              class="flex-1 bg-gray-700 text-white text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Añade una nota..." autofocus />
            <button @click="saveNotes(item)" class="text-green-400 text-xs hover:text-green-300 font-bold">✓</button>
            <button @click="editingNotes = null" class="text-red-400 text-xs hover:text-red-300 font-bold">✕</button>
          </div>
          <p v-else @click="editingNotes = item.id; tempNotes = item.notes || ''"
            class="text-gray-600 text-xs italic cursor-pointer hover:text-gray-400 transition-colors truncate mt-1">{{
              item.notes || '+ Añadir nota...' }}</p>
        </div>

        <!-- Controles de edición rápida -->
        <div class="flex items-center gap-3 px-4 shrink-0">
          <!-- Selector de puntuación personal -->
          <div class="flex items-center gap-1.5">
            <span class="text-yellow-400 text-sm">⭐</span>
            <select v-model="item.userScore" @change="updateField(item)"
              class="rounded-lg px-2 py-1 text-xs outline-none cursor-pointer w-16"
              style="background:var(--ml-bg-input);color:var(--ml-text);border:1px solid var(--ml-border-2);">
              <option v-for="n in 10" :key="n" :value="n">{{ n }}/10</option>
            </select>
          </div>

          <!-- Selector de estado de visualización -->
          <select v-model="item.watchStatus" @change="updateField(item)"
            class="rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
            style="background:var(--ml-bg-input);color:var(--ml-text);border:1px solid var(--ml-border-2);">
            <option v-for="s in watchStatusOptions" :key="s" :value="s">{{ watchStatusEmoji[s] }} {{ s }}</option>
          </select>

          <!-- Opción para eliminar de la lista -->
          <button @click="removeFromList(item.id)"
            class="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10"
            title="Eliminar">🗑️</button>
        </div>
      </div>
    </div>

    <!-- VISTA DE CUADRÍCULA (GRID) VISUAL -->
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div v-for="item in filteredList" :key="item.id"
        class="group rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
        style="background:var(--ml-bg);border:1px solid var(--ml-border);">

        <!-- Imagen con distintivos superpuestos -->
        <div class="relative h-52 overflow-hidden cursor-pointer" @click="openAnime(item.malId)">
          <img :src="item.imageUrl" :alt="item.title"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
          <!-- Distintivo de puntuación del usuario -->
          <div
            class="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-0.5">
            ⭐ {{ item.userScore || '?' }}
          </div>
          <!-- Distintivo de estado del anime -->
          <div class="absolute top-2 left-2">
            <span :class="statusBadge[item.watchStatus]"
              class="text-xs px-2 py-0.5 rounded-full border font-medium backdrop-blur-sm shadow-sm">
              {{ watchStatusEmoji[item.watchStatus] }}
            </span>
          </div>
          <!-- Barra de progreso inferior -->
          <div v-if="item.watchStatus === 'Viendo' && item.episodes" class="absolute bottom-0 left-0 right-0">
            <div class="bg-gray-900/70 h-1.5">
              <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                :style="{ width: episodeProgress(item) + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Título y edición rápida -->
        <div class="p-3 flex-1 flex flex-col cursor-pointer" @click="openAnime(item.malId)">
          <h3 class="font-semibold text-sm truncate mb-1" style="color:var(--ml-text)" :title="item.title">{{ item.title }}</h3>
          <p v-if="item.genres" class="text-xs truncate mb-2" style="color:#64748b">{{ item.genres }}</p>

          <!-- Contador de episodios vistos -->
          <div v-if="item.watchStatus === 'Viendo' && item.episodes" class="flex items-center gap-1 mb-2" @click.stop>
            <input type="number" :value="item.episodesWatched || 0"
              @change="updateEpisodesWatched(item, +($event.target as HTMLInputElement).value)" :max="item.episodes"
              min="0"
              class="w-12 text-xs rounded px-1 py-0.5 outline-none text-center"
              style="background:var(--ml-bg-input);color:var(--ml-text);" />
            <span class="text-xs" style="color:#64748b">/ {{ item.episodes }} eps</span>
          </div>

          <div class="mt-auto flex gap-1.5 items-center" @click.stop>
            <select v-model="item.watchStatus" @change="updateField(item)"
              class="flex-1 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
              style="background:var(--ml-bg-input);color:var(--ml-text);border:1px solid var(--ml-border-2);">
              <option v-for="s in watchStatusOptions" :key="s" :value="s">{{ watchStatusEmoji[s] }} {{ s }}</option>
            </select>
            <select v-model="item.userScore" @change="updateField(item)"
              class="w-16 rounded-lg px-1 py-1 text-xs outline-none cursor-pointer"
              style="background:var(--ml-bg-input);color:var(--ml-text);border:1px solid var(--ml-border-2);">
              <option v-for="n in 10" :key="n" :value="n">{{ n }}★</option>
            </select>
            <!-- Acción de eliminar -->
            <button @click="removeFromList(item.id)"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10"
              title="Eliminar">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos para las tarjetas de estadísticas */
.stat-card {
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid;
  backdrop-filter: blur(12px);
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}

.stat-gray   { background: rgba(30,34,53,0.85);  border-color: rgba(255,255,255,0.07); }
.stat-blue   { background: rgba(30,58,138,0.35);  border-color: rgba(96,165,250,0.25); box-shadow: 0 4px 20px rgba(37,99,235,0.15); }
.stat-purple { background: rgba(76,29,149,0.35);  border-color: rgba(167,139,250,0.25); box-shadow: 0 4px 20px rgba(124,58,237,0.15); }
.stat-green  { background: rgba(6,78,59,0.35);    border-color: rgba(52,211,153,0.25); box-shadow: 0 4px 20px rgba(16,185,129,0.15); }
.stat-amber  { background: rgba(120,53,15,0.35);  border-color: rgba(251,191,36,0.25); box-shadow: 0 4px 20px rgba(245,158,11,0.15); }

.stat-number {
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.5px;
}
.stat-label {
  font-size: 0.7rem;
  color: rgba(148,163,184,0.8);
  margin-top: 0.25rem;
  font-weight: 500;
}

/* Modo claro: estilos heredados del bloque global */

/* Efectos hover interactivos */

/* Botón para exportación CSV */
.btn-export {
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s;
}
.btn-export:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  opacity: 0.9;
}
.btn-export:active { transform: translateY(0); }

/* Botones de alternancia entre lista y cuadrícula */
.btn-view {
  transition: background 0.15s ease, color 0.15s ease;
}
.btn-view:not(.active):hover {
  background: rgba(37,99,235,0.12) !important;
  color: #2563eb !important;
}

/* Estilos para pestañas en estado inactivo */
.tab-btn {
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s;
}
.tab-btn:not(.tab-active):hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}
.tab-btn.tab-active {
  box-shadow: 0 4px 14px rgba(37,99,235,0.35);
}
</style>

<!-- Estilos globales (sin scoped) para que las variables CSS funcionen en ambos modos -->
<style>
/* Variables de diseño: Modo Claro (por defecto) */
:root {
  --ml-bg:         #ffffff;
  --ml-bg-2:       #f1f5f9;
  --ml-bg-3:       #f8faff;
  --ml-bg-input:   #f1f5f9;
  --ml-border:     #e2e8f0;
  --ml-border-2:   #cbd5e1;
  --ml-text:       #1e293b;
  --ml-text-2:     #334155;
  --ml-badge-off:  #e2e8f0;
}

/* Variables de diseño: Modo Oscuro */
.dark {
  --ml-bg:         #1a1f35;
  --ml-bg-2:       #1e2235;
  --ml-bg-3:       #161a2e;
  --ml-bg-input:   #2d3148;
  --ml-border:     #2d3148;
  --ml-border-2:   #3d4460;
  --ml-text:       #f1f5f9;
  --ml-text-2:     #cbd5e1;
  --ml-badge-off:  #2d3148;
}

/* Tarjetas de estadísticas en modo claro */
.light .stat-gray   { background: #f8faff !important;  border-color: #e2e8f0 !important; box-shadow: 0 2px 12px rgba(0,0,0,0.06) !important; }
.light .stat-blue   { background: #eff6ff !important;  border-color: #bfdbfe !important; box-shadow: 0 2px 12px rgba(37,99,235,0.08) !important; }
.light .stat-purple { background: #faf5ff !important;  border-color: #e9d5ff !important; box-shadow: 0 2px 12px rgba(124,58,237,0.08) !important; }
.light .stat-green  { background: #f0fdf4 !important;  border-color: #bbf7d0 !important; box-shadow: 0 2px 12px rgba(16,185,129,0.08) !important; }
.light .stat-amber  { background: #fffbeb !important;  border-color: #fde68a !important; box-shadow: 0 2px 12px rgba(245,158,11,0.08) !important; }
.light .stat-label  { color: #64748b !important; }
.light .stat-gray .stat-number { color: #1e293b !important; }
</style>
