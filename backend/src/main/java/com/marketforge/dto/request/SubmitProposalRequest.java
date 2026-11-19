package com.marketforge.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class SubmitProposalRequest {

    @NotNull(message = "Bid amount is required")
    @Min(value = 5, message = "Bid must be at least $5")
    private Double bidAmount; // in dollars

    @NotNull(message = "Estimated turnaround days is required")
    @Min(value = 1, message = "Estimated turnaround must be at least 1 day")
    private Integer deliveryDays;

    @NotBlank(message = "Cover letter is required")
    @Size(min = 20, max = 5000, message = "Cover letter must be between 20 and 5000 characters")
    private String coverLetter;

    private List<String> attachments;
}
