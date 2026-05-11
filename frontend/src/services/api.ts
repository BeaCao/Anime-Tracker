import { auth, db } from '../firebase'
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where } from 'firebase/firestore'

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

    const uid = auth.currentUser!.uid
    let q = query(collection(db, 'user_animes'), where('userId', '==', uid))
    
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

    const uid = auth.currentUser!.uid
    const docId = `${uid}_${anime.malId}`
    anime.userId = uid
    if (!anime.id) anime.id = Date.now()
    
    await setDoc(doc(db, 'user_animes', docId), anime)
    return anime
  },

  async delete(malId: number) {
    if (this.isDemo()) {
      const list = this.getLocalList().filter((a: any) => a.malId !== malId)
      this.saveLocalList(list)
      return
    }

    const uid = auth.currentUser!.uid
    const docId = `${uid}_${malId}`
    await deleteDoc(doc(db, 'user_animes', docId))
  },

  async exists(malId: number) {
    if (this.isDemo()) {
      return this.getLocalList().some((a: any) => a.malId === malId)
    }

    const uid = auth.currentUser!.uid
    const docId = `${uid}_${malId}`
    const docSnap = await getDoc(doc(db, 'user_animes', docId))
    return docSnap.exists()
  },

  async getById(malId: number) {
    if (this.isDemo()) {
      return this.getLocalList().find((a: any) => a.malId === malId)
    }

    const uid = auth.currentUser!.uid
    const docId = `${uid}_${malId}`
    const docSnap = await getDoc(doc(db, 'user_animes', docId))
    if (docSnap.exists()) {
      return docSnap.data()
    }
    return null
  }
}
