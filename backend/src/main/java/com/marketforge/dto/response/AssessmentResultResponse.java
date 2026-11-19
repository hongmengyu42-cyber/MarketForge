package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AssessmentResultResponse {
    private Long assessmentId;
    private String assessmentTitle;
    private Integer score;
    private Boolean passed;
    private Integer passingScore;
    private Integer totalQuestions;
    private Integer correctAnswers;
    private String feedbackMessage;
    private UserSkillBadgeResponse badge;
}
