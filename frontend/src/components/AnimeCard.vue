<script setup lang="ts">
defineProps<{
  anime: {
    mal_id: number
    title: string
    images: { jpg: { image_url: string; large_image_url?: string } }
    score: number
    episodes: number
    genres?: { mal_id: number; name: string }[]
    status?: string
  }
}>()

defineEmits(['select'])
</script>

<template>
  <div
    @click="$emit('select', anime)"
    class="anime-card group relative rounded-2xl overflow-hidden cursor-pointer"
    :title="anime.title"
  >
    <!-- Imagen principal -->
    <div class="relative h-72 overflow-hidden">
      <img
        :src="anime.images.jpg.large_image_url || anime.images.jpg.image_url"
        :alt="anime.title"
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />

      <!-- Superposición de gradiente (Overlay) -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

      <!-- Efecto de resplandor (Glow) en hover -->
      <div class="absolute inset-0 bg-gradient-to-t from-purple-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <!-- Etiqueta de emisión (Arriba a la izquierda) -->
      <div v-if="anime.status === 'Currently Airing'"
        class="absolute top-2 left-2 flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
        EN EMISIÓN
      </div>

      <!-- Etiqueta de premios (Solo si no está en emisión) -->
      <div v-else-if="(anime.genres || []).some((g: any) => g.name === 'Award Winning')"
        class="absolute top-2 left-2 flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-amber-500/30">
        🏆 Premiado
      </div>

      <!-- Puntuación (Arriba a la derecha) -->
      <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-yellow-400 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 border border-yellow-400/20">
        ⭐ {{ anime.score || '?' }}
      </div>

      <!-- Información en la parte inferior -->
      <div class="absolute bottom-0 left-0 right-0 p-3">
        <h3 class="text-white font-bold text-sm leading-tight line-clamp-2 mb-1 drop-shadow-lg">
          {{ anime.title }}
        </h3>
        <div class="flex items-center justify-between">
          <span class="text-gray-300 text-xs">
            {{ anime.episodes ? `${anime.episodes} eps` : 'Eps: ?' }}
          </span>
          <!-- Géneros (Máximo 2) -->
          <div class="flex gap-1">
            <span
              v-for="genre in (anime.genres || []).filter((g: any) => g.name !== 'Award Winning').slice(0, 2)"
              :key="genre.mal_id"
              class="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-gray-200 border border-white/10"
            >{{ genre.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Borde interactivo en hover -->
    <div class="card-border"></div>
  </div>
</template>

<style scoped>
.anime-card {
  background: #111827;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.35s ease;
}
.anime-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 60px rgba(139, 92, 246, 0.3),
              0 8px 20px rgba(0, 0, 0, 0.6);
}

.card-border {
  position: absolute;
  inset: 0;
  border-radius: 1rem;
  border: 1px solid rgba(255,255,255,0.06);
  pointer-events: none;
  transition: border-color 0.3s;
}
.anime-card:hover .card-border {
  border-color: rgba(139, 92, 246, 0.4);
}
</style>
