package com.marketforge.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
public class CreateListingRequest {
    @NotBlank(message = "Title is required")
    @Size(min = 10, max = 200)
    private String title;

    @NotBlank(message = "Description is required")
    @Size(min = 50)
    private String description;

    @NotNull @DecimalMin("5.0")
    private Double priceAmount;

    @NotNull @Min(1) @Max(90)
    private Integer deliveryDays;

    @NotNull
    private Long categoryId;

    private Integer revisionsIncluded;
    private List<Long> skillIds;
}
