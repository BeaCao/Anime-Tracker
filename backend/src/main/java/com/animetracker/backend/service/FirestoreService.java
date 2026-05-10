package com.animetracker.backend.service;

import com.animetracker.backend.model.UserAnime;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class FirestoreService {

    private final Firestore db;

    public FirestoreService(Firestore db) {
        this.db = db;
    }

    private static final String COLLECTION_NAME = "user_animes";

    public List<UserAnime> getAllAnimes(String userId) throws ExecutionException, InterruptedException {
        System.out.println("🔍 Firestore: Recuperando animes del usuario: " + userId);
        try {
            CollectionReference collection = db.collection(COLLECTION_NAME);
            Query query = collection.whereEqualTo("userId", userId);
            ApiFuture<QuerySnapshot> querySnapshotFuture = query.get();
            QuerySnapshot querySnapshot = querySnapshotFuture.get();
            
            List<UserAnime> list = new ArrayList<>();
            for (QueryDocumentSnapshot document : querySnapshot) {
                list.add(document.toObject(UserAnime.class));
            }
            System.out.println("✅ Firestore: Recuperados " + list.size() + " animes para el usuario.");
            return list;
        } catch (Exception e) {
            System.err.println("❌ Error en getAllAnimes: " + e.getMessage());
            throw e;
        }
    }

    public UserAnime saveAnime(UserAnime anime) throws ExecutionException, InterruptedException {
        System.out.println("💾 Firestore: Guardando anime para usuario " + anime.getUserId() + ": " + anime.getTitle());
        try {
            // Document ID = userId + malId
            String docId = anime.getUserId() + "_" + anime.getMalId();
            DocumentReference docRef = db.collection(COLLECTION_NAME).document(docId);
            
            if (anime.getId() == null) {
                anime.setId(System.currentTimeMillis()); 
            }

            ApiFuture<WriteResult> result = docRef.set(anime);
            result.get();
            System.out.println("✅ Firestore: Guardado con éxito.");
            return anime;
        } catch (Exception e) {
            System.err.println("❌ Error en saveAnime: " + e.getMessage());
            throw e;
        }
    }

    public void deleteAnime(String userId, Integer malId) throws ExecutionException, InterruptedException {
        String docId = userId + "_" + malId;
        db.collection(COLLECTION_NAME).document(docId).delete().get();
    }

    public boolean existsByMalId(String userId, Integer malId) throws ExecutionException, InterruptedException {
        try {
            String docId = userId + "_" + malId;
            DocumentReference docRef = db.collection(COLLECTION_NAME).document(docId);
            DocumentSnapshot document = docRef.get().get();
            return document.exists();
        } catch (Exception e) {
            return false;
        }
    }

    public List<UserAnime> findFiltered(String userId, String watchStatus, Integer minScore, String genre) throws ExecutionException, InterruptedException {
        Query query = db.collection(COLLECTION_NAME).whereEqualTo("userId", userId);

        if (watchStatus != null) {
            query = query.whereEqualTo("watchStatus", watchStatus);
        }
        if (minScore != null) {
            query = query.whereGreaterThanOrEqualTo("userScore", minScore);
        }
        // Nota: Filtrar por género en una cadena de texto separada por comas es difícil en Firestore.
        // Lo ideal sería que 'genres' fuera una lista en Firestore.
        // Por ahora, traemos todo y filtramos en memoria para no romper la compatibilidad.
        
        List<UserAnime> all = new ArrayList<>();
        for (QueryDocumentSnapshot doc : query.get().get()) {
            all.add(doc.toObject(UserAnime.class));
        }

        if (genre != null) {
            return all.stream()
                .filter(a -> a.getGenres() != null && a.getGenres().contains(genre))
                .toList();
        }

        return all;
    }
}
