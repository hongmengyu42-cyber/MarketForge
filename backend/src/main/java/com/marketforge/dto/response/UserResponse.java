package com.marketforge.dto.response;

import com.marketforge.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {

    private Long id;
    private String name;
    private String email;
    private String phone;
    private String avatarUrl;
    private String authProvider;
    private Boolean isAdmin;
    private Integer riskScore;
    private Boolean isFlaggedForReview;
    private LocalDateTime emailVerifiedAt;
    private LocalDateTime createdAt;
    private SellerProfileSummary sellerProfile;
    private Boolean isSeller;

    @Data
    @Builder
    public static class SellerProfileSummary {
        private Long id;
        private String displayName;
        private String bio;
        private String avatarUrl;
        private String onboardingStatus;
        private Double averageRating;
        private Integer reviewCount;
        private Integer completedOrdersCount;
        private Integer hourlyRate;
    }

    public static UserResponse from(User user) {
        String effectiveAvatarUrl = user.getAvatarUrl();
        if (effectiveAvatarUrl == null && user.getSellerProfile() != null) {
            effectiveAvatarUrl = user.getSellerProfile().getAvatarUrl();
        }

        UserResponse.UserResponseBuilder builder = UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(effectiveAvatarUrl)
                .authProvider(user.getAuthProvider() != null ? user.getAuthProvider() : "LOCAL")
                .isAdmin(user.getIsAdmin())
                .riskScore(user.getRiskScore())
                .isFlaggedForReview(user.getIsFlaggedForReview())
                .emailVerifiedAt(user.getEmailVerifiedAt())
                .createdAt(user.getCreatedAt())
                .isSeller(user.isSeller());

        if (user.getSellerProfile() != null) {
            var sp = user.getSellerProfile();
            builder.sellerProfile(SellerProfileSummary.builder()
                    .id(sp.getId())
                    .displayName(sp.getDisplayName())
                    .bio(sp.getBio())
                    .avatarUrl(sp.getAvatarUrl())
                    .onboardingStatus(sp.getOnboardingStatus())
                    .averageRating(sp.getAverageRating())
                    .reviewCount(sp.getReviewCount())
                    .completedOrdersCount(sp.getCompletedOrdersCount())
                    .hourlyRate(sp.getHourlyRate() != null ? sp.getHourlyRate() / 100 : null)
                    .build());
        }

        return builder.build();
    }
}
