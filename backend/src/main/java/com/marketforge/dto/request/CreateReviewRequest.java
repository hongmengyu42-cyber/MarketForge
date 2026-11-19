package com.marketforge.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateReviewRequest {
    @NotNull
    private Long orderId;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    // Sub-ratings for Buyer reviewing Seller
    @Min(1)
    @Max(5)
    private Integer qualityRating;

    @Min(1)
    @Max(5)
    private Integer communicationRating;

    @Min(1)
    @Max(5)
    private Integer deadlineRating;

    // Sub-ratings for Seller reviewing Buyer
    @Min(1)
    @Max(5)
    private Integer clarityRating;

    @Min(1)
    @Max(5)
    private Integer cooperationRating;

    private Boolean wouldRecommend;

    @Size(max = 3000)
    private String comment;
}
