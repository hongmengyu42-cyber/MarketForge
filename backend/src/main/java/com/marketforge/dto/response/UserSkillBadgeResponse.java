package com.marketforge.dto.response;

import com.marketforge.entity.UserSkillBadge;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserSkillBadgeResponse {
    private Long id;
    private Long assessmentId;
    private String assessmentTitle;
    private String skillName;
    private Integer score;
    private Boolean passed;
    private String badgeLevel; // e.g., "Top 10% Expert", "Verified Pro"
    private LocalDateTime earnedAt;

    public static UserSkillBadgeResponse from(UserSkillBadge b) {
        String level = "Verified Pro";
        if (b.getScore() != null && b.getScore() >= 90) {
            level = "Top 5% Expert";
        } else if (b.getScore() != null && b.getScore() >= 80) {
            level = "Top 10% Advanced";
        }

        String title = b.getAssessment() != null ? b.getAssessment().getTitle() : "Skill";
        String sName = (b.getAssessment() != null && b.getAssessment().getSkill() != null)
                ? b.getAssessment().getSkill().getName() : title;

        return UserSkillBadgeResponse.builder()
                .id(b.getId())
                .assessmentId(b.getAssessment() != null ? b.getAssessment().getId() : null)
                .assessmentTitle(title)
                .skillName(sName)
                .score(b.getScore())
                .passed(b.getPassed())
                .badgeLevel(level)
                .earnedAt(b.getEarnedAt())
                .build();
    }
}
