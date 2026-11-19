package com.marketforge.dto.response;

import com.marketforge.entity.PortfolioItem;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Data
@Builder
public class PortfolioItemResponse {
    private Long id;
    private Long userId;
    private String userDisplayName;
    private String title;
    private String description;
    private String projectUrl;
    private String thumbnailUrl;
    private List<String> imageUrls;
    private List<String> skills;
    private String completionDate;
    private LocalDateTime createdAt;

    public static PortfolioItemResponse from(PortfolioItem p) {
        List<String> images = new ArrayList<>();
        if (p.getImageUrls() != null && !p.getImageUrls().isBlank()) {
            images = Arrays.asList(p.getImageUrls().split(","));
        }

        List<String> skillList = new ArrayList<>();
        if (p.getSkillsUsed() != null && !p.getSkillsUsed().isBlank()) {
            skillList = Arrays.asList(p.getSkillsUsed().split(","));
        }

        String displayName = p.getUser() != null ? p.getUser().getName() : "";
        if (p.getUser() != null && p.getUser().getSellerProfile() != null && p.getUser().getSellerProfile().getDisplayName() != null) {
            displayName = p.getUser().getSellerProfile().getDisplayName();
        }

        return PortfolioItemResponse.builder()
                .id(p.getId())
                .userId(p.getUser() != null ? p.getUser().getId() : null)
                .userDisplayName(displayName)
                .title(p.getTitle())
                .description(p.getDescription())
                .projectUrl(p.getProjectUrl())
                .thumbnailUrl(p.getThumbnailUrl())
                .imageUrls(images)
                .skills(skillList)
                .completionDate(p.getCompletionDate())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
