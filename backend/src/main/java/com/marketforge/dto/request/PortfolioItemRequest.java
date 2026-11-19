package com.marketforge.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class PortfolioItemRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String description;
    private String projectUrl;
    private String thumbnailUrl;
    private List<String> imageUrls;
    private List<String> skills;
    private String completionDate;
}
