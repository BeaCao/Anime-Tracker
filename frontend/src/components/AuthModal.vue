<script setup lang="ts">
import { ref, computed } from 'vue'
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
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// --- Validación de contraseña ---
const passwordStrength = computed(() => {
  const p = password.value
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  return labels[passwordStrength.value] || ''
})

const strengthColor = computed(() => {
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']
  return colors[passwordStrength.value] || ''
})

const validateForm = (): string | null => {
  if (!email.value || !password.value) return 'Por favor, rellena todos los campos.'
  if (!email.value.includes('@')) return 'Introduce un email válido.'
  if (!isLogin.value) {
    if (password.value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!/[A-Z]/.test(password.value)) return 'La contraseña debe tener al menos una mayúscula.'
    if (!/[0-9]/.test(password.value)) return 'La contraseña debe tener al menos un número.'
    if (password.value !== confirmPassword.value) return 'Las contraseñas no coinciden.'
  }
  return null
}

const mapFirebaseError = (code: string): string => {
  const map: Record<string, string> = {
    'auth/user-not-found':        'No existe ninguna cuenta con este email.',
    'auth/wrong-password':        'Contraseña incorrecta. ¿Olvidaste tu contraseña?',
    'auth/invalid-credential':    'Email o contraseña incorrectos.',
    'auth/email-already-in-use':  'Este email ya está registrado. Prueba a iniciar sesión.',
    'auth/weak-password':         'La contraseña es demasiado débil (mínimo 8 caracteres).',
    'auth/invalid-email':         'El formato del email no es válido.',
    'auth/too-many-requests':     'Demasiados intentos fallidos. Espera unos minutos.',
    'auth/network-request-failed':'Sin conexión. Comprueba tu red.',
    'auth/popup-blocked':         'El navegador bloqueó la ventana. Permite las ventanas emergentes.',
    'auth/popup-closed-by-user':  'Cerraste la ventana antes de completar el inicio de sesión.',
    'auth/unauthorized-domain':   `Dominio no autorizado en Firebase. Añade "${window.location.hostname}" en la consola.`,
    'auth/operation-not-allowed': 'Este método de acceso no está activado en Firebase.',
    'auth/user-disabled':         'Esta cuenta ha sido desactivada. Contacta con soporte.',
  }
  return map[code] || `Error inesperado (${code}). Inténtalo de nuevo.`
}

const handleGoogleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await signInWithPopup(auth, googleProvider)
    emit('close')
  } catch (e: any) {
    error.value = mapFirebaseError(e.code)
  } finally {
    loading.value = false
  }
}

const handleEmailAuth = async () => {
  const validationError = validateForm()
  if (validationError) {
    error.value = validationError
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
    error.value = mapFirebaseError(e.code)
  } finally {
    loading.value = false
  }
}

const resetPassword = async () => {
  if (!email.value) {
    error.value = 'Introduce tu email arriba para recuperar la contraseña.'
    return
  }
  if (!email.value.includes('@')) {
    error.value = 'Introduce un email válido.'
    return
  }
  try {
    await sendPasswordResetEmail(auth, email.value)
    error.value = '✅ Email de recuperación enviado. Revisa tu bandeja de entrada.'
  } catch (e: any) {
    error.value = mapFirebaseError(e.code)
  }
}

const switchMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
  password.value = ''
  confirmPassword.value = ''
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-hidden">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40 backdrop-blur-[8px]" @click="emit('close')"></div>
    
    <!-- Modal -->
    <div class="relative w-full max-w-md overflow-hidden animate-modal-in">
      
      <div class="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/30 blur-[60px] rounded-full"></div>
      <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/30 blur-[60px] rounded-full"></div>

      <div class="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-8 md:p-10">
        
        <button @click="emit('close')" class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-gray-500 dark:text-gray-400">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>

        <div class="text-center mb-8">
          <div class="inline-block p-4 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-600 mb-5 shadow-lg shadow-purple-500/20">
            <span class="text-3xl">🎌</span>
          </div>
          <h2 class="text-3xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">
            {{ isLogin ? '¡Hola de nuevo!' : 'Crea tu cuenta' }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Sincroniza tu lista en todos tus dispositivos
          </p>
        </div>

        <!-- Google -->
        <button 
          @click="handleGoogleLogin"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl font-bold text-gray-700 dark:text-white hover:border-purple-500/50 hover:bg-gray-50 dark:hover:bg-white/10 transition-all mb-5 group shadow-sm active:scale-95 disabled:opacity-50"
        >
          <svg class="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span class="mt-0.5">{{ loading ? 'Conectando...' : 'Continuar con Google' }}</span>
        </button>

        <div class="relative flex items-center justify-center mb-5">
          <div class="flex-grow h-px bg-gray-200 dark:bg-white/10"></div>
          <span class="mx-4 text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-[0.2em]">O usa tu correo</span>
          <div class="flex-grow h-px bg-gray-200 dark:bg-white/10"></div>
        </div>

        <!-- Form -->
        <div class="space-y-3">
          <!-- Email -->
          <div class="relative group">
            <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
              <i class="fa-solid fa-envelope"></i>
            </span>
            <input 
              v-model="email"
              type="email" 
              placeholder="Email"
              autocomplete="email"
              class="w-full py-4 pl-12 pr-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:border-purple-500 dark:focus:border-purple-500 text-gray-900 dark:text-white transition-all font-medium"
            >
          </div>

          <!-- Contraseña -->
          <div class="relative group">
            <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
              <i class="fa-solid fa-lock"></i>
            </span>
            <input 
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Contraseña"
              :autocomplete="isLogin ? 'current-password' : 'new-password'"
              class="w-full py-4 pl-12 pr-12 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:border-purple-500 dark:focus:border-purple-500 text-gray-900 dark:text-white transition-all font-medium"
            >
            <button type="button" @click="showPassword = !showPassword"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm">
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>

          <!-- Barra de fortaleza (solo registro) -->
          <transition name="fade">
            <div v-if="!isLogin && password" class="px-1">
              <div class="flex gap-1 mb-1">
                <div v-for="i in 4" :key="i"
                  class="h-1 flex-1 rounded-full transition-all duration-300"
                  :style="{ background: i <= passwordStrength ? strengthColor : '#e2e8f0' }">
                </div>
              </div>
              <p class="text-xs font-medium" :style="{ color: strengthColor }">
                {{ strengthLabel }} — mínimo 8 caracteres, una mayúscula y un número
              </p>
            </div>
          </transition>

          <!-- Confirmar contraseña (solo registro) -->
          <transition name="fade">
            <div v-if="!isLogin" class="relative group">
              <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                <i class="fa-solid fa-shield-halved"></i>
              </span>
              <input 
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirmar contraseña"
                autocomplete="new-password"
                class="w-full py-4 pl-12 pr-12 bg-gray-50 dark:bg-white/5 border rounded-2xl outline-none transition-all font-medium text-gray-900 dark:text-white"
                :class="confirmPassword && password !== confirmPassword 
                  ? 'border-red-400 dark:border-red-500 focus:border-red-500' 
                  : 'border-gray-200 dark:border-white/10 focus:border-purple-500 dark:focus:border-purple-500'"
              >
              <button type="button" @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm">
                {{ showConfirmPassword ? '🙈' : '👁️' }}
              </button>
              <transition name="fade">
                <span v-if="confirmPassword && password !== confirmPassword"
                  class="absolute -bottom-5 left-1 text-xs text-red-500 font-medium">
                  Las contraseñas no coinciden
                </span>
              </transition>
            </div>
          </transition>

          <!-- Error -->
          <transition name="fade">
            <p v-if="error" class="text-xs font-bold text-center py-2.5 px-3 rounded-xl"
              :class="error.startsWith('✅') 
                ? 'text-green-600 bg-green-500/10 border border-green-500/20' 
                : 'text-red-500 bg-red-500/10 border border-red-500/20'">
              {{ error }}
            </p>
          </transition>

          <!-- Botón submit -->
          <button 
            @click="handleEmailAuth"
            :disabled="loading"
            class="w-full py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_auto] hover:bg-right text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            <i v-if="!loading" class="fa-solid fa-right-to-bracket"></i>
            {{ loading ? 'Un momento...' : (isLogin ? 'Entrar' : 'Comenzar ahora') }}
          </button>
        </div>

        <div class="mt-6 text-center space-y-3">
          <button 
            @click="switchMode"
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
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
