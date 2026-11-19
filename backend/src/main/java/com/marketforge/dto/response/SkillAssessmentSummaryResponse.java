package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SkillAssessmentSummaryResponse {
    private Long id;
    private String title;
    private String description;
    private String skillName;
    private Integer passingScore;
    private Integer timeLimitMinutes;
    private Integer questionsCount;
    private Boolean userPassed;
    private Integer userScore;
}
