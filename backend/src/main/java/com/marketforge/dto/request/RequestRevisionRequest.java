package com.marketforge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RequestRevisionRequest {
    private String reason;

    @NotBlank(message = "Revision feedback notes cannot be empty")
    @Size(max = 5000, message = "Revision notes must be under 5000 characters")
    private String notes;
}
