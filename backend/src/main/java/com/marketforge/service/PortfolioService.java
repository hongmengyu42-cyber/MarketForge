package com.marketforge.service;

import com.marketforge.dto.request.PortfolioItemRequest;
import com.marketforge.dto.response.PortfolioItemResponse;
import com.marketforge.entity.PortfolioItem;
import com.marketforge.entity.User;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.PortfolioItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PortfolioService {

    private final PortfolioItemRepository portfolioRepo;

    @Transactional(readOnly = true)
    public List<PortfolioItemResponse> getPortfolioForUser(Long userId) {
        return portfolioRepo.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(PortfolioItemResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public PortfolioItemResponse createPortfolioItem(User user, PortfolioItemRequest req) {
        String imagesJoined = (req.getImageUrls() != null && !req.getImageUrls().isEmpty())
                ? String.join(",", req.getImageUrls()) : null;

        String skillsJoined = (req.getSkills() != null && !req.getSkills().isEmpty())
                ? String.join(",", req.getSkills()) : null;

        String thumbnail = req.getThumbnailUrl();
        if ((thumbnail == null || thumbnail.isBlank()) && req.getImageUrls() != null && !req.getImageUrls().isEmpty()) {
            thumbnail = req.getImageUrls().get(0);
        }

        PortfolioItem item = PortfolioItem.builder()
                .user(user)
                .title(req.getTitle())
                .description(req.getDescription())
                .projectUrl(req.getProjectUrl())
                .thumbnailUrl(thumbnail)
                .imageUrls(imagesJoined)
                .skillsUsed(skillsJoined)
                .completionDate(req.getCompletionDate())
                .build();

        PortfolioItem saved = portfolioRepo.save(item);
        log.info("Created portfolio item #{} for user #{}", saved.getId(), user.getId());
        return PortfolioItemResponse.from(saved);
    }

    @Transactional
    public PortfolioItemResponse updatePortfolioItem(User user, Long id, PortfolioItemRequest req) {
        PortfolioItem item = portfolioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Portfolio item not found: " + id));

        if (!item.getUser().getId().equals(user.getId()) && !Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new IllegalArgumentException("You are not authorized to update this portfolio item");
        }

        String imagesJoined = (req.getImageUrls() != null && !req.getImageUrls().isEmpty())
                ? String.join(",", req.getImageUrls()) : item.getImageUrls();

        String skillsJoined = (req.getSkills() != null && !req.getSkills().isEmpty())
                ? String.join(",", req.getSkills()) : item.getSkillsUsed();

        String thumbnail = req.getThumbnailUrl();
        if ((thumbnail == null || thumbnail.isBlank()) && req.getImageUrls() != null && !req.getImageUrls().isEmpty()) {
            thumbnail = req.getImageUrls().get(0);
        } else if (thumbnail == null) {
            thumbnail = item.getThumbnailUrl();
        }

        item.setTitle(req.getTitle());
        item.setDescription(req.getDescription());
        item.setProjectUrl(req.getProjectUrl());
        item.setThumbnailUrl(thumbnail);
        item.setImageUrls(imagesJoined);
        item.setSkillsUsed(skillsJoined);
        item.setCompletionDate(req.getCompletionDate());

        PortfolioItem updated = portfolioRepo.save(item);
        return PortfolioItemResponse.from(updated);
    }

    @Transactional
    public void deletePortfolioItem(User user, Long id) {
        PortfolioItem item = portfolioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Portfolio item not found: " + id));

        if (!item.getUser().getId().equals(user.getId()) && !Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new IllegalArgumentException("You are not authorized to delete this portfolio item");
        }

        portfolioRepo.delete(item);
        log.info("Deleted portfolio item #{} by user #{}", id, user.getId());
    }
}
