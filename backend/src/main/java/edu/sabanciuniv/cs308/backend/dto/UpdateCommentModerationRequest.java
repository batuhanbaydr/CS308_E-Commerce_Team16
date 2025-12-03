package edu.sabanciuniv.cs308.backend.dto;

import lombok.Data;

@Data
public class UpdateCommentModerationRequest {
    private String moderationNote;
}