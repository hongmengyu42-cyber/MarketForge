package com.marketforge.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SendMessageRequest {
    @NotNull private Long conversationId;
    @NotBlank @Size(max = 5000) private String body;
}
