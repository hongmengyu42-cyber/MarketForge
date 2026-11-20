import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { listingsApi, metadataApi, favoritesApi } from '@/api';
import { formatPrice, getInitials } from '@/utils';
import { useAuthStore, useUIStore } from '@/store';
import {
  Search,
  Star,
  Clock,
  Heart,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Listing, Category } from '@/types';
import EscrowDemoModal from '@/components/modals/EscrowDemoModal';

export default function ServicesPage() {
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Search & Filter States
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState('created_at');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [deliveryDays, setDeliveryDays] = useState<number | ''>('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  // Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => metadataApi.getCategories(),
  });
  const categories: Category[] = categoriesData?.data?.data || [];

  // Listings Query
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['listings', search, selectedCategory, sortBy, minPrice, maxPrice, deliveryDays, minRating],
    queryFn: () =>
      listingsApi.getAll({
        search: search || undefined,
        category: selectedCategory || undefined,
        sort: sortBy,
        minPrice: minPrice !== '' ? Number(minPrice) * 100 : undefined,
        maxPrice: maxPrice !== '' ? Number(maxPrice) * 100 : undefined,
        deliveryDays: deliveryDays !== '' ? Number(deliveryDays) : undefined,
        minRating: minRating !== '' ? Number(minRating) : undefined,
        size: 32,
      }),
  });
  const listings: Listing[] = listingsData?.data?.data?.content || listingsData?.data?.data || [];

  // Favorites
  const { data: favoriteIdsData } = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: () => favoritesApi.getIds(),
    enabled: isAuthenticated,
  });
  const favoriteIds: number[] = favoriteIdsData?.data?.data || [];
  const favoriteSet = new Set(favoriteIds);

  const toggleFavoriteMutation = useMutation({
    mutationFn: (listingId: number) => favoritesApi.toggle(listingId),
    onSuccess: (res) => {
      const isSaved = res.data?.data?.favorited;
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(isSaved ? 'Saved to your Wishlist!' : 'Removed from Wishlist');
    },
    onError: () => {
      toast.error('Failed to update wishlist');
    },
  });

  const handleToggleFavorite = (e: React.MouseEvent, listingId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast('Sign in to save services to your wishlist!', { icon: '🔒' });
      openModal('auth');
      return;
    }
    toggleFavoriteMutation.mutate(listingId);
  };

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(selectedCategory) ||
    minPrice !== '' ||
    maxPrice !== '' ||
    deliveryDays !== '' ||
    minRating !== '';

  const clearAllFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setDeliveryDays('');
    setMinRating('');
    setSortBy('created_at');
  };

  return (
    <div className="w-full pb-16">
      {/* ──── Header & Dedicated Search Section ──── */}
      <section className="bg-white border-b border-gray-200 py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
              Verified Freelance Marketplace
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Explore Professional Services
            </h1>
            <p className="mt-2 text-slate-500 text-sm sm:text-base leading-relaxed">
              Find and hire verified engineers, designers, and specialists with 100% smart milestone escrow protection.
            </p>
          </div>

          {/* Search Box */}
          <div className="mt-6 max-w-2xl">
            <div
              className="relative rounded-2xl bg-white"
              style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.05)' }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services, skills, or sellers (e.g. React, UI/UX, Python)..."
                className="w-full pl-11 pr-28 py-3.5 rounded-2xl text-slate-800 bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-[88px] top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                Search
              </button>
            </div>

            {/* Popular tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-[11px] text-slate-400 font-medium">Popular:</span>
              {['Web Dev', 'UI/UX Design', 'AI Prompts', 'Smart Contracts', 'Branding', 'Mobile Apps'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearch(tag)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──── Sticky Categories Bar ──── */}
      <section id="services-catalog" className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === ''
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Main Content Area ──── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`btn btn-secondary btn-sm flex items-center gap-2 cursor-pointer ${
                hasActiveFilters ? 'border-primary-500 text-primary-600 bg-primary-50/50' : ''
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary-600"></span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            <span className="text-xs text-gray-400 border-l border-gray-200 pl-3">
              Showing <span className="font-semibold text-gray-700">{listings.length}</span> services
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="created_at">Newest Arrivals</option>
                <option value="rating">Highest Rated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-primary-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-primary-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="List View"
              >
                <ListIcon size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {isFilterOpen && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8 shadow-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price Range */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Budget ($)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                    className="input py-1.5 text-xs"
                    min="0"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                    className="input py-1.5 text-xs"
                    min="0"
                  />
                </div>
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Delivery Time</label>
                <select
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value ? Number(e.target.value) : '')}
                  className="input py-1.5 text-xs bg-white"
                >
                  <option value="">Any Delivery Time</option>
                  <option value="1">Up to 24 hours</option>
                  <option value="3">Up to 3 days</option>
                  <option value="7">Up to 7 days</option>
                  <option value="14">Up to 14 days</option>
                </select>
              </div>

              {/* Minimum Rating */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : '')}
                  className="input py-1.5 text-xs bg-white"
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5 & up ⭐</option>
                  <option value="4.0">4.0 & up ⭐</option>
                  <option value="3.5">3.5 & up ⭐</option>
                </select>
              </div>

              {/* Reset Filter Button */}
              <div className="flex items-end">
                <button
                  onClick={clearAllFilters}
                  className="btn btn-secondary btn-sm w-full cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listings Grid / List View */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs max-w-xl mx-auto p-8">
            <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No services found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              We couldn't find any services matching your criteria. Try adjusting your search keywords or resetting active filters.
            </p>
            <button onClick={clearAllFilters} className="btn-primary btn-sm mt-5 cursor-pointer">
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => {
              const primaryImage =
                listing.imageUrls?.[0] ||
                'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80';
              const seller = listing.seller;
              const isSaved = favoriteSet.has(listing.id);

              return (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.slug}`}
                  className="group card overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-gray-200"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video bg-gray-100 overflow-hidden">
                    <img
                      src={primaryImage}
                      alt={listing.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, listing.id)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white shadow-xs transition-colors cursor-pointer z-10"
                      title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                    >
                      <Heart
                        size={15}
                        className={isSaved ? 'fill-red-500 text-red-500' : ''}
                      />
                    </button>
                    {/* Category Pill */}
                    {listing.category && (
                      <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[11px] font-medium text-white">
                        {listing.category.name}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Seller Profile Summary */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-primary-100 shrink-0">
                          {seller?.avatarUrl ? (
                            <img
                              src={seller.avatarUrl}
                              alt={seller.displayName || seller.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary-700">
                              {getInitials(seller?.displayName || seller?.name || 'Seller')}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {seller?.displayName || seller?.name || 'Verified Freelancer'}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-sm text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug mb-2">
                        {listing.title}
                      </h4>
                    </div>

                    <div>
                      {/* Rating & Delivery Badges */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pt-2">
                        <div className="flex items-center gap-1 font-semibold text-gray-800">
                          <Star size={13} className="text-yellow-400 fill-yellow-400" />
                          <span>{listing.averageRating?.toFixed(1) || '5.0'}</span>
                          <span className="text-gray-400 font-normal">
                            ({listing.reviewCount || 0})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock size={12} />
                          <span>{listing.deliveryDays}d delivery</span>
                        </div>
                      </div>

                      {/* Pricing Footer */}
                      <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                          Starting at
                        </span>
                        <span className="text-base font-bold text-gray-900">
                          {formatPrice(listing.priceAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => {
              const primaryImage =
                listing.imageUrls?.[0] ||
                'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80';
              const seller = listing.seller;
              const isSaved = favoriteSet.has(listing.id);

              return (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.slug}`}
                  className="group card overflow-hidden flex flex-col sm:flex-row transition-all duration-200 hover:shadow-md border-gray-200"
                >
                  <div className="sm:w-64 h-48 sm:h-auto relative bg-gray-100 shrink-0">
                    <img
                      src={primaryImage}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => handleToggleFavorite(e, listing.id)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white shadow-xs transition-colors cursor-pointer z-10"
                    >
                      <Heart
                        size={15}
                        className={isSaved ? 'fill-red-500 text-red-500' : ''}
                      />
                    </button>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-primary-100 shrink-0">
                            {seller?.avatarUrl ? (
                              <img
                                src={seller.avatarUrl}
                                alt={seller.displayName || seller.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary-700">
                                {getInitials(seller?.displayName || seller?.name || 'Seller')}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {seller?.displayName || seller?.name || 'Verified Freelancer'}
                          </span>
                        </div>
                        {listing.category && (
                          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                            {listing.category.name}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-base text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                        {listing.title}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {listing.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 font-semibold text-gray-800">
                          <Star size={13} className="text-yellow-400 fill-yellow-400" />
                          <span>{listing.averageRating?.toFixed(1) || '5.0'}</span>
                          <span className="text-gray-400 font-normal">
                            ({listing.reviewCount || 0})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock size={12} />
                          <span>{listing.deliveryDays} days</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                          Starting at
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(listing.priceAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <EscrowDemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </div>
  );
}
