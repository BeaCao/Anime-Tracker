<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPublicStats } from '../services/api'

const emit = defineEmits(['login', 'demo'])

const features = [
  { icon: '🚀', title: 'Seguimiento Real', desc: 'Lleva el control de tus episodios al segundo.' },
  { icon: '📊', title: 'Estadísticas Vivas', desc: 'Visualiza tu progreso con gráficos dinámicos.' },
  { icon: '🌍', title: 'Comunidad', desc: 'Descubre qué es tendencia en todo el mundo.' },
]

// ── Contadores globales ──────────────────────────────────────────────────────
const displayUsers  = ref(0)
const displayAnimes = ref(0)
const statsLoaded   = ref(false)

// Animación count-up suave
const animateCount = (target: number, setter: (v: number) => void, duration = 1800) => {
  if (target === 0) { setter(0); return }
  const start    = performance.now()
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    // easeOutExpo
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
    setter(Math.round(ease * target))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(async () => {
  const stats = await getPublicStats()
  statsLoaded.value = true
  animateCount(stats.userCount,  v => (displayUsers.value  = v))
  animateCount(stats.animeCount, v => (displayAnimes.value = v), 2000)
})
</script>

<template>
  <div class="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#030712] text-white p-6">
    <!-- Fondos Decorativos -->
    <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" style="animation-delay: 2s"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-pink-600/10 blur-[100px] rounded-full"></div>

    <div class="relative z-10 max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">

      <!-- Lado Izquierdo: Branding -->
      <div class="text-center md:text-left">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
          <span class="text-xs font-bold uppercase tracking-widest text-purple-400">Próxima Generación</span>
        </div>
        <h1 class="text-6xl md:text-7xl font-black mb-6 leading-tight">
          Tu vida <br>
          <span class="bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent">en Anime.</span>
        </h1>
        <p class="text-xl text-gray-400 mb-8 max-w-lg">
          La plataforma definitiva para organizar, descubrir y analizar tu pasión por el anime. Todo en un solo lugar.
        </p>

        <!-- ── Contadores globales ── -->
        <div class="grid grid-cols-2 gap-4 mb-8">
          <!-- Usuarios registrados -->
          <div class="stat-card group">
            <div class="stat-glow stat-glow-purple"></div>
            <div class="relative z-10">
              <div class="flex items-center gap-2 mb-1">
                <span class="live-dot"></span>
                <span class="text-xs text-gray-400 uppercase tracking-widest font-semibold">Usuarios</span>
              </div>
              <div class="stat-number text-purple-300">
                <span v-if="statsLoaded">{{ displayUsers.toLocaleString('es-ES') }}</span>
                <span v-else class="stat-skeleton">···</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">personas registradas</p>
            </div>
          </div>

          <!-- Animes guardados -->
          <div class="stat-card group">
            <div class="stat-glow stat-glow-blue"></div>
            <div class="relative z-10">
              <div class="flex items-center gap-2 mb-1">
                <span class="live-dot live-dot-blue"></span>
                <span class="text-xs text-gray-400 uppercase tracking-widest font-semibold">Animes</span>
              </div>
              <div class="stat-number text-blue-300">
                <span v-if="statsLoaded">{{ displayAnimes.toLocaleString('es-ES') }}</span>
                <span v-else class="stat-skeleton">···</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">guardados en total</p>
            </div>
          </div>
        </div>

        <!-- Feature cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-for="f in features" :key="f.title" class="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div class="text-2xl mb-2">{{ f.icon }}</div>
            <div class="font-bold text-sm mb-1">{{ f.title }}</div>
            <div class="text-xs text-gray-500">{{ f.desc }}</div>
          </div>
        </div>
      </div>

      <!-- Lado Derecho: Acciones -->
      <div class="flex flex-col gap-4 p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative">
        <div class="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/30 blur-3xl"></div>

        <h2 class="text-2xl font-bold text-center mb-6">Comienza tu viaje</h2>

        <button
          @click="emit('login')"
          class="group relative w-full py-4 bg-white text-black font-black rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/10"
        >
          <span class="relative z-10 flex items-center justify-center gap-3">
            <span>🔑</span> Iniciar Sesión / Registrarse
          </span>
        </button>

        <div class="flex items-center gap-4 my-2">
          <div class="flex-grow h-px bg-white/10"></div>
          <span class="text-xs text-gray-500 font-bold uppercase">ó</span>
          <div class="flex-grow h-px bg-white/10"></div>
        </div>

        <button
          @click="emit('demo')"
          class="w-full py-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
        >
          🎮 Probar Modo Demo (Local)
        </button>

        <p class="text-[10px] text-center text-gray-500 mt-4 px-6 uppercase tracking-widest font-medium leading-relaxed">
          El modo demo guarda los datos solo en este navegador. <br>
          Inicia sesión para sincronizar en todos tus dispositivos.
        </p>
      </div>
    </div>

    <!-- Decoración inferior -->
    <div class="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20 flex items-center gap-2">
      <span class="text-2xl">🎌</span>
      <span class="text-xl font-black tracking-tighter">AniKiroku</span>
    </div>
  </div>
</template>

<style scoped>
/* Tarjeta de estadística */
.stat-card {
  position: relative;
  padding: 1rem 1.25rem;
  border-radius: 1.25rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
  transition: border-color 0.3s, background 0.3s;
}
.stat-card:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.15);
}

/* Brillo de fondo de la tarjeta */
.stat-glow {
  position: absolute;
  inset: -20px;
  opacity: 0.15;
  border-radius: 50%;
  filter: blur(30px);
  transition: opacity 0.3s;
}
.stat-card:hover .stat-glow { opacity: 0.28; }
.stat-glow-purple { background: radial-gradient(circle, #a855f7, transparent 70%); }
.stat-glow-blue   { background: radial-gradient(circle, #3b82f6, transparent 70%); }

/* Número grande animado */
.stat-number {
  font-size: 2.25rem;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}

/* Punto live pulsante */
.live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #a855f7;
  box-shadow: 0 0 6px #a855f7;
  animation: pulse-dot 2s ease-in-out infinite;
}
.live-dot-blue {
  background: #3b82f6;
  box-shadow: 0 0 6px #3b82f6;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.7); }
}

/* Skeleton mientras carga */
.stat-skeleton {
  opacity: 0.3;
  animation: blink 1.2s ease-in-out infinite;
}
@keyframes blink {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.7; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-float { animation: float 4s ease-in-out infinite; }
</style>
