<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits(['login', 'demo'])

const features = [
  { icon: '🚀', title: 'Seguimiento Real', desc: 'Lleva el control de tus episodios al segundo.' },
  { icon: '📊', title: 'Estadísticas Vivas', desc: 'Visualiza tu progreso con gráficos dinámicos.' },
  { icon: '🌍', title: 'Comunidad', desc: 'Descubre qué es tendencia en todo el mundo.' },
]
</script>

<template>
  <div class="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#030712] text-white p-6">
    <!-- Fondos Decorativos -->
    <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" style="animation-delay: 2s"></div>
    
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
        <p class="text-xl text-gray-400 mb-10 max-w-lg">
          La plataforma definitiva para organizar, descubrir y analizar tu pasión por el anime. Todo en un solo lugar.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
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

    <!-- Decoración inferior: Logo sutil -->
    <div class="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20 flex items-center gap-2">
      <span class="text-2xl">🎌</span>
      <span class="text-xl font-black tracking-tighter">AniKiroku</span>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-float {
  animation: float 4s ease-in-out infinite;
}
</style>
