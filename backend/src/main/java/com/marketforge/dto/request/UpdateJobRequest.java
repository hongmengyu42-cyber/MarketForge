package com.marketforge.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class UpdateJobRequest {
    private String title;
    private String description;
    private Long categoryId;
    private String budgetType;
    private Double budgetAmount;
    private Double budgetMax;
    private String experienceLevel;
    private String duration;
    private String status;
    private List<String> skills;
}
