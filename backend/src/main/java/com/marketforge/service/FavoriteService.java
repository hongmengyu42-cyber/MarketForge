package com.marketforge.service;

import com.marketforge.dto.response.ListingResponse;
import com.marketforge.entity.Listing;
import com.marketforge.entity.User;
import com.marketforge.entity.UserFavorite;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.ListingRepository;
import com.marketforge.repository.UserFavoriteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FavoriteService {

    private final UserFavoriteRepository favoriteRepository;
    private final ListingRepository listingRepository;

    @Transactional(readOnly = true)
    public List<ListingResponse> getFavoriteListings(User user) {
        return favoriteRepository.findByUserIdWithListing(user.getId())
                .stream()
                .map(fav -> ListingResponse.fromPublic(fav.getListing()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Long> getFavoriteListingIds(User user) {
        if (user == null) return List.of();
        return favoriteRepository.findListingIdsByUserId(user.getId());
    }

    @Transactional
    public boolean toggleFavorite(User user, Long listingId) {
        Optional<UserFavorite> existing = favoriteRepository.findByUserIdAndListingId(user.getId(), listingId);
        if (existing.isPresent()) {
            favoriteRepository.delete(existing.get());
            log.info("User #{} un-favorited listing #{}", user.getId(), listingId);
            return false;
        }

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing", listingId));

        UserFavorite fav = UserFavorite.builder()
                .user(user)
                .listing(listing)
                .build();
        favoriteRepository.save(fav);
        log.info("User #{} favorited listing #{}", user.getId(), listingId);
        return true;
    }

    @Transactional
    public void removeFavorite(User user, Long listingId) {
        favoriteRepository.deleteByUserIdAndListingId(user.getId(), listingId);
    }
}
