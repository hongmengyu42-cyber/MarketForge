package com.marketforge.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateJobRequest {

    @NotBlank(message = "Job title is required")
    @Size(min = 5, max = 150, message = "Title must be between 5 and 150 characters")
    private String title;

    @NotBlank(message = "Job description is required")
    @Size(min = 20, max = 10000, message = "Description must be between 20 and 10000 characters")
    private String description;

    private Long categoryId;

    private String budgetType = "FIXED_PRICE"; // FIXED_PRICE, HOURLY

    @NotNull(message = "Budget amount is required")
    @Min(value = 5, message = "Budget must be at least $5")
    private Double budgetAmount; // In dollars (e.g. 250.00)

    private Double budgetMax;

    private String experienceLevel = "INTERMEDIATE"; // ENTRY, INTERMEDIATE, EXPERT

    private String duration = "1 to 3 months";

    private List<String> skills;
}
