package com.animetracker.backend.controller;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.animetracker.backend.dto.UserAnimeRequest;
import com.animetracker.backend.model.UserAnime;
import com.animetracker.backend.service.FirestoreService;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

@RestController
@RequestMapping("/api/user-anime")
@CrossOrigin(origins = "*")
public class AnimeController {

    private final FirestoreService firestoreService;

    public AnimeController(FirestoreService firestoreService) {
        this.firestoreService = firestoreService;
    }

    private String verifyAndGetUid(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        try {
            String idToken = authHeader.substring(7);
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            return decodedToken.getUid();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }

    // GET /api/user-anime — all or filtered
    @GetMapping
    public List<UserAnime> getAll(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String watchStatus,
            @RequestParam(required = false) Integer minScore,
            @RequestParam(required = false) String genre) throws Exception {

        String uid = verifyAndGetUid(authHeader);
        boolean hasFilter = watchStatus != null || minScore != null || genre != null;
        if (hasFilter) {
            return firestoreService.findFiltered(uid, watchStatus, minScore, genre);
        }
        return firestoreService.getAllAnimes(uid);
    }

    // GET /api/user-anime/{id}
    @GetMapping("/{id}")
    public UserAnime getById(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String id) throws Exception {
        String uid = verifyAndGetUid(authHeader);
        return firestoreService.getAllAnimes(uid).stream()
                .filter(a -> a.getMalId().toString().equals(id))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    // POST /api/user-anime — add to list
    @PostMapping
    public ResponseEntity<UserAnime> save(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UserAnimeRequest req) throws Exception {
        String uid = verifyAndGetUid(authHeader);
        UserAnime entity = new UserAnime();

        entity.setUserId(uid); // Asociamos al usuario verificado
        entity.setMalId(req.getMalId());
        entity.setTitle(req.getTitle());
        entity.setTitleEnglish(req.getTitleEnglish());
        entity.setImageUrl(req.getImageUrl());
        entity.setGenres(req.getGenres());
        entity.setEpisodes(req.getEpisodes());
        entity.setUserScore(req.getUserScore());
        entity.setWatchStatus(req.getWatchStatus());
        entity.setNotes(req.getNotes());
        entity.setAiringStatus(req.getAiringStatus());
        entity.setBroadcastInfo(req.getBroadcastInfo());
        entity.setScore(req.getScore());
        entity.setRank(req.getRank());
        entity.setEpisodesWatched(req.getEpisodesWatched());

        UserAnime saved = firestoreService.saveAnime(entity);
        return ResponseEntity.ok(saved);
    }

    // DELETE /api/user-anime/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Integer id) throws Exception {
        String uid = verifyAndGetUid(authHeader);
        firestoreService.deleteAnime(uid, id);
        return ResponseEntity.noContent().build();
    }

    // Check if a mal_id is already in the list
    @GetMapping("/exists/{malId}")
    public ResponseEntity<Boolean> exists(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Integer malId) throws Exception {
        String uid = verifyAndGetUid(authHeader);
        return ResponseEntity.ok(firestoreService.existsByMalId(uid, malId));
    }

    // GET /api/user-anime/export/csv — export full list as CSV
    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(@RequestHeader("Authorization") String authHeader) throws Exception {
        String uid = verifyAndGetUid(authHeader);
        List<UserAnime> list = firestoreService.getAllAnimes(uid);

        StringBuilder sb = new StringBuilder();
        sb.append("Título,Título Inglés,Géneros,Episodios,Eps Vistos,Mi Puntuación,Estado,Puntuación Jikan,Rank,Estado Emisión,Notas\n");

        for (UserAnime a : list) {
            sb.append(escapeCsv(a.getTitle())).append(",")
                    .append(escapeCsv(a.getTitleEnglish())).append(",")
                    .append(escapeCsv(a.getGenres())).append(",")
                    .append(nvl(a.getEpisodes())).append(",")
                    .append(nvl(a.getEpisodesWatched())).append(",")
                    .append(nvl(a.getUserScore())).append(",")
                    .append(escapeCsv(a.getWatchStatus())).append(",")
                    .append(nvl(a.getScore())).append(",")
                    .append(nvl(a.getRank())).append(",")
                    .append(escapeCsv(a.getAiringStatus())).append(",")
                    .append(escapeCsv(a.getNotes())).append("\n");
        }

        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        // Add UTF-8 BOM so Excel opens it correctly
        byte[] bom = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] result = new byte[bom.length + bytes.length];
        System.arraycopy(bom, 0, result, 0, bom.length);
        System.arraycopy(bytes, 0, result, bom.length, bytes.length);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mi-lista-anime.csv\"");

        return ResponseEntity.ok().headers(headers).body(result);
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String nvl(Object value) {
        return value == null ? "" : value.toString();
    }
}
