package com.marketforge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SubmitRequirementsRequest {
    @NotBlank(message = "Requirements cannot be empty")
    @Size(max = 10000, message = "Requirements must be under 10000 characters")
    private String requirements;
}
