package com.animetracker.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAnime {

    private Long id;

    private String userId;

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
