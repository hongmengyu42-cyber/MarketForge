package com.marketforge.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCustomOfferRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Price is required")
    @Min(value = 5, message = "Minimum price is $5")
    private Long priceAmount; // In dollars from client, converted to cents in backend

    @NotNull(message = "Delivery days is required")
    @Min(value = 1, message = "Minimum delivery is 1 day")
    private Integer deliveryDays;
}
