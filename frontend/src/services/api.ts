import { auth, db } from '../firebase'
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, increment } from 'firebase/firestore'

// Guard: lanza un error claro si el usuario no está autenticado
const requireAuth = () => {
  const user = auth.currentUser
  if (!user) throw new Error('No autenticado. Por favor, inicia sesión.')
  return user
}

// ── Estadísticas públicas globales ─────────────────────────────────────────
const STATS_DOC = doc(db, 'publicStats', 'global')

// Lee las estadísticas globales (no requiere autenticación)
export const getPublicStats = async (): Promise<{ userCount: number; animeCount: number }> => {
  try {
    const snap = await getDoc(STATS_DOC)
    if (snap.exists()) {
      const d = snap.data()
      return {
        userCount:  Number(d.userCount)  || 0,
        animeCount: Number(d.animeCount) || 0,
      }
    }
    return { userCount: 0, animeCount: 0 }
  } catch {
    return { userCount: 0, animeCount: 0 }
  }
}

// Actualiza los contadores globales (solo los campos indicados)
const updateStats = async (delta: { userCount?: number; animeCount?: number }) => {
  try {
    const updates: any = {}
    if (delta.userCount   !== undefined) updates.userCount   = increment(delta.userCount)
    if (delta.animeCount  !== undefined) updates.animeCount  = increment(delta.animeCount)
    // setDoc con merge:true crea el doc si no existe
    await setDoc(STATS_DOC, updates, { merge: true })
  } catch (e) {
    // No crítico: no bloqueamos la operación principal si falla el contador
    console.warn('Stats update failed:', e)
  }
}

// Registra un usuario nuevo (solo si es la primera vez que guarda datos)
export const registerNewUser = async () => {
  const user = auth.currentUser
  if (!user) return
  const userDoc = doc(db, 'registeredUsers', user.uid)
  const snap = await getDoc(userDoc)
  if (!snap.exists()) {
    await setDoc(userDoc, { uid: user.uid, createdAt: Date.now() })
    await updateStats({ userCount: 1 })
  }
}

// Sincroniza el contador global con datos reales de un usuario existente
// Se llama una vez al hacer login para recuperar usuarios/animes previos al sistema de stats
export const syncStatsFromRealData = async () => {
  const user = auth.currentUser
  if (!user) return
  try {
    // 1. Registrar el usuario si no existe aún en registeredUsers
    const userDoc = doc(db, 'registeredUsers', user.uid)
    const userSnap = await getDoc(userDoc)
    if (!userSnap.exists()) {
      await setDoc(userDoc, { uid: user.uid, createdAt: Date.now(), synced: true })
      await updateStats({ userCount: 1 })
    }

    // 2. Contar los animes que este usuario tiene guardados
    const q = query(collection(db, 'user_animes'), where('userId', '==', user.uid))
    const snap = await getDocs(q)
    const realCount = snap.size

    // 3. Comparar con lo que se registró en syncedAnimeCount para no doble-contar
    const syncKey = `synced_anime_count_${user.uid}`
    const prevSynced = Number(localStorage.getItem(syncKey) || '0')
    const diff = realCount - prevSynced

    if (diff > 0) {
      await updateStats({ animeCount: diff })
      localStorage.setItem(syncKey, String(realCount))
    } else if (prevSynced === 0 && realCount > 0) {
      // Primera vez sync para este usuario
      await updateStats({ animeCount: realCount })
      localStorage.setItem(syncKey, String(realCount))
    }
  } catch (e) {
    console.warn('Sync stats failed:', e)
  }
}

export const api = {
  isDemo() {
    return !auth.currentUser
  },

  getLocalList() {
    return JSON.parse(localStorage.getItem('demo_anime_list') || '[]')
  },

  saveLocalList(list: any[]) {
    localStorage.setItem('demo_anime_list', JSON.stringify(list))
  },

  // Operaciones CRUD
  async getAll(params: any = {}) {
    if (this.isDemo()) {
      let list = this.getLocalList()
      if (params.watchStatus) list = list.filter((a: any) => a.watchStatus === params.watchStatus)
      if (params.genre) list = list.filter((a: any) => a.genres && a.genres.includes(params.genre))
      return list
    }

    const user = requireAuth()
    try {
      let q = query(collection(db, 'user_animes'), where('userId', '==', user.uid))
      if (params.watchStatus) {
        q = query(q, where('watchStatus', '==', params.watchStatus))
      }
      if (params.minScore) {
        q = query(q, where('userScore', '>=', Number(params.minScore)))
      }
      const snapshot = await getDocs(q)
      let list = snapshot.docs.map(doc => doc.data() as any)
      if (params.genre) {
        list = list.filter(a => a.genres && a.genres.includes(params.genre))
      }
      return list
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('Sin permiso para acceder a los datos.')
      throw e
    }
  },

  async save(anime: any) {
    if (this.isDemo()) {
      const list = this.getLocalList()
      const index = list.findIndex((a: any) => a.malId === anime.malId)
      if (index >= 0) {
        list[index] = { ...list[index], ...anime }
      } else {
        list.push({ ...anime, id: Date.now() })
      }
      this.saveLocalList(list)
      return anime
    }

    const user = requireAuth()
    try {
      const docId = `${user.uid}_${anime.malId}`

      // Detectar si es un anime nuevo en la lista (para actualizar contadores)
      // El getDoc puede fallar con permission-denied si el doc no existe aún
      // (las reglas evalúan resource.data que es null en docs inexistentes)
      // En ese caso asumimos que es nuevo — el setDoc posterior lo validará igualmente.
      let isNew = true
      try {
        const existing = await getDoc(doc(db, 'user_animes', docId))
        isNew = !existing.exists()
      } catch {
        isNew = true
      }

      anime.userId = user.uid
      if (!anime.id) anime.id = Date.now()
      await setDoc(doc(db, 'user_animes', docId), anime)

      // Registrar usuario nuevo + incrementar contador de animes si es entrada nueva
      if (isNew) {
        await registerNewUser()
        await updateStats({ animeCount: 1 })
      }
      return anime
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('Sin permiso para guardar datos.')
      throw e
    }
  },

  async delete(malId: number) {
    if (this.isDemo()) {
      const list = this.getLocalList().filter((a: any) => a.malId !== malId)
      this.saveLocalList(list)
      return
    }

    const user = requireAuth()
    try {
      const docId = `${user.uid}_${malId}`
      await deleteDoc(doc(db, 'user_animes', docId))
      // Decrementar contador global (mínimo 0)
      await updateStats({ animeCount: -1 })
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('Sin permiso para eliminar datos.')
      throw e
    }
  },

  async exists(malId: number) {
    if (this.isDemo()) {
      return this.getLocalList().some((a: any) => a.malId === malId)
    }

    const user = requireAuth()
    const docId = `${user.uid}_${malId}`
    const docSnap = await getDoc(doc(db, 'user_animes', docId))
    return docSnap.exists()
  },

  async getById(malId: number) {
    if (this.isDemo()) {
      return this.getLocalList().find((a: any) => a.malId === malId)
    }

    const user = requireAuth()
    const docId = `${user.uid}_${malId}`
    const docSnap = await getDoc(doc(db, 'user_animes', docId))
    if (docSnap.exists()) {
      return docSnap.data()
    }
    return null
  }
}
