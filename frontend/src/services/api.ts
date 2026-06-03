import { auth, db } from '../firebase'
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where } from 'firebase/firestore'

// Guard: lanza un error claro si el usuario no está autenticado
const requireAuth = () => {
  const user = auth.currentUser
  if (!user) throw new Error('No autenticado. Por favor, inicia sesión.')
  return user
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
      anime.userId = user.uid
      if (!anime.id) anime.id = Date.now()
      await setDoc(doc(db, 'user_animes', docId), anime)
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
