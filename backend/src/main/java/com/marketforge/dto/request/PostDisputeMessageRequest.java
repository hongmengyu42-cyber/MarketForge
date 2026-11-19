package com.marketforge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PostDisputeMessageRequest {
    @NotBlank
    @Size(max = 5000)
    private String body;

    private String attachmentUrl;
    private String attachmentName;
}
