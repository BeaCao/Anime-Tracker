package com.animetracker.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;

import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @Bean
    public Firestore firestore() {
        System.out.println("🚀 [CONFIG] Intentando inicializar Firebase...");
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream serviceAccount;
                
                // Intento 1: Cargar desde el classpath
                serviceAccount = getClass().getClassLoader().getResourceAsStream("serviceAccountKey.json");
                
                if (serviceAccount == null) {
                    // Intento 2: Cargar desde archivo directo
                    System.out.println("⚠️ No se encontró en el classpath, intentando carga directa...");
                    java.io.File file = new java.io.File("src/main/resources/serviceAccountKey.json");
                    if (file.exists()) {
                        serviceAccount = new java.io.FileInputStream(file);
                    }
                }

                if (serviceAccount != null) {
                    FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                    FirebaseApp.initializeApp(options);
                    System.out.println("🔥 [EXITO] Firebase ha sido inicializado correctamente.");
                } else {
                    System.err.println("❌ [ERROR CRÍTICO] No se encontró serviceAccountKey.json.");
                    return null;
                }
            }
            return FirestoreClient.getFirestore();
        } catch (IOException e) {
            System.err.println("❌ [ERROR] Fallo al inicializar Firebase: " + e.getMessage());
            return null;
        }
    }
}
