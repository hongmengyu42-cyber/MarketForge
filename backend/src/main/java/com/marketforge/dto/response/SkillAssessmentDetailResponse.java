package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SkillAssessmentDetailResponse {
    private Long id;
    private String title;
    private String description;
    private String skillName;
    private Integer passingScore;
    private Integer timeLimitMinutes;
    private List<QuestionDto> questions;

    @Data
    @Builder
    public static class QuestionDto {
        private Integer id;
        private String question;
        private List<String> options;
    }
}
