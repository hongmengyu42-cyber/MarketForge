package com.marketforge.dto.response;

import com.marketforge.entity.JobProposal;
import com.marketforge.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class JobProposalResponse {
    private Long id;
    private Long jobId;
    private String jobTitle;
    private String jobSlug;
    private Double bidAmount;
    private Integer deliveryDays;
    private String coverLetter;
    private String attachments;
    private String status;
    private LocalDateTime createdAt;

    private FreelancerInfo freelancer;

    @Data
    @Builder
    public static class FreelancerInfo {
        private Long id;
        private String name;
        private String displayName;
        private String avatarUrl;
        private Double rating;
        private Integer reviewCount;
        private String bio;
    }

    public static JobProposalResponse from(JobProposal p) {
        JobProposalResponseBuilder b = JobProposalResponse.builder()
                .id(p.getId())
                .jobId(p.getJob().getId())
                .jobTitle(p.getJob().getTitle())
                .jobSlug(p.getJob().getSlug())
                .bidAmount(p.getBidAmount() != null ? p.getBidAmount() / 100.0 : 0)
                .deliveryDays(p.getDeliveryDays())
                .coverLetter(p.getCoverLetter())
                .attachments(p.getAttachments())
                .status(p.getStatus() != null ? p.getStatus().toUpperCase() : "SUBMITTED")
                .createdAt(p.getCreatedAt());

        if (p.getFreelancer() != null) {
            User f = p.getFreelancer();
            String avatar = f.getAvatarUrl();
            String displayName = f.getName();
            Double rating = 5.0;
            Integer reviewCount = 0;
            String bio = null;

            if (f.getSellerProfile() != null) {
                if (avatar == null) avatar = f.getSellerProfile().getAvatarUrl();
                if (f.getSellerProfile().getDisplayName() != null) displayName = f.getSellerProfile().getDisplayName();
                if (f.getSellerProfile().getAverageRating() != null) rating = f.getSellerProfile().getAverageRating();
                if (f.getSellerProfile().getReviewCount() != null) reviewCount = f.getSellerProfile().getReviewCount();
                bio = f.getSellerProfile().getBio();
            }

            b.freelancer(FreelancerInfo.builder()
                    .id(f.getId())
                    .name(f.getName())
                    .displayName(displayName)
                    .avatarUrl(avatar)
                    .rating(rating)
                    .reviewCount(reviewCount)
                    .bio(bio)
                    .build());
        }

        return b.build();
    }
}
