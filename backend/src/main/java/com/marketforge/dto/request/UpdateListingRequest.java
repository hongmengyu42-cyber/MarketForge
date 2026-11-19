package com.marketforge.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
public class UpdateListingRequest {
    @Size(min = 10, max = 200) private String title;
    @Size(min = 50) private String description;
    @DecimalMin("5.0") private Double priceAmount;
    @Min(1) @Max(90) private Integer deliveryDays;
    private Long categoryId;
    private Integer revisionsIncluded;
    private List<Long> skillIds;
}
