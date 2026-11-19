package com.marketforge.dto.response;

import com.marketforge.entity.JobPost;
import com.marketforge.entity.JobProposal;
import com.marketforge.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Data
@Builder
public class JobResponse {
    private Long id;
    private String title;
    private String slug;
    private String description;
    private String budgetType;
    private Double budgetAmount;
    private Double budgetMax;
    private String experienceLevel;
    private String duration;
    private String status;
    private List<String> skills;
    private Integer proposalsCount;
    private LocalDateTime deadlineAt;
    private LocalDateTime createdAt;

    private ClientInfo client;
    private CategoryInfo category;
    private JobProposalResponse myProposal;

    @Data
    @Builder
    public static class ClientInfo {
        private Long id;
        private String name;
        private String email;
        private String avatarUrl;
        private LocalDateTime memberSince;
    }

    @Data
    @Builder
    public static class CategoryInfo {
        private Long id;
        private String name;
        private String slug;
    }

    public static JobResponse from(JobPost j) {
        return from(j, null);
    }

    public static JobResponse from(JobPost j, JobProposal myProposal) {
        List<String> skillsList = new ArrayList<>();
        if (j.getSkills() != null && !j.getSkills().isBlank()) {
            skillsList = Arrays.stream(j.getSkills().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }

        JobResponseBuilder b = JobResponse.builder()
                .id(j.getId())
                .title(j.getTitle())
                .slug(j.getSlug())
                .description(j.getDescription())
                .budgetType(j.getBudgetType())
                .budgetAmount(j.getBudgetAmount() != null ? j.getBudgetAmount() / 100.0 : 0)
                .budgetMax(j.getBudgetMax() != null ? j.getBudgetMax() / 100.0 : null)
                .experienceLevel(j.getExperienceLevel())
                .duration(j.getDuration())
                .status(j.getStatus())
                .skills(skillsList)
                .proposalsCount(j.getProposalsCount() != null ? j.getProposalsCount() : 0)
                .deadlineAt(j.getDeadlineAt())
                .createdAt(j.getCreatedAt());

        if (j.getClient() != null) {
            User c = j.getClient();
            b.client(ClientInfo.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .email(c.getEmail())
                    .avatarUrl(c.getAvatarUrl())
                    .memberSince(c.getCreatedAt())
                    .build());
        }

        if (j.getCategory() != null) {
            b.category(CategoryInfo.builder()
                    .id(j.getCategory().getId())
                    .name(j.getCategory().getName())
                    .slug(j.getCategory().getSlug())
                    .build());
        }

        if (myProposal != null) {
            b.myProposal(JobProposalResponse.from(myProposal));
        }

        return b.build();
    }
}
