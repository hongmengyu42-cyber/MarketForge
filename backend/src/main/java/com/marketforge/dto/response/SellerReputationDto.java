package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class SellerReputationDto {
    private Long sellerId;
    private String sellerName;
    private Double averageRating;
    private Integer reviewCount;
    private Double avgQualityRating;
    private Double avgCommunicationRating;
    private Double avgDeadlineRating;
    private Double recommendationRate;
    private Boolean isTopRated;
    private Integer completedOrdersCount;
    private Map<Integer, Long> ratingDistribution;
}
