<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { api } from '../services/api'
import { auth } from '../firebase'

const props = defineProps<{ anime: any }>()
const emit = defineEmits(['close', 'saved', 'select-rec'])

const userScore = ref(10)
const watchStatus = ref('Visto')
const episodesWatched = ref(0)
const notes = ref('')
const saving = ref(false)
const removing = ref(false)
const alreadyInList = ref(false)
const listEntryId = ref<number | null>(null)
const savedFeedback = ref(false)
const synopsisExpanded = ref(false)

// Auto-marcar según el estado de emisión al alcanzar el último episodio conocido
watch(episodesWatched, (val) => {
  const total = props.anime?.episodes
  const isAiring = props.anime?.status === 'Currently Airing'
  if (total && val >= total) {
    watchStatus.value = isAiring ? 'Al día' : 'Visto'
  }
})

// Recomendaciones
const recommendations = ref<any[]>([])
const recsLoading = ref(false)

// No necesitamos la constante API aquí, la maneja el servicio

// Paleta de colores para géneros (cicla por índice)
const GENRE_COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
  { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/40' },
  { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
  { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
  { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40' },
  { bg: 'bg-lime-500/20', text: 'text-lime-300', border: 'border-lime-500/40' },
  { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/40' },
  { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/40' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40' },
  { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-300', border: 'border-fuchsia-500/40' },
]

// Color determinista por mal_id para mantener consistencia en los géneros
const genreColor = (mal_id: number) => GENRE_COLORS[mal_id % GENRE_COLORS.length]

// Obtener recomendaciones desde la API
const fetchRecommendations = async () => {
  if (!props.anime?.mal_id) return
  recsLoading.value = true
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${props.anime.mal_id}/recommendations`)
    const data = await res.json()
    // Each item has entry: { mal_id, title, images, ... }
    recommendations.value = (data.data || []).slice(0, 6).map((r: any) => r.entry)
  } catch {
    recommendations.value = []
  } finally {
    recsLoading.value = false
  }
}

// Comprobar si el anime ya está en la lista del usuario
const checkInList = async () => {
  try {
    const exists = await api.exists(props.anime.mal_id)
    alreadyInList.value = exists
    if (exists) {
      const entry = await api.getById(props.anime.mal_id)
      if (entry) {
        listEntryId.value = entry.id
        userScore.value = entry.userScore || 10
        watchStatus.value = entry.watchStatus || 'Visto'
        episodesWatched.value = entry.episodesWatched || 0
        notes.value = entry.notes || ''
      }
    }
  } catch (_) { }
}

// Guardar o actualizar la entrada en la lista
const handleSave = async () => {
  saving.value = true
  try {
    const body = {
      malId: props.anime.mal_id,
      title: props.anime.title,
      titleEnglish: props.anime.title_english || '',
      imageUrl: props.anime.images?.jpg?.large_image_url || props.anime.images?.jpg?.image_url || '',
      genres: (props.anime.genres || []).map((g: any) => g.name).join(', '),
      episodes: props.anime.episodes || null,
      userScore: userScore.value,
      watchStatus: watchStatus.value,
      episodesWatched: episodesWatched.value,
      notes: notes.value,
      airingStatus: props.anime.status || '',
      broadcastInfo: props.anime.broadcast?.string || '',
      score: props.anime.score || null,
      rank: props.anime.rank || null,
    }
    await api.save(body)
    alreadyInList.value = true
    savedFeedback.value = true
    setTimeout(() => { savedFeedback.value = false }, 2000)
    emit('saved')
  } catch (e) {
    console.error('Error saving:', e)
  } finally {
    saving.value = false
  }
}

// Eliminar el anime de la lista del usuario
const handleRemove = async () => {
  if (!listEntryId.value) return
  removing.value = true
  try {
    await api.delete(props.anime.mal_id)
    alreadyInList.value = false
    listEntryId.value = null
    episodesWatched.value = 0
    emit('saved')
  } catch (e) {
    console.error('Error removing:', e)
  } finally {
    removing.value = false
  }
}

const getConvertedTimes = computed(() => {
  if (!props.anime?.broadcast?.time || !props.anime?.broadcast?.day) return null

  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
  const daysEs = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados']
  
  const [hours, minutes] = props.anime.broadcast.time.split(':').map(Number)
  const dayIndex = days.indexOf(props.anime.broadcast.day)
  
  if (dayIndex === -1) return null

  // Creamos una fecha base (un domingo cualquiera) en JST (UTC+9)
  const baseDate = new Date(Date.UTC(2024, 0, 7 + dayIndex, hours - 9, minutes))

  const format = (date: Date, timeZone: string, label: string) => {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone
    })
    return { label, time: formatter.format(date) }
  }

  try {
    return [
      format(baseDate, 'Europe/Madrid', '🇪🇸 España'),
      format(baseDate, 'America/Mexico_City', '🇲🇽 México'),
      format(baseDate, 'America/Argentina/Buenos_Aires', '🇦🇷 Argentina/CL'),
    ]
  } catch (e) {
    return null
  }
})

onMounted(async () => {
  await checkInList()
  fetchRecommendations()
})
</script>



<template>
  <!-- Fondo oscuro (Backdrop) -->
  <div class="modal-backdrop fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
    @click.self="$emit('close')">

    <!-- Panel del Modal -->
    <div class="modal-panel bg-gray-950 w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] rounded-t-3xl md:rounded-3xl
                overflow-hidden shadow-2xl flex flex-col border border-white/8 relative">

      <!-- Banner con imagen y gradiente -->
      <div class="modal-banner relative h-52 shrink-0 overflow-hidden">
        <!-- Imagen de fondo difuminada -->
        <img :src="anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url"
          class="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-40" :alt="anime.title">
        <!-- Superposición de gradiente -->
        <div class="absolute inset-0 bg-gradient-to-b from-gray-950/20 via-gray-950/40 to-gray-950"></div>

        <!-- Póster y título superpuestos -->
        <div class="absolute inset-0 flex items-end gap-4 px-5 pb-4">
          <img :src="anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url"
            class="w-20 h-28 object-cover rounded-xl shadow-2xl shrink-0 border border-white/10" :alt="anime.title">
          <div class="min-w-0">
            <h2 class="text-xl font-black text-white leading-tight mb-1 drop-shadow-lg">{{ anime.title }}</h2>
            <p v-if="anime.title_english && anime.title_english !== anime.title"
              class="text-white/50 text-xs italic truncate mb-2">{{ anime.title_english }}</p>
            <!-- Puntuación y Ranking -->
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1 text-yellow-400 font-bold text-sm">⭐ {{ anime.score || 'N/A' }}</span>
              <span v-if="anime.rank" class="text-white/40 text-xs">#{{ anime.rank }} ranking</span>
              <span v-if="anime.status === 'Currently Airing'"
                class="flex items-center gap-1 text-green-400 text-xs font-semibold">
                <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span> En emisión
              </span>
            </div>
          </div>
        </div>

        <!-- Botón para cerrar -->
        <button @click="$emit('close')"
          class="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white/80 rounded-full w-8 h-8
                 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-20 text-sm">✕</button>
      </div>

      <!-- Contenido desplazable -->
      <div class="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-5">

        <!-- Géneros -->
        <div class="flex flex-wrap gap-1.5">
          <span v-for="genre in anime.genres" :key="genre.mal_id"
            :class="[genreColor(genre.mal_id).bg, genreColor(genre.mal_id).text, genreColor(genre.mal_id).border]"
            class="px-2.5 py-0.5 text-xs rounded-full border font-medium">{{ genre.name }}</span>
        </div>

        <!-- Información rápida (Chips) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div class="info-chip">
            <span class="info-label">📺 Episodios</span>
            <span class="info-value">{{ anime.episodes || '?' }}</span>
          </div>
          <div class="info-chip">
            <span class="info-label">🎬 Tipo</span>
            <span class="info-value">{{ anime.type || 'N/A' }}</span>
          </div>
          <div class="info-chip">
            <span class="info-label">📅 Año</span>
            <span class="info-value">{{ anime.year || anime.aired?.prop?.from?.year || 'N/A' }}</span>
          </div>
          <div class="info-chip" v-if="anime.duration">
            <span class="info-label">⌛ Duración</span>
            <span class="info-value">{{ anime.duration.replace(' per ep','') }}</span>
          </div>
        </div>

        <!-- Próximo episodio (Zonas Horarias) -->
        <div v-if="anime.status === 'Currently Airing' && anime.broadcast?.time"
          class="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
          
          <div class="flex items-center gap-3">
            <span class="text-3xl animate-pulse">📡</span>
            <div>
              <p class="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Emisión en Japón (JST)</p>
              <p class="text-white text-sm font-bold">{{ anime.broadcast.string }}</p>
            </div>
          </div>

          <div v-if="getConvertedTimes" class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
            <div v-for="t in getConvertedTimes" :key="t.label" class="bg-black/20 rounded-xl p-2.5 border border-white/5 text-center">
              <p class="text-[9px] text-gray-500 font-bold uppercase mb-1">{{ t.label }}</p>
              <p class="text-white text-[11px] font-medium capitalize">{{ t.time }}</p>
            </div>
          </div>
        </div>

        <!-- Sinopsis -->
        <div>
          <p :class="synopsisExpanded ? '' : 'line-clamp-3'"
            class="text-gray-400 text-sm leading-relaxed transition-all">
            {{ anime.synopsis || 'Sin sinopsis disponible.' }}
          </p>
          <button v-if="anime.synopsis && anime.synopsis.length > 180"
            @click="synopsisExpanded = !synopsisExpanded"
            class="mt-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
            {{ synopsisExpanded ? '▲ Ver menos' : '▼ Ver más' }}
          </button>
        </div>

        <!-- Gestión de "Mi Lista" -->
        <div class="bg-gray-900 rounded-2xl border border-white/6 p-4">
          <!-- Encabezado -->
          <div class="flex items-center gap-2 mb-3">
            <div class="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
            <h3 class="text-white font-bold text-sm">
              <span v-if="alreadyInList" class="text-green-400">✅ En tu lista</span>
              <span v-else>📋 Añadir a Mi Lista</span>
            </h3>
          </div>

          <!-- Estado y Puntuación -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="text-xs text-gray-500 mb-1 block font-medium">Estado</label>
              <select v-model="watchStatus"
                class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors">
                <option value="Visto">✅ Visto</option>
                <option value="Viendo">▶️ Viendo</option>
                <option value="Al día" v-if="anime.status === 'Currently Airing'">📺 Al día</option>
                <option value="En Espera">⏸️ En Espera</option>
                <option value="Pendiente">📌 Pendiente</option>
                <option value="Abandonado">❌ Dropeado</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block font-medium">Mi Puntuación</label>
              <select v-model="userScore"
                class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors">
                <option v-for="n in 10" :key="n" :value="n">{{ '⭐'.repeat(Math.min(n,5)) }} {{ n }}/10</option>
              </select>
            </div>
          </div>

          <!-- Progreso de episodios (solo si el estado es "Viendo") -->
          <div v-if="watchStatus === 'Viendo'" class="mb-3">
            <label class="text-xs text-gray-500 mb-2 block font-medium">
              Progreso
              <span v-if="anime.episodes" class="text-gray-600"> — {{ anime.episodes }} episodios totales</span>
            </label>
            <div class="flex items-center gap-3">
              <input v-model.number="episodesWatched" type="number" min="0" :max="anime.episodes || 9999"
                class="w-20 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm
                       outline-none focus:border-blue-500 text-center transition-colors" />
              <div v-if="anime.episodes" class="flex-1 flex items-center gap-2">
                <div class="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                    :style="{ width: Math.min((episodesWatched / anime.episodes) * 100, 100) + '%' }"></div>
                </div>
                <span class="text-gray-500 text-xs shrink-0">{{ Math.min(Math.round((episodesWatched/anime.episodes)*100),100) }}%</span>
              </div>
            </div>
            <p v-if="anime.episodes && episodesWatched >= anime.episodes && anime.status === 'Currently Airing'"
              class="text-cyan-400 text-xs mt-2 flex items-center gap-1">
              <span class="animate-pulse">📺</span> ¡Al día! Esperando nuevos episodios...
            </p>
            <p v-else-if="anime.episodes && episodesWatched >= anime.episodes"
              class="text-green-400 text-xs mt-2 flex items-center gap-1">
              <span>🎉</span> ¡Completado!
            </p>
          </div>

          <!-- Notas personales -->
          <div class="mb-4">
            <label class="text-xs text-gray-500 mb-1 block font-medium">Notas personales</label>
            <textarea v-model="notes" placeholder="Escribe lo que quieras recordar..." rows="2"
              class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm
                     outline-none focus:border-blue-500 resize-none placeholder-gray-600 transition-colors"></textarea>
          </div>

          <!-- Acciones (Guardar/Eliminar) -->
          <div class="flex gap-2">
            <button @click="handleSave" :disabled="saving"
              :class="savedFeedback
                ? 'bg-green-600 shadow-green-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'"
              class="flex-1 text-white py-2.5 rounded-xl font-semibold transition-all text-sm shadow-lg
                     flex items-center justify-center gap-2 disabled:opacity-50">
              <span v-if="saving">Guardando...</span>
              <span v-else-if="savedFeedback">✅ ¡Guardado!</span>
              <span v-else-if="alreadyInList">💾 Actualizar</span>
              <span v-else>➕ Añadir a Mi Lista</span>
            </button>
            <button v-if="alreadyInList" @click="handleRemove" :disabled="removing"
              class="bg-gray-800 hover:bg-red-600 border border-gray-700 hover:border-red-500 text-gray-400
                     hover:text-white py-2.5 px-4 rounded-xl font-semibold transition-all text-sm disabled:opacity-50">
              <span v-if="removing">...</span>
              <span v-else>🗑️</span>
            </button>
          </div>
        </div>

        <!-- Recomendaciones relacionadas -->
        <div v-if="recsLoading || recommendations.length > 0">
          <h3 class="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <span>💡</span> También te puede gustar
          </h3>
          <div v-if="recsLoading" class="text-gray-600 text-xs animate-pulse">Cargando recomendaciones...</div>
          <div v-else class="grid grid-cols-3 gap-2">
            <div v-for="rec in recommendations" :key="rec.mal_id" @click="emit('select-rec', rec)"
              class="group cursor-pointer rounded-xl overflow-hidden border border-white/6
                     hover:border-blue-500/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 bg-gray-900">
              <div class="relative h-24 overflow-hidden">
                <img :src="rec.images?.jpg?.image_url" :alt="rec.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              </div>
              <p class="text-white/80 text-xs font-medium px-2 py-1.5 truncate group-hover:text-white transition-colors">
                {{ rec.title }}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  animation: fadeIn 0.2s ease;
}
.modal-panel {
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Estilos para los chips de información */
.info-chip {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.info-label {
  font-size: 0.65rem;
  color: rgba(148,163,184,0.7);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.info-value {
  font-size: 0.85rem;
  color: #f1f5f9;
  font-weight: 600;
}

/* Personalización de la barra de desplazamiento */
.overflow-y-auto::-webkit-scrollbar { width: 4px; }
.overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

/* Etiquetas de género: variantes para modo claro */
.light .modal-panel .text-blue-300    { color: #1d4ed8 !important; }
.light .modal-panel .text-purple-300  { color: #7c3aed !important; }
.light .modal-panel .text-pink-300    { color: #db2777 !important; }
.light .modal-panel .text-rose-300    { color: #e11d48 !important; }
.light .modal-panel .text-orange-300  { color: #ea580c !important; }
.light .modal-panel .text-amber-300   { color: #d97706 !important; }
.light .modal-panel .text-yellow-300  { color: #ca8a04 !important; }
.light .modal-panel .text-lime-300    { color: #65a30d !important; }
.light .modal-panel .text-green-300   { color: #16a34a !important; }
.light .modal-panel .text-teal-300    { color: #0f766e !important; }
.light .modal-panel .text-cyan-300    { color: #0e7490 !important; }
.light .modal-panel .text-indigo-300  { color: #4338ca !important; }
.light .modal-panel .text-fuchsia-300 { color: #a21caf !important; }
.light .modal-panel .text-emerald-300 { color: #059669 !important; }
.light .modal-panel .text-violet-300  { color: #7c3aed !important; }</style>

<!-- Modo claro: estilos específicos para el modal -->
<style>
.light .modal-panel { background: #ffffff !important; border-color: #e2e8f0 !important; }
.light .modal-panel .bg-gray-950 { background: #f8faff !important; }
.light .modal-panel .bg-gray-900 { background: #f1f5f9 !important; }
.light .modal-panel .bg-gray-800,
.light .modal-panel .bg-gray-800\/70 { background: #e2e8f0 !important; }
.light .modal-panel .text-white { color: #0f172a !important; }
.light .modal-panel .text-white\/80 { color: #334155 !important; }
.light .modal-panel .text-white\/50 { color: #64748b !important; }
.light .modal-panel .text-white\/40 { color: #94a3b8 !important; }
.light .modal-panel .text-gray-400 { color: #475569 !important; }
.light .modal-panel .text-gray-500 { color: #64748b !important; }
.light .modal-panel .text-gray-600 { color: #94a3b8 !important; }
.light .modal-panel .border-gray-700 { border-color: #cbd5e1 !important; }
.light .modal-panel .border-white\/6 { border-color: #e2e8f0 !important; }
.light .modal-panel .border-white\/8 { border-color: #e2e8f0 !important; }
.light .modal-panel .bg-gray-700 { background: #cbd5e1 !important; }
.light .modal-panel .placeholder-gray-600::placeholder { color: #94a3b8 !important; }
.light .modal-panel .info-chip { background: rgba(0,0,0,0.04) !important; border-color: #e2e8f0 !important; }
.light .modal-panel .info-label { color: #64748b !important; }
.light .modal-panel .info-value { color: #0f172a !important; }
.light .modal-backdrop { background: rgba(0,0,0,0.5); }

/* El banner mantiene texto blanco en modo claro por la imagen oscura */
.light .modal-panel .modal-banner,
.light .modal-panel .modal-banner * { color: #ffffff !important; }


/* Variantes de color para géneros en modo claro */
.light .modal-panel .text-blue-300    { color: #1d4ed8 !important; }
.light .modal-panel .text-purple-300  { color: #7c3aed !important; }
.light .modal-panel .text-pink-300    { color: #db2777 !important; }
.light .modal-panel .text-rose-300    { color: #e11d48 !important; }
.light .modal-panel .text-orange-300  { color: #ea580c !important; }
.light .modal-panel .text-amber-300   { color: #d97706 !important; }
.light .modal-panel .text-yellow-300  { color: #ca8a04 !important; }
.light .modal-panel .text-lime-300    { color: #65a30d !important; }
.light .modal-panel .text-green-300   { color: #16a34a !important; }
.light .modal-panel .text-teal-300    { color: #0f766e !important; }
.light .modal-panel .text-cyan-300    { color: #0e7490 !important; }
.light .modal-panel .text-indigo-300  { color: #4338ca !important; }
.light .modal-panel .text-fuchsia-300 { color: #a21caf !important; }
.light .modal-panel .text-emerald-300 { color: #059669 !important; }
.light .modal-panel .text-violet-300  { color: #7c3aed !important; }</style>

