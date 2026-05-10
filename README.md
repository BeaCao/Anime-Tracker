# 🎌 AniKiroku - Anime Tracker Pro

**AniKiroku** es una plataforma moderna y sofisticada para los amantes del anime. Permite explorar los títulos más populares, gestionar una lista personal de seguimiento y analizar estadísticas detalladas de visionado, todo envuelto en una interfaz de usuario premium con efectos de cristal y modo oscuro.

![AniKiroku Preview](https://img.shields.io/badge/UI-Premium-blueviolet)
![Backend](https://img.shields.io/badge/Backend-Spring%20Boot-brightgreen)
![Frontend](https://img.shields.io/badge/Frontend-Vue%203-blue)
![Database](https://img.shields.io/badge/Database-Firebase%20Firestore-orange)
![Auth](https://img.shields.io/badge/Auth-Firebase-yellow)

## ✨ Características Principales

- 🔍 **Exploración Total**: Buscador avanzado integrado con la API de Jikan (MyAnimeList).
- 🌸 **Temporadas**: Consulta los animes de la temporada actual en tiempo real.
- 📋 **Gestión de Lista**: Añade, edita puntuaciones, capítulos vistos y notas personales.
- 📊 **Estadísticas PRO**: Gráficos dinámicos sobre tus géneros favoritos y progreso de visionado.
- 🔐 **Autenticación Dual**: Inicia sesión con **Google** o **Email** para sincronizar tus datos.
- 🎮 **Modo Demo (Invitado)**: Prueba la app sin registrarte usando el almacenamiento local del navegador.
- 🌙 **Modo Oscuro/Claro**: Interfaz adaptativa con un diseño minimalista y futurista.

## 🚀 Tecnologías Utilizadas

### Backend
- **Java 25** con **Spring Boot 4**.
- **Firebase Admin SDK**: Integración con Firestore para persistencia NoSQL.
- **Seguridad**: Verificación de tokens de Firebase para proteger los datos de usuario.

### Frontend
- **Vue 3 (Composition API)** + **TypeScript**.
- **Vite**: Para un desarrollo ultrarrápido.
- **Tailwind CSS**: Estilizado premium con Glassmorphism y animaciones.
- **Firebase SDK**: Gestión de autenticación en el cliente.

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/anime-tracker.git
cd anime-tracker
```

### 2. Configuración del Backend
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Genera una nueva **Cuenta de Servicio** (JSON) y renómbrala a `serviceAccountKey.json`.
3. Guarda este archivo en `backend/src/main/resources/`.
4. Ejecuta el servidor:
```bash
cd backend
./mvnw spring-boot:run
```

### 3. Configuración del Frontend
1. Registra una **Web App** en tu proyecto de Firebase.
2. Configura las credenciales en `frontend/src/firebase.ts`.
3. Instala dependencias y lanza el cliente:
```bash
cd frontend
npm install
npm run dev
```

## 🔒 Reglas de Seguridad (Firestore)
Para el modo producción, asegúrate de configurar las reglas en Firebase:
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    match /user_animes/{animeId} {
      allow read, write: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

---
Desarrollado con ❤️ por Bea.
