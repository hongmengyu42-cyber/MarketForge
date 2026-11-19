package com.marketforge.service;

import com.marketforge.dto.request.CreateListingRequest;
import com.marketforge.dto.request.UpdateListingRequest;
import com.marketforge.dto.response.ListingResponse;
import com.marketforge.entity.*;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ListingService {

    private final ListingRepository listingRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final CategoryRepository categoryRepository;
    private final SkillRepository skillRepository;

    @Transactional(readOnly = true)
    public Page<ListingResponse> getPublicListings(String categorySlug, Long minPrice, Long maxPrice,
                                                    Integer maxDeliveryDays, Double minRating,
                                                    String search, String sort, int page, int size) {
        Sort sortObj = switch (sort != null ? sort : "created_at") {
            case "price_asc" -> Sort.by("priceAmount").ascending();
            case "price_desc" -> Sort.by("priceAmount").descending();
            case "rating" -> Sort.by("averageRating").descending();
            case "popular" -> Sort.by("completedOrdersCount").descending();
            default -> Sort.by("createdAt").descending();
        };
        Pageable pageable = PageRequest.of(page, size, sortObj);
        Long minCents = minPrice != null ? minPrice * 100 : null;
        Long maxCents = maxPrice != null ? maxPrice * 100 : null;
        return listingRepository.findPublicWithFilters(categorySlug, minCents, maxCents, maxDeliveryDays, minRating, search, pageable)
                .map(ListingResponse::fromPublic);
    }

    @Transactional(readOnly = true)
    public ListingResponse getListingBySlug(String slug) {
        Listing listing = listingRepository.findPublicBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + slug));
        return ListingResponse.fromDetail(listing);
    }

    @Transactional(readOnly = true)
    public Page<ListingResponse> getSellerListings(User currentUser, int page, int size) {
        SellerProfile sp = sellerProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new BusinessException("You do not have a seller profile"));
        return listingRepository.findBySellerProfileId(sp.getId(), PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(ListingResponse::fromDetail);
    }

    @Transactional
    public ListingResponse createListing(User currentUser, CreateListingRequest req) {
        SellerProfile sp = sellerProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new BusinessException("SELLER_ONLY", "You need a seller profile to create listings"));
        Category category = categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", req.getCategoryId()));
        List<Skill> skills = req.getSkillIds() != null ? skillRepository.findAllById(req.getSkillIds()) : List.of();

        Listing listing = Listing.builder()
                .sellerProfile(sp).category(category).title(req.getTitle())
                .slug(generateSlug(req.getTitle())).description(req.getDescription())
                .priceAmount((long) (req.getPriceAmount() * 100)).currency("usd")
                .deliveryDays(req.getDeliveryDays())
                .revisionsIncluded(req.getRevisionsIncluded() != null ? req.getRevisionsIncluded() : 1)
                .status(Listing.ListingStatus.DRAFT).skills(skills).build();
        return ListingResponse.fromDetail(listingRepository.save(listing));
    }

    @Transactional
    public ListingResponse updateListing(User currentUser, Long id, UpdateListingRequest req) {
        Listing listing = getOwnedListing(currentUser, id);
        if (req.getTitle() != null) { listing.setTitle(req.getTitle()); listing.setSlug(generateSlug(req.getTitle())); }
        if (req.getDescription() != null) listing.setDescription(req.getDescription());
        if (req.getPriceAmount() != null) listing.setPriceAmount((long)(req.getPriceAmount() * 100));
        if (req.getDeliveryDays() != null) listing.setDeliveryDays(req.getDeliveryDays());
        if (req.getRevisionsIncluded() != null) listing.setRevisionsIncluded(req.getRevisionsIncluded());
        if (req.getCategoryId() != null) {
            listing.setCategory(categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", req.getCategoryId())));
        }
        if (req.getSkillIds() != null) listing.setSkills(skillRepository.findAllById(req.getSkillIds()));
        return ListingResponse.fromDetail(listingRepository.save(listing));
    }

    @Transactional
    public ListingResponse toggleStatus(User currentUser, Long id, boolean activate) {
        Listing listing = getOwnedListing(currentUser, id);
        listing.setStatus(activate ? Listing.ListingStatus.ACTIVE : Listing.ListingStatus.PAUSED);
        return ListingResponse.fromDetail(listingRepository.save(listing));
    }

    @Transactional
    public void deleteListing(User currentUser, Long id) {
        listingRepository.delete(getOwnedListing(currentUser, id));
    }

    private Listing getOwnedListing(User currentUser, Long id) {
        Listing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing", id));
        if (!listing.getSellerProfile().getUser().getId().equals(currentUser.getId()))
            throw new BusinessException("FORBIDDEN", "You do not own this listing");
        return listing;
    }

    private String generateSlug(String title) {
        String normalized = Normalizer.normalize(title, Normalizer.Form.NFD);
        String slug = Pattern.compile("[^\\p{ASCII}]").matcher(normalized).replaceAll("")
                .toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String base = slug;
        int c = 1;
        while (listingRepository.findBySlug(slug).isPresent()) { slug = base + "-" + c++; }
        return slug;
    }
}
