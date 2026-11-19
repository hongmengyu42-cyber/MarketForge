package com.marketforge.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateDisputeRequest {
    @NotNull private Long orderId;
    @NotBlank private String reason;
    @Size(max = 5000) private String description;
}
