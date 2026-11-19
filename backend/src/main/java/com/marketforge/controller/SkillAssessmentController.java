package com.marketforge.controller;

import com.marketforge.dto.request.SubmitAssessmentRequest;
import com.marketforge.dto.response.*;
import com.marketforge.entity.User;
import com.marketforge.service.SkillAssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
public class SkillAssessmentController {

    private final SkillAssessmentService assessmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SkillAssessmentSummaryResponse>>> getAllAssessments(
            @AuthenticationPrincipal User user) {
        List<SkillAssessmentSummaryResponse> list = assessmentService.getAllAssessments(user);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SkillAssessmentDetailResponse>> getAssessmentDetail(
            @PathVariable Long id) {
        SkillAssessmentDetailResponse detail = assessmentService.getAssessmentForTest(id);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<AssessmentResultResponse>> submitAssessment(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody SubmitAssessmentRequest request) {
        AssessmentResultResponse result = assessmentService.submitAssessment(user, id, request);
        return ResponseEntity.ok(ApiResponse.success(result.getFeedbackMessage(), result));
    }

    @GetMapping("/badges/me")
    public ResponseEntity<ApiResponse<List<UserSkillBadgeResponse>>> getMyBadges(
            @AuthenticationPrincipal User user) {
        List<UserSkillBadgeResponse> badges = assessmentService.getUserBadges(user.getId());
        return ResponseEntity.ok(ApiResponse.success(badges));
    }

    @GetMapping("/badges/user/{userId}")
    public ResponseEntity<ApiResponse<List<UserSkillBadgeResponse>>> getUserBadges(
            @PathVariable Long userId) {
        List<UserSkillBadgeResponse> badges = assessmentService.getUserBadges(userId);
        return ResponseEntity.ok(ApiResponse.success(badges));
    }
}
