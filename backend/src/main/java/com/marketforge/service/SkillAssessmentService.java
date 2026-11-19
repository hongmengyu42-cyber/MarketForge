package com.marketforge.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketforge.dto.request.SubmitAssessmentRequest;
import com.marketforge.dto.response.*;
import com.marketforge.entity.SkillAssessment;
import com.marketforge.entity.User;
import com.marketforge.entity.UserSkillBadge;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.SkillAssessmentRepository;
import com.marketforge.repository.UserSkillBadgeRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SkillAssessmentService {

    private final SkillAssessmentRepository assessmentRepo;
    private final UserSkillBadgeRepository badgeRepo;
    private final ObjectMapper objectMapper;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RawQuestion {
        private Integer id;
        private String question;
        private List<String> options;
        private Integer correctIndex;
    }

    @Transactional(readOnly = true)
    public List<SkillAssessmentSummaryResponse> getAllAssessments(User currentUser) {
        List<SkillAssessment> all = assessmentRepo.findAll();
        Map<Long, UserSkillBadge> userBadgesMap = new HashMap<>();

        if (currentUser != null) {
            List<UserSkillBadge> userBadges = badgeRepo.findByUserId(currentUser.getId());
            for (UserSkillBadge b : userBadges) {
                userBadgesMap.put(b.getAssessment().getId(), b);
            }
        }

        return all.stream().map(a -> {
            UserSkillBadge badge = userBadgesMap.get(a.getId());
            int count = parseQuestions(a.getQuestions()).size();
            String sName = a.getSkill() != null ? a.getSkill().getName() : a.getTitle();

            return SkillAssessmentSummaryResponse.builder()
                    .id(a.getId())
                    .title(a.getTitle())
                    .description(a.getDescription())
                    .skillName(sName)
                    .passingScore(a.getPassingScore())
                    .timeLimitMinutes(a.getTimeLimitMinutes())
                    .questionsCount(count)
                    .userPassed(badge != null && Boolean.TRUE.equals(badge.getPassed()))
                    .userScore(badge != null ? badge.getScore() : null)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SkillAssessmentDetailResponse getAssessmentForTest(Long id) {
        SkillAssessment a = assessmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill assessment not found: " + id));

        List<RawQuestion> raw = parseQuestions(a.getQuestions());
        List<SkillAssessmentDetailResponse.QuestionDto> sanitizedQuestions = raw.stream()
                .map(q -> SkillAssessmentDetailResponse.QuestionDto.builder()
                        .id(q.getId())
                        .question(q.getQuestion())
                        .options(q.getOptions())
                        .build())
                .collect(Collectors.toList());

        String sName = a.getSkill() != null ? a.getSkill().getName() : a.getTitle();

        return SkillAssessmentDetailResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .description(a.getDescription())
                .skillName(sName)
                .passingScore(a.getPassingScore())
                .timeLimitMinutes(a.getTimeLimitMinutes())
                .questions(sanitizedQuestions)
                .build();
    }

    @Transactional
    public AssessmentResultResponse submitAssessment(User user, Long id, SubmitAssessmentRequest req) {
        SkillAssessment a = assessmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill assessment not found: " + id));

        List<RawQuestion> rawQuestions = parseQuestions(a.getQuestions());
        int totalQuestions = rawQuestions.size();
        if (totalQuestions == 0) {
            throw new IllegalStateException("Assessment has no questions configured");
        }

        Map<Integer, Integer> submittedAnswers = req.getAnswers() != null ? req.getAnswers() : Collections.emptyMap();
        int correctCount = 0;

        for (RawQuestion q : rawQuestions) {
            Integer submitted = submittedAnswers.get(q.getId());
            if (submitted != null && submitted.equals(q.getCorrectIndex())) {
                correctCount++;
            }
        }

        int score = (int) Math.round(((double) correctCount / totalQuestions) * 100.0);
        boolean passed = score >= (a.getPassingScore() != null ? a.getPassingScore() : 70);

        UserSkillBadge badge = badgeRepo.findByUserIdAndAssessmentId(user.getId(), a.getId())
                .orElse(null);

        if (badge == null) {
            badge = UserSkillBadge.builder()
                    .user(user)
                    .assessment(a)
                    .score(score)
                    .passed(passed)
                    .earnedAt(passed ? LocalDateTime.now() : null)
                    .build();
        } else {
            // Keep highest score or update if passed
            if (score > (badge.getScore() != null ? badge.getScore() : 0)) {
                badge.setScore(score);
            }
            if (passed) {
                badge.setPassed(true);
                if (badge.getEarnedAt() == null) {
                    badge.setEarnedAt(LocalDateTime.now());
                }
            }
        }

        badge = badgeRepo.save(badge);
        log.info("User #{} submitted assessment #{}: score={}, passed={}", user.getId(), a.getId(), score, passed);

        String message;
        if (passed) {
            message = "Congratulations! You passed with " + score + "% and earned the " + a.getTitle() + " Verified Badge!";
        } else {
            message = "You scored " + score + "%. The passing threshold is " + a.getPassingScore() + "%. You can review the material and try again anytime.";
        }

        return AssessmentResultResponse.builder()
                .assessmentId(a.getId())
                .assessmentTitle(a.getTitle())
                .score(score)
                .passed(passed)
                .passingScore(a.getPassingScore())
                .totalQuestions(totalQuestions)
                .correctAnswers(correctCount)
                .feedbackMessage(message)
                .badge(passed ? UserSkillBadgeResponse.from(badge) : null)
                .build();
    }

    @Transactional(readOnly = true)
    public List<UserSkillBadgeResponse> getUserBadges(Long userId) {
        return badgeRepo.findByUserIdAndPassedTrueOrderByEarnedAtDesc(userId)
                .stream()
                .map(UserSkillBadgeResponse::from)
                .collect(Collectors.toList());
    }

    private List<RawQuestion> parseQuestions(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<RawQuestion>>() {});
        } catch (Exception e) {
            log.error("Failed to parse assessment questions JSON", e);
            return Collections.emptyList();
        }
    }
}
