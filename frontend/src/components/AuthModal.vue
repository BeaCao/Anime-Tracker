<script setup lang="ts">
import { ref } from 'vue'
import { auth, googleProvider } from '../firebase'
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth'

const emit = defineEmits(['close'])

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleGoogleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await signInWithPopup(auth, googleProvider)
    emit('close')
  } catch (e: any) {
    error.value = 'Error al conectar con Google'
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleEmailAuth = async () => {
  if (!email.value || !password.value) {
    error.value = 'Por favor, rellena todos los campos'
    return
  }
  
  loading.value = true
  error.value = ''
  try {
    if (isLogin.value) {
      await signInWithEmailAndPassword(auth, email.value, password.value)
    } else {
      await createUserWithEmailAndPassword(auth, email.value, password.value)
    }
    emit('close')
  } catch (e: any) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
      error.value = 'Email o contraseña incorrectos'
    } else if (e.code === 'auth/email-already-in-use') {
      error.value = 'Este email ya está registrado'
    } else {
      error.value = 'Error en la autenticación'
    }
  } finally {
    loading.value = false
  }
}

const resetPassword = async () => {
  if (!email.value) {
    error.value = 'Introduce tu email para recuperar la contraseña'
    return
  }
  try {
    await sendPasswordResetEmail(auth, email.value)
    error.value = 'Email de recuperación enviado'
  } catch (e) {
    error.value = 'Error al enviar el email'
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-hidden">
    <!-- Backdrop Premium -->
    <div class="absolute inset-0 bg-black/40 backdrop-blur-[8px]" @click="emit('close')"></div>
    
    <!-- Modal Glassmorphism -->
    <div class="relative w-full max-w-md overflow-hidden animate-modal-in">
      
      <!-- Fondo decorativo interno -->
      <div class="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/30 blur-[60px] rounded-full"></div>
      <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/30 blur-[60px] rounded-full"></div>

      <div class="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-8 md:p-10">
        
        <button @click="emit('close')" class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-gray-500 dark:text-gray-400">
          <span class="text-xl">✕</span>
        </button>

        <div class="text-center mb-10">
          <div class="inline-block p-4 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-600 mb-6 shadow-lg shadow-purple-500/20">
            <span class="text-3xl">🎌</span>
          </div>
          <h2 class="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
            {{ isLogin ? '¡Hola de nuevo!' : 'Crea tu cuenta' }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Sincroniza tu lista en todos tus dispositivos
          </p>
        </div>

        <!-- Social Login -->
        <button 
          @click="handleGoogleLogin"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl font-bold text-gray-700 dark:text-white hover:border-purple-500/50 hover:bg-gray-50 dark:hover:bg-white/10 transition-all mb-6 group shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" class="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google">
          Continuar con Google
        </button>

        <div class="relative flex items-center justify-center mb-6">
          <div class="flex-grow h-px bg-gray-200 dark:bg-white/10"></div>
          <span class="mx-4 text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-[0.2em]">O usa tu correo</span>
          <div class="flex-grow h-px bg-gray-200 dark:bg-white/10"></div>
        </div>

        <!-- Form -->
        <div class="space-y-4">
          <div class="relative group">
            <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">✉️</span>
            <input 
              v-model="email"
              type="email" 
              placeholder="Email"
              class="w-full py-4 pl-12 pr-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:border-purple-500 dark:focus:border-purple-500 text-gray-900 dark:text-white transition-all font-medium"
            >
          </div>
          <div class="relative group">
            <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">🔒</span>
            <input 
              v-model="password"
              type="password" 
              placeholder="Contraseña"
              class="w-full py-4 pl-12 pr-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:border-purple-500 dark:focus:border-purple-500 text-gray-900 dark:text-white transition-all font-medium"
            >
          </div>

          <transition name="fade">
            <p v-if="error" class="text-xs text-red-500 font-bold text-center bg-red-500/10 py-2 rounded-xl border border-red-500/20">
              {{ error }}
            </p>
          </transition>

          <button 
            @click="handleEmailAuth"
            :disabled="loading"
            class="w-full py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_auto] hover:bg-right text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {{ loading ? 'Un momento...' : (isLogin ? 'Entrar' : 'Comenzar ahora') }}
          </button>
        </div>

        <div class="mt-8 text-center space-y-4">
          <button 
            @click="isLogin = !isLogin"
            class="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
          >
            {{ isLogin ? '¿Nuevo por aquí? Crea una cuenta' : '¿Ya tienes cuenta? Inicia sesión' }}
          </button>
          <div v-if="isLogin">
            <button 
              @click="resetPassword"
              class="text-[10px] uppercase tracking-wider font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Recuperar mi contraseña
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95) translateY(30px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-modal-in {
  animation: modal-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
