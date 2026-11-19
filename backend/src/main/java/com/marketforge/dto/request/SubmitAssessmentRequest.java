package com.marketforge.dto.request;

import lombok.Data;

import java.util.Map;

@Data
public class SubmitAssessmentRequest {
    // Map questionId -> selectedOptionIndex (0-based)
    private Map<Integer, Integer> answers;
}
