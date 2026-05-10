import { auth } from '../firebase'


const BASE_URL = 'http://localhost:8080/api/user-anime'

export const api = {
  async getHeaders(): Promise<HeadersInit> {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken()
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
    return { 'Content-Type': 'application/json' }
  },

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

    const query = new URLSearchParams(params).toString()
    const res = await fetch(`${BASE_URL}?${query}`, { headers: await this.getHeaders() })
    return res.json()
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

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(anime)
    })
    return res.json()
  },

  async delete(malId: number) {
    if (this.isDemo()) {
      const list = this.getLocalList().filter((a: any) => a.malId !== malId)
      this.saveLocalList(list)
      return
    }

    await fetch(`${BASE_URL}/${malId}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    })
  },

  async exists(malId: number) {
    if (this.isDemo()) {
      return this.getLocalList().some((a: any) => a.malId === malId)
    }

    const res = await fetch(`${BASE_URL}/exists/${malId}`, { headers: await this.getHeaders() })
    return res.json()
  },

  async getById(malId: number) {
    if (this.isDemo()) {
      return this.getLocalList().find((a: any) => a.malId === malId)
    }

    const res = await fetch(`${BASE_URL}/${malId}`, { headers: await this.getHeaders() })
    return res.json()
  }
}
