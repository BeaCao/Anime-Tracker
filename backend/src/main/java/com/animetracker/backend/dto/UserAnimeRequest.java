package com.animetracker.backend.dto;

import lombok.Data;

@Data
public class UserAnimeRequest {
    private Integer malId;
    private String title;
    private String titleEnglish;
    private String imageUrl;
    private String genres;
    private Integer episodes;
    private Integer userScore;
    private String watchStatus;
    private String notes;
    private String airingStatus;
    private String broadcastInfo;
    private Double score;
    private Integer rank;
    private Integer episodesWatched;
}
