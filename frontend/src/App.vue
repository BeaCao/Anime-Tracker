<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import AnimeCard from './components/AnimeCard.vue'
import AnimeModal from './components/AnimeModal.vue'
import MyListView from './components/MyListView.vue'
import StatsView from './components/StatsView.vue'
import AuthModal from './components/AuthModal.vue'
import LandingView from './components/LandingView.vue'
import { auth } from './firebase'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'

// Gestión del Modo Oscuro (Dark Mode)
const darkMode = ref(localStorage.getItem('darkMode') !== 'false')
const applyDarkMode = () => {
  if (darkMode.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('darkMode', String(darkMode.value))
}
watch(darkMode, applyDarkMode, { immediate: true })
const toggleDark = () => { darkMode.value = !darkMode.value }

// Control de Vistas Activas y Navegación
const activeView = ref<'explore' | 'mylist' | 'season' | 'stats'>('explore')
const myListViewRef = ref<InstanceType<typeof MyListView> | null>(null)

// Estado y Variables de la Vista Explorar
const displayedAnimes = ref<any[]>([])
const genresList = ref<{mal_id: number, name: string}[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedGenre = ref('')
const selectedStatus = ref('')
const selectedAnime = ref<any>(null)
const sfwMode = ref(localStorage.getItem('sfwMode') !== 'false')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Paginación
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const hasNextPage = ref(false)
const resultsSection = ref<HTMLElement | null>(null)

// Autenticación de Usuarios
const currentUser = ref<User | null>(null)
const showAuthModal = ref(false)
const isDemoMode = ref(localStorage.getItem('isDemoMode') === 'true')

const showLanding = computed(() => !currentUser.value && !isDemoMode.value)

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    if (user) {
      isDemoMode.value = false
      localStorage.setItem('isDemoMode', 'false')
    }
    // Si el usuario cambia, refrescamos la lista
    if (activeView.value === 'mylist') {
      myListViewRef.value?.fetchList()
    }
  })
})

const enterDemoMode = () => {
  isDemoMode.value = true
  localStorage.setItem('isDemoMode', 'true')
}

const handleLogout = async () => {
  await signOut(auth)
  isDemoMode.value = false
  localStorage.setItem('isDemoMode', 'false')
  activeView.value = 'explore'
}

// ── Auto-logout por inactividad (30 minutos) ──────────────────────────
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 min
const sessionToast = ref(false)
let inactivityTimer: ReturnType<typeof setTimeout> | null = null

const resetInactivityTimer = () => {
  if (!currentUser.value) return
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(async () => {
    if (currentUser.value) {
      await signOut(auth)
      sessionToast.value = true
      setTimeout(() => { sessionToast.value = false }, 5000)
    }
  }, SESSION_TIMEOUT_MS)
}

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

const startActivityWatcher = () => {
  ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }))
  resetInactivityTimer()
}

const stopActivityWatcher = () => {
  ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetInactivityTimer))
  if (inactivityTimer) clearTimeout(inactivityTimer)
}

watch(currentUser, (user) => {
  if (user) {
    startActivityWatcher()
  } else {
    stopActivityWatcher()
  }
})

onBeforeUnmount(stopActivityWatcher)

// IDs de géneros adultos en MAL para el filtrado SFW (Safe For Work)
const ADULT_GENRE_IDS = new Set([12, 49, 9979, 9801])
const filteredGenresList = computed(() =>
  sfwMode.value ? genresList.value.filter(g => !ADULT_GENRE_IDS.has(g.mal_id)) : genresList.value
)
watch(sfwMode, (isSfw) => {
  if (isSfw && selectedGenre.value && ADULT_GENRE_IDS.has(Number(selectedGenre.value))) {
    selectedGenre.value = ''
    handleSearch()
  }
})

// Estado y Variables de la Vista de Temporada Actual
const seasonAnimes = ref<any[]>([])
const seasonLoading = ref(false)
const seasonLoaded = ref(false)

const toggleSfw = () => {
  sfwMode.value = !sfwMode.value
  localStorage.setItem('sfwMode', String(sfwMode.value))
  handleSearch()
}

// Funciones Auxiliares para Consultas a la API (Jikan)
const buildUrl = (page: number) => {
  const query = searchQuery.value.trim()
  const sfw = sfwMode.value ? '&sfw=true' : ''
  if (!query && !selectedGenre.value && !selectedStatus.value) {
    return `https://api.jikan.moe/v4/top/anime?limit=24&page=${page}${sfw}`
  }
  let url = `https://api.jikan.moe/v4/anime?limit=24&page=${page}${sfw}`
  if (query) url += `&q=${encodeURIComponent(query)}`
  if (selectedGenre.value) url += `&genres=${selectedGenre.value}`
  if (selectedStatus.value) url += `&status=${selectedStatus.value}`
  return url
}

const fetchAnimes = async (url: string) => {
  loading.value = true
  try {
    const response = await fetch(url)
    const data = await response.json()
    // Deduplicar por mal_id por si la API devuelve duplicados
    const raw: any[] = data.data || []
    const seen = new Map<number, any>()
    raw.forEach(a => { if (!seen.has(a.mal_id)) seen.set(a.mal_id, a) })
    displayedAnimes.value = Array.from(seen.values())
    // Extraer info de paginación de la respuesta de Jikan
    const pag = data.pagination
    if (pag) {
      totalPages.value = pag.last_visible_page ?? 1
      totalItems.value = pag.items?.total ?? (data.data?.length ?? 0)
      hasNextPage.value = pag.has_next_page ?? false
    }
  } catch (error) {
    console.error('Error fetching anime:', error)
  } finally {
    loading.value = false
  }
}

const fetchGenres = async () => {
  try {
    const response = await fetch('https://api.jikan.moe/v4/genres/anime')
    const data = await response.json()
    genresList.value = (data.data || []).sort((a: any, b: any) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error fetching genres:', error)
  }
}

const handleSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchAnimes(buildUrl(1))
  }, 500)
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  fetchAnimes(buildUrl(page))
  // Scroll suave al inicio de los resultados
  resultsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Páginas visibles (máx 7 botones con elipsis)
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  if (cur <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (cur >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', cur - 1, cur, cur + 1, '...', total)
  }
  return pages
})

const fetchSeason = async () => {
  if (seasonLoaded.value) return
  seasonLoading.value = true
  try {
    const seen = new Map<number, any>()
    let page = 1
    let hasNext = true

    // Jikan limita a 25 por página — paginamos hasta traer todos
    while (hasNext) {
      const res = await fetch(`https://api.jikan.moe/v4/seasons/now?limit=25&page=${page}`)
      if (!res.ok) break
      const data = await res.json()
      const items: any[] = data.data || []
      items.forEach(a => { if (!seen.has(a.mal_id)) seen.set(a.mal_id, a) })
      hasNext = data.pagination?.has_next_page === true
      page++
      // Pequeña pausa entre peticiones para respetar el rate-limit de Jikan (3 req/s)
      if (hasNext) await new Promise(r => setTimeout(r, 350))
    }

    seasonAnimes.value = Array.from(seen.values())
    seasonLoaded.value = true
  } catch (e) {
    console.error('Error fetching season:', e)
  } finally {
    seasonLoading.value = false
  }
}

// Funciones de Navegación y Gestión de Eventos del Modal
const goTo = (view: typeof activeView.value) => {
  activeView.value = view
  if (view === 'season') fetchSeason()
}

const onModalSaved = () => {
  if (activeView.value === 'mylist') {
    myListViewRef.value?.fetchList()
  }
}

const openRecommendation = async (rec: any) => {
  selectedAnime.value = null
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${rec.mal_id}`)
    const data = await res.json()
    selectedAnime.value = data.data || rec
  } catch {
    selectedAnime.value = rec
  }
}

onMounted(() => {
  fetchGenres()
  fetchAnimes(buildUrl(1))
})
</script>

<template>
  <div :class="darkMode ? 'dark' : 'light'" class="min-h-screen font-sans">
    
    <!-- PANTALLA DE BIENVENIDA (Landing) -->
    <LandingView 
      v-if="showLanding" 
      @login="showAuthModal = true" 
      @demo="enterDemoMode" 
    />

    <div v-else class="app-root min-h-screen transition-colors duration-500"
         :class="darkMode ? 'bg-gray-950 text-white' : 'bg-slate-100 text-gray-900'">

      <!-- Fondo decorativo con orbes animados -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
        <!-- Textura de grano (Grain) -->
        <div class="grain"></div>
      </div>

      <!-- Barra de navegación superior (Premium Floating) -->
      <header class="fixed top-0 inset-x-0 z-40 px-2 sm:px-4 py-2 md:py-8 pointer-events-none">
        <nav class="glass-nav max-w-6xl mx-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 md:gap-8 px-3 md:px-10 py-2 md:py-3 rounded-2xl md:rounded-full pointer-events-auto shadow-2xl transition-all duration-300">
          
          <!-- Logotipo AniKiroku -->
          <button
            @click="goTo('explore')"
            class="logo-btn flex items-center gap-2 md:gap-3.5 group transition-transform active:scale-95 flex-shrink-0"
          >
            <div class="p-1.5 md:p-2.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl md:rounded-2xl shadow-lg shadow-purple-500/20 group-hover:rotate-12 transition-transform">
              <span class="text-xl md:text-2xl">🎌</span>
            </div>
            <span class="logo-text text-lg md:text-2xl font-black tracking-tight bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent">
              AniKiroku
            </span>
          </button>

          <!-- Spacer para empujar los botones a la derecha en desktop -->
          <div class="hidden md:flex flex-1"></div>

          <!-- Fila de navegación: se convierte en segunda fila en móvil -->
          <div class="flex items-center gap-1 flex-wrap justify-center w-full md:w-auto">
            <button
              v-for="item in [
                { view: 'explore', icon: '🔍', label: 'Explorar', color: 'blue' },
                { view: 'season', icon: '🌸', label: 'Temporada', color: 'pink' },
                { view: 'mylist', icon: '📋', label: 'Mi Lista', color: 'purple' },
                { view: 'stats', icon: '📊', label: 'Stats', color: 'emerald' },
              ]"
              :key="item.view"
              @click="goTo(item.view as any)"
              :class="[
                activeView === item.view ? `nav-active nav-${item.color}` : 'nav-idle'
              ]"
              class="nav-btn"
            >
              <span class="text-base">{{ item.icon }}</span>
              <span class="text-xs sm:text-sm md:hidden lg:inline">{{ item.label }}</span>
            </button>

            <!-- Divisor visual -->
            <div class="w-px h-5 bg-black/10 dark:bg-white/10 mx-0.5"></div>

            <!-- Interruptor de Modo Oscuro -->
            <button @click="toggleDark" class="icon-btn" :title="darkMode ? 'Modo claro' : 'Modo oscuro'">
              <span class="text-base">{{ darkMode ? '☀️' : '🌙' }}</span>
            </button>

            <!-- Control de Contenido SFW (Safe For Work) -->
            <button
              @click="toggleSfw"
              :class="sfwMode ? 'sfw-on' : 'sfw-off'"
              class="sfw-btn"
            >
              <span>{{ sfwMode ? '🔒' : '🔞' }}</span>
              <span class="text-xs font-semibold">{{ sfwMode ? 'Safe' : '18+' }}</span>
            </button>

            <!-- Sección de Usuario / Auth -->
            <div class="flex items-center gap-1.5">
              <template v-if="currentUser">
                <div class="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-xl">
                  <img v-if="currentUser.photoURL" :src="currentUser.photoURL" class="w-6 h-6 rounded-full border border-white/20" alt="avatar">
                  <span v-else class="text-base">👤</span>
                  <span class="text-xs font-bold hidden sm:inline">{{ currentUser.displayName || currentUser.email?.split('@')[0] }}</span>
                </div>
                <button @click="handleLogout" class="icon-btn" title="Cerrar sesión">
                  <span class="text-base">🚪</span>
                </button>
              </template>
              <button v-else @click="showAuthModal = true" class="nav-btn nav-purple">
                <span>🔑</span>
                <span class="text-xs sm:text-sm">Entrar</span>
              </button>
            </div>
          </div>
        </nav>
      </header>

      <!-- Contenido Principal Dinámico -->
      <div class="relative z-10 max-w-7xl mx-auto px-4 pt-36 sm:pt-28 md:pt-32 pb-12">

        <!-- VISTA: EXPLORADOR DE ANIMES -->
        <main v-if="activeView === 'explore'">

          <!-- Sección Hero: Bienvenida y Buscador -->
          <section class="hero-section py-10 mb-8">
            <!-- Banner de Modo Demo -->
            <div v-if="isDemoMode" class="hero-badge mb-4 bg-amber-500/10 border-amber-500/20 text-amber-500">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Modo Invitado: Los datos se guardan solo en este PC.
              <button @click="showAuthModal = true" class="ml-2 font-black border-b-2 border-amber-500/30 hover:border-amber-400 hover:text-amber-400 transition-all cursor-pointer">Registrarse</button>
            </div>
            <div v-else class="hero-badge mb-4">
              <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Top Animes en tiempo real
            </div>
            <h1 class="hero-title mb-3">
              Descubre el
              <span class="gradient-text">universo anime</span>
            </h1>
            <p class="hero-sub mb-8">
              Explora, puntúa y lleva el control de tus series favoritas
            </p>

            <!-- Buscador Principal con Estilo Hero -->
            <div class="hero-search-wrap">
              <div class="hero-search">
                <span class="search-icon">🔍</span>
                <input
                  v-model="searchQuery"
                  @input="handleSearch"
                  type="text"
                  placeholder="Busca cualquier anime..."
                  class="hero-input"
                />
                <button v-if="searchQuery" @click="searchQuery = ''; handleSearch()" class="clear-btn">✕</button>
              </div>

              <!-- Selectores de Filtrado Rápido -->
              <div class="flex gap-2 mt-3 flex-wrap justify-center">
                <select v-model="selectedGenre" @change="handleSearch" class="filter-select">
                  <option value="">Todos los géneros</option>
                  <option v-for="genre in filteredGenresList" :key="genre.mal_id" :value="genre.mal_id">{{ genre.name }}</option>
                </select>
                <select v-model="selectedStatus" @change="handleSearch" class="filter-select">
                  <option value="">Cualquier estado</option>
                  <option value="airing">En Emisión</option>
                  <option value="complete">Finalizado</option>
                  <option value="upcoming">Próximamente</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Sección de Resultados del Catálogo -->
          <section ref="resultsSection">
            <div class="flex items-center gap-3 mb-6">
              <div class="section-dot"></div>
              <h2 class="section-title text-lg font-bold">
                {{ searchQuery || selectedGenre || selectedStatus ? '🔍 Resultados de búsqueda' : '🔥 Top Animes' }}
              </h2>
              <div class="flex-1 h-px section-divider"></div>
              <span v-if="!loading" class="text-xs section-count">
                {{ totalItems > 0 ? `${totalItems.toLocaleString()} animes` : `${displayedAnimes.length} animes` }}
              </span>
            </div>

            <!-- Indicador de Carga (Skeletons) -->
            <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
              <div v-for="i in 12" :key="i" class="skeleton-card"></div>
            </div>

            <!-- Estado Vacío (Sin Resultados) -->
            <div v-else-if="displayedAnimes.length === 0"
              class="flex flex-col items-center justify-center h-64 gap-4">
              <p class="text-6xl">🎌</p>
              <p class="text-white/50 text-lg">No se encontraron animes con estos filtros</p>
            </div>

            <!-- Cuadrícula de Tarjetas de Anime -->
            <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
              <AnimeCard
                v-for="(anime, i) in displayedAnimes"
                :key="anime.mal_id"
                :anime="anime"
                @select="selectedAnime = $event"
                :style="{ animationDelay: `${i * 40}ms` }"
                class="card-appear"
              />
            </div>

            <!-- Controles de Paginación -->
            <div v-if="!loading && totalPages > 1" class="pagination-wrap mt-10 flex flex-wrap items-center justify-center gap-2">
              <!-- Botón Anterior -->
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="page-btn page-nav"
                title="Página anterior"
              >◀</button>

              <!-- Números de página -->
              <template v-for="p in visiblePages" :key="typeof p === 'number' ? p : `ellipsis-${p}`">
                <span v-if="p === '...'" class="page-ellipsis">…</span>
                <button
                  v-else
                  @click="goToPage(p as number)"
                  :class="p === currentPage ? 'page-btn page-active' : 'page-btn page-idle'"
                >{{ p }}</button>
              </template>

              <!-- Botón Siguiente -->
              <button
                @click="goToPage(currentPage + 1)"
                :disabled="!hasNextPage && currentPage === totalPages"
                class="page-btn page-nav"
                title="Página siguiente"
              >▶</button>

              <!-- Info de página -->
              <span class="page-info">Pág. {{ currentPage }} / {{ totalPages }}</span>
            </div>
          </section>
        </main>

        <!-- VISTA: ANIMES DE LA TEMPORADA ACTUAL -->
        <main v-else-if="activeView === 'season'" class="pt-8">
          <div class="flex items-center gap-3 mb-8">
            <div class="section-dot pink"></div>
            <h2 class="text-2xl font-bold text-white">🌸 Temporada Actual</h2>
            <div class="flex-1 h-px section-divider"></div>
            <span v-if="!seasonLoading && seasonAnimes.length > 0" class="text-xs section-count">
              {{ seasonAnimes.length }} animes
            </span>
          </div>
          <!-- Carga: esqueletos + mensaje de progreso -->
          <div v-if="seasonLoading">
            <p class="text-center text-sm text-white/40 mb-6 animate-pulse">
              ⏳ Cargando todos los animes de la temporada...
            </p>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
              <div v-for="i in 24" :key="i" class="skeleton-card"></div>
            </div>
          </div>
          <div v-else-if="seasonAnimes.length === 0 && seasonLoaded" class="text-center text-white/40 py-20 text-lg">
            No se encontraron animes de temporada.
          </div>
          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
            <AnimeCard
              v-for="(anime, i) in seasonAnimes"
              :key="anime.mal_id"
              :anime="anime"
              @select="selectedAnime = $event"
              :style="{ animationDelay: `${i * 30}ms` }"
              class="card-appear"
            />
          </div>
        </main>

        <!-- VISTA: GESTIÓN DE MI LISTA PERSONAL -->
        <main v-else-if="activeView === 'mylist'" class="pt-8">
          <div class="flex items-center gap-3 mb-8">
            <div class="section-dot purple"></div>
            <h2 class="text-2xl font-bold text-white">📋 Mi Lista de Animes</h2>
          </div>
          <MyListView ref="myListViewRef" @open-anime="selectedAnime = $event" />
        </main>

        <!-- VISTA: PANEL DE ESTADÍSTICAS DE USUARIO -->
        <main v-else-if="activeView === 'stats'" class="pt-8">
          <div class="flex items-center gap-3 mb-8">
            <div class="section-dot emerald"></div>
            <h2 class="text-2xl font-bold text-white">📊 Mis Estadísticas</h2>
          </div>
          <StatsView />
        </main>

      </div>

      <!-- Modal de Detalles del Anime Seleccionado -->
      <AnimeModal
        v-if="selectedAnime"
        :anime="selectedAnime"
        @close="selectedAnime = null"
        @saved="onModalSaved"
        @select-rec="openRecommendation"
      />
    </div>
    <!-- Modal de Autenticación (fuera del v-else para que funcione desde la Landing) -->
    <AuthModal v-if="showAuthModal" @close="showAuthModal = false" />

    <!-- Toast: sesión expirada por inactividad -->
    <transition name="toast">
      <div v-if="sessionToast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold"
        style="background: rgba(239,68,68,0.95); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15);">
        <span>⏱️</span>
        <span>Sesión cerrada por inactividad. Vuelve a iniciar sesión.</span>
      </div>
    </transition>
  </div>

</template>

<style scoped>
/* Estilos CSS Dinámicos y Variables de Diseño */

/* Configuración Raíz y Transiciones de Tema */
.app-root {
  min-height: 100vh;
  transition: background 0.4s, color 0.4s;
}

/* Orbes Animados de Fondo (Decorative Background) */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.12;  /* claro: más sutil */
  animation: drift 20s ease-in-out infinite alternate;
}
.dark .orb { opacity: 0.18; }
.orb-1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, #6d28d9, transparent 70%);
  top: -150px; left: -100px;
  animation-delay: 0s;
}
.orb-2 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #2563eb, transparent 70%);
  top: 30%; right: -100px;
  animation-delay: -7s;
}
.orb-3 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #db2777, transparent 70%);
  bottom: -100px; left: 30%;
  animation-delay: -14s;
}
@keyframes drift {
  0%   { transform: translate(0, 0) scale(1); }
  50%  { transform: translate(30px, -30px) scale(1.05); }
  100% { transform: translate(-20px, 20px) scale(0.95); }
}
.grain {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  opacity: 0.25;
  pointer-events: none;
}
.dark .grain { opacity: 0.4; }

/* Estilos de la Barra de Navegación Superior */
/* Navegación: Variantes para Modo Claro */
.glass-nav {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 10px 30px -10px rgba(0, 0, 0, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}
/* Navegación: Variantes para Modo Oscuro */
.dark .glass-nav {
  background: rgba(15, 18, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 20px 40px -15px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.logo-btn {
  background: none;
  border: none;
  cursor: pointer;
}
.logo-icon { filter: drop-shadow(0 0 8px rgba(139,92,246,0.6)); }
.logo-text {
  background: linear-gradient(135deg, #a78bfa, #60a5fa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-idle {
  background: transparent;
  color: rgba(0,0,0,0.5);
}
.dark .nav-idle { color: rgba(255,255,255,0.5); }
.nav-idle:hover {
  background: rgba(0,0,0,0.05);
  color: #1a1a2e;
  transform: translateY(-1px);
}
.dark .nav-idle:hover {
  background: rgba(255,255,255,0.08);
  color: white;
}
.nav-active { 
  color: white; 
  transform: translateY(-1px) scale(1.05);
}
.nav-blue   { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 8px 20px -6px rgba(37,99,235,0.5); }
.nav-pink   { background: linear-gradient(135deg, #ec4899, #db2777); box-shadow: 0 8px 20px -6px rgba(219,39,119,0.5); }
.nav-purple { background: linear-gradient(135deg, #a855f7, #7c3aed); box-shadow: 0 8px 20px -6px rgba(124,58,237,0.5); }
.nav-emerald{ background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 8px 20px -6px rgba(5,150,105,0.5); }

.icon-btn {
  width: 34px; height: 34px;
  border-radius: 0.65rem;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.2s;
}
.dark .icon-btn {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.08);
}
.icon-btn:hover { background: rgba(0,0,0,0.12); }
.dark .icon-btn:hover { background: rgba(255,255,255,0.1); }

.sfw-btn {
  display: flex; align-items: center; gap: 0.3rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.75rem;
  border: none; cursor: pointer;
  transition: all 0.2s;
}
.sfw-on  { background: linear-gradient(135deg, #059669, #10b981); color: white; box-shadow: 0 4px 14px rgba(16,185,129,0.3); }
.sfw-off { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; box-shadow: 0 4px 14px rgba(220,38,38,0.3); }

/* Estilos para la Sección Hero de Bienvenida */
.hero-section {
  text-align: center;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 1rem;
  background: rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 99px;
  font-size: 0.75rem;
  color: rgba(0,0,0,0.5);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.dark .hero-badge {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
}
.hero-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  color: #1a1a2e;
  line-height: 1.1;
  letter-spacing: -1px;
}
.dark .hero-title { color: white; }
.gradient-text {
  background: linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #db2777 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  color: rgba(0,0,0,0.45);
  font-size: 1rem;
}
.dark .hero-sub { color: rgba(255,255,255,0.4); }

/* Estilos Específicos del Buscador Hero */
.hero-search-wrap { max-width: 580px; margin: 0 auto; }
.hero-search {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.9);
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 1rem;
  backdrop-filter: blur(12px);
  transition: border-color 0.3s, box-shadow 0.3s;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.dark .hero-search {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.12);
  box-shadow: none;
}
.hero-search:focus-within {
  border-color: rgba(124,58,237,0.6);
  box-shadow: 0 0 0 3px rgba(124,58,237,0.15), 0 8px 30px rgba(124,58,237,0.1);
}
.search-icon {
  padding: 0 0.5rem 0 1rem;
  font-size: 1rem;
  opacity: 0.4;
}
.hero-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #1a1a2e;
  font-size: 1rem;
  padding: 0.85rem 0.5rem;
}
.dark .hero-input { color: white; }
.hero-input::placeholder { color: rgba(0,0,0,0.3); }
.dark .hero-input::placeholder { color: rgba(255,255,255,0.25); }
.clear-btn {
  padding: 0 1rem;
  color: rgba(0,0,0,0.35);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  transition: color 0.2s;
}
.dark .clear-btn { color: rgba(255,255,255,0.4); }
.clear-btn:hover { color: #1a1a2e; }
.dark .clear-btn:hover { color: white; }

/* Estilos para Selectores Desplegables (Dropdowns) */
.filter-select {
  /* Fondo sólido siempre visible en modo claro */
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.15);
  color: #1a1a2e;
  border-radius: 0.65rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  appearance: none;
}
.dark .filter-select {
  background: #1a1f35;  /* Sólido oscuro = las options del SO se ven bien */
  border-color: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.85);
}
.filter-select option {
  background: #ffffff;
  color: #1a1a2e;
}
.dark .filter-select option {
  background: #1a1f35;
  color: white;
}
.filter-select:focus {
  border-color: rgba(124,58,237,0.6);
}

/* Decoradores Visuales de Sección (Puntos de Color) */
.section-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6d28d9, #2563eb);
  box-shadow: 0 0 10px rgba(109,40,217,0.6);
  flex-shrink: 0;
}
.section-dot.pink    { background: linear-gradient(135deg, #db2777, #ec4899); box-shadow: 0 0 10px rgba(219,39,119,0.6); }
.section-dot.purple  { background: linear-gradient(135deg, #7c3aed, #a855f7); box-shadow: 0 0 10px rgba(124,58,237,0.6); }
.section-dot.emerald { background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 0 10px rgba(5,150,105,0.6); }

/* Estados de Carga (Skeleton Loader Animations) */
.skeleton-card {
  height: 18rem;
  border-radius: 1rem;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Animaciones de Entrada para Tarjetas (Staggered Appear) */
.card-appear {
  animation: fadeUp 0.5s ease both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Adaptación de Colores para Títulos de Sección */
.section-title { color: rgba(255,255,255,0.9); }
.light .section-title { color: #1e293b; }

.section-divider { background: rgba(255,255,255,0.05); }
.light .section-divider { background: #e2e8f0; }

.section-count { color: rgba(255,255,255,0.3); }
.light .section-count { color: #94a3b8; }

/* Controles de Paginación */
.pagination-wrap {
  padding: 0.5rem 0 1.5rem;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 0.6rem;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.page-idle {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.08);
}
.light .page-idle {
  background: rgba(0,0,0,0.05);
  color: rgba(0,0,0,0.55);
  border: 1px solid rgba(0,0,0,0.1);
}
.page-idle:hover {
  background: rgba(255,255,255,0.12);
  color: white;
  transform: translateY(-1px);
}
.light .page-idle:hover {
  background: rgba(0,0,0,0.1);
  color: #1a1a2e;
}
.page-active {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: white;
  box-shadow: 0 6px 18px -4px rgba(124,58,237,0.5);
  transform: translateY(-1px) scale(1.05);
}
.page-nav {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.08);
  font-size: 0.7rem;
}
.light .page-nav {
  background: rgba(0,0,0,0.05);
  color: rgba(0,0,0,0.4);
  border: 1px solid rgba(0,0,0,0.1);
}
.page-nav:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  color: white;
}
.light .page-nav:hover:not(:disabled) {
  background: rgba(0,0,0,0.1);
  color: #1a1a2e;
}
.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}
.page-ellipsis {
  color: rgba(255,255,255,0.3);
  font-size: 0.9rem;
  padding: 0 0.25rem;
  user-select: none;
}
.light .page-ellipsis { color: rgba(0,0,0,0.3); }
.page-info {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.3);
  margin-left: 0.5rem;
  font-weight: 600;
}
.light .page-info { color: rgba(0,0,0,0.35); }

/* Toast de sesión expirada */
.toast-enter-active, .toast-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }</style>
