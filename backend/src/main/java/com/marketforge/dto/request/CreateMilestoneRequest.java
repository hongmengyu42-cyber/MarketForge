package com.marketforge.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateMilestoneRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Amount is required")
    @Min(value = 1, message = "Amount must be at least $1")
    private Double amount; // In dollars (e.g. 50.0)

    private Integer milestoneIndex;
}
