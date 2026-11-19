package com.marketforge.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class StartConversationRequest {
    private Long listingId;
    private Long sellerId;
    @NotBlank @Size(max = 5000) private String body;
}
