package com.marketforge.dto.response;

import com.marketforge.entity.Listing;
import com.marketforge.entity.ListingImage;
import com.marketforge.entity.Skill;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
public class ListingResponse {
    private Long id;
    private String title;
    private String slug;
    private String description;
    private Double priceAmount;
    private String currency;
    private Integer deliveryDays;
    private Integer revisionsIncluded;
    private String status;
    private Double averageRating;
    private Integer reviewCount;
    private Integer completedOrdersCount;
    private Integer viewCount;
    private CategoryInfo category;
    private SellerInfo seller;
    private List<String> imageUrls;
    private List<String> skills;
    private LocalDateTime createdAt;

    @Data @Builder
    public static class CategoryInfo {
        private Long id;
        private String name;
        private String slug;
    }

    @Data @Builder
    public static class SellerInfo {
        private Long id;
        private String name;
        private String displayName;
        private String avatarUrl;
        private Double averageRating;
        private Integer reviewCount;
        private Integer completedOrdersCount;
    }

    public static ListingResponse fromPublic(Listing l) {
        return build(l, false);
    }

    public static ListingResponse fromDetail(Listing l) {
        return build(l, true);
    }

    private static ListingResponse build(Listing l, boolean includeDescription) {
        ListingResponseBuilder b = ListingResponse.builder()
                .id(l.getId())
                .title(l.getTitle())
                .slug(l.getSlug())
                .priceAmount(l.getPriceAmount() != null ? l.getPriceAmount() / 100.0 : 0)
                .currency(l.getCurrency())
                .deliveryDays(l.getDeliveryDays())
                .revisionsIncluded(l.getRevisionsIncluded())
                .status(l.getStatus() != null ? l.getStatus().name().toLowerCase() : null)
                .averageRating(l.getAverageRating())
                .reviewCount(l.getReviewCount())
                .completedOrdersCount(l.getCompletedOrdersCount())
                .viewCount(l.getViewCount())
                .createdAt(l.getCreatedAt())
                .imageUrls(l.getImages() != null
                        ? l.getImages().stream().map(ListingImage::getImageUrl).collect(Collectors.toList())
                        : List.of())
                .skills(l.getSkills() != null
                        ? l.getSkills().stream().map(Skill::getName).collect(Collectors.toList())
                        : List.of());

        if (includeDescription) b.description(l.getDescription());

        if (l.getCategory() != null) {
            b.category(CategoryInfo.builder()
                    .id(l.getCategory().getId()).name(l.getCategory().getName()).slug(l.getCategory().getSlug()).build());
        }
        if (l.getSellerProfile() != null) {
            var sp = l.getSellerProfile();
            SellerInfo.SellerInfoBuilder sb = SellerInfo.builder()
                    .id(sp.getId()).displayName(sp.getDisplayName()).avatarUrl(sp.getAvatarUrl())
                    .averageRating(sp.getAverageRating()).reviewCount(sp.getReviewCount())
                    .completedOrdersCount(sp.getCompletedOrdersCount());
            if (sp.getUser() != null) sb.name(sp.getUser().getName());
            b.seller(sb.build());
        }
        return b.build();
    }
}
