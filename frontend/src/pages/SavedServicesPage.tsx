import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { favoritesApi } from '@/api';
import { formatPrice, getInitials } from '@/utils';
import { Heart, Star, Clock, ArrowRight, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Listing } from '@/types';

export default function SavedServicesPage() {
  const queryClient = useQueryClient();

  const { data: favoritesResp, isLoading } = useQuery({
    queryKey: ['saved-services'],
    queryFn: () => favoritesApi.getAll(),
  });
  const favorites: Listing[] = favoritesResp?.data?.data || [];

  const removeMutation = useMutation({
    mutationFn: (listingId: number) => favoritesApi.toggle(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-services'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      toast.success('Removed from saved services');
    },
    onError: () => {
      toast.error('Failed to update wishlist');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold flex-shrink-0">
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Saved Services & Wishlist
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Quickly access and compare your bookmarked freelancer gigs for upcoming projects.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
              {favorites.length} {favorites.length === 1 ? 'Service' : 'Services'} Saved
            </span>
            <Link to="/explore" className="btn-secondary btn-sm flex items-center gap-1.5">
              <span>Find More</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Listings Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-3xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-16 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-xs">
              <Bookmark className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Your wishlist is empty</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Click the heart icon on any service card while exploring the marketplace to bookmark top talent for later.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/explore" className="btn-primary inline-flex items-center gap-2 text-xs font-bold py-2.5 px-6 shadow-sm">
                <span>Explore Top Services</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail & Remove Heart Button */}
                  <div className="h-48 bg-gradient-to-br from-primary-50 to-primary-100 overflow-hidden relative">
                    <Link to={`/listings/${listing.slug}`}>
                      {listing.imageUrls && listing.imageUrls.length > 0 ? (
                        <img
                          src={listing.imageUrls[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-primary-300 font-black text-4xl">
                          {listing.title[0]}
                        </div>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(listing.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md text-rose-500 hover:text-rose-600 shadow-md transition-transform hover:scale-110 active:scale-95"
                      title="Remove from saved services"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-2.5">
                    {/* Seller row */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">
                        {getInitials(listing.seller?.displayName || listing.seller?.name || 'S')}
                      </div>
                      <span className="text-xs text-gray-600 font-semibold truncate">
                        {listing.seller?.displayName || listing.seller?.name}
                      </span>
                    </div>

                    {/* Title */}
                    <Link to={`/listings/${listing.slug}`}>
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {listing.title}
                      </h3>
                    </Link>

                    {/* Rating */}
                    <div className="flex items-center gap-1 text-xs">
                      <Star size={13} className="rating-star" />
                      <span className="font-bold text-gray-900">{listing.averageRating?.toFixed(1) || '5.0'}</span>
                      <span className="text-gray-400">({listing.reviewCount || 0})</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50/75 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={12} /> {listing.deliveryDays}d delivery
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Starting at</span>
                    <span className="text-base font-extrabold text-gray-900">
                      {formatPrice(listing.priceAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
