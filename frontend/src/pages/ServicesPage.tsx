import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { listingsApi, metadataApi, favoritesApi } from '@/api';
import { formatPrice, getInitials, getMediaUrl } from '@/utils';
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
  CheckCircle2,
  ShieldCheck,
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
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50/80 via-indigo-50/20 to-white dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800/80 py-10 lg:py-14">
        {/* Soft atmospheric background glow */}
        <div 
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none opacity-40 blur-3xl rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(168,85,247,0.12) 50%, transparent 70%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-slate-800 shadow-2xs mb-3.5 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified Freelance Marketplace
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Explore Professional Services
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
              Find and hire verified engineers, designers, and specialists with 100% smart milestone escrow protection.
            </p>
          </div>

          {/* Search Box */}
          <div className="mt-7 max-w-2xl">
            <div
              className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all duration-200"
              style={{ boxShadow: '0 8px 30px rgba(99,102,241,0.08), 0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services, skills, or sellers (e.g. React, UI/UX, Python)..."
                className="w-full pl-11 pr-28 py-3.5 rounded-2xl text-slate-800 dark:text-slate-100 bg-transparent border-0 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-24 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 cursor-pointer font-medium"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-xs hover:shadow hover:opacity-95 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                Search
              </button>
            </div>

            {/* Popular tags */}
            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              <span className="text-[11px] text-slate-400 font-medium">Popular:</span>
              {['Web Dev', 'UI/UX Design', 'AI Prompts', 'Smart Contracts', 'Branding', 'Mobile Apps'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearch(tag)}
                  className="text-xs font-medium px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 shadow-2xs transition-all cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──── Sticky Categories Bar ──── */}
      <section id="services-catalog" className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="relative flex items-center">
            {/* Scrollable Track */}
            <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide w-full scroll-smooth pr-10">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === ''
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.slug
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Subtle right fade gradient mask so it doesn't clip harshly */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/80" />
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
                className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            <span className="text-xs text-gray-400 dark:text-slate-500 border-l border-gray-200 dark:border-slate-800 pl-3">
              Showing <span className="font-semibold text-gray-700 dark:text-slate-300">{listings.length}</span> services
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="created_at">Newest Arrivals</option>
                <option value="rating">Highest Rated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg border border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
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
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 mb-8 shadow-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price Range */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">Budget ($)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                    className="input py-1.5 text-xs"
                    min="0"
                  />
                  <span className="text-gray-400 dark:text-slate-500 text-xs">to</span>
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
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">Delivery Time</label>
                <select
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value ? Number(e.target.value) : '')}
                  className="input py-1.5 text-xs bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
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
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : '')}
                  className="input py-1.5 text-xs bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
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
              <div key={i} className="card overflow-hidden animate-pulse dark:bg-slate-900 dark:border-slate-800">
                <div className="h-48 bg-gray-200 dark:bg-slate-800" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-800" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-slate-800/60 rounded w-1/2" />
                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto p-8">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-4">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">No services found</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
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
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/8 dark:hover:shadow-indigo-500/10"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={primaryImage}
                      alt={listing.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Dark subtle overlay on image bottom to make badge pop */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-black/10 pointer-events-none" />

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, listing.id)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 shadow-xs transition-all cursor-pointer z-10 active:scale-90"
                      title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                    >
                      <Heart
                        size={14}
                        className={isSaved ? 'fill-red-500 text-red-500' : ''}
                      />
                    </button>

                    {/* Category Pill */}
                    {listing.category && (
                      <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/75 backdrop-blur-md text-[11px] font-semibold text-white/95 border border-white/10 shadow-2xs">
                        {listing.category.name}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Seller Profile Summary with Verified Checkmark */}
                      <div className="flex items-center justify-between gap-1.5 mb-2.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 relative">
                            <span>{getInitials(seller?.displayName || seller?.name || 'Seller')}</span>
                            {seller?.avatarUrl && (
                              <img
                                src={getMediaUrl(seller.avatarUrl)}
                                alt={seller.displayName || seller.name}
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                className="w-full h-full object-cover absolute inset-0"
                              />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {seller?.displayName || seller?.name || 'Verified Freelancer'}
                          </span>
                          <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0 fill-indigo-50 dark:fill-indigo-950" />
                        </div>

                        {/* Escrow Shield indicator */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 px-1.5 py-0.5 rounded-md shrink-0">
                          <ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
                          Escrow
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug mb-2">
                        {listing.title}
                      </h4>
                    </div>

                    <div>
                      {/* Rating & Delivery Badges */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3 pt-2">
                        <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                          <Star size={13} className="text-amber-400 fill-amber-400" />
                          <span>{listing.averageRating?.toFixed(1) || '5.0'}</span>
                          <span className="text-slate-400 dark:text-slate-500 font-normal">
                            ({listing.reviewCount || 0})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                          <Clock size={12} className="text-slate-400" />
                          <span>{listing.deliveryDays}d delivery</span>
                        </div>
                      </div>

                      {/* Pricing Footer */}
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Starting at
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
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
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col sm:flex-row transition-all duration-300 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/50"
                >
                  <div className="sm:w-64 h-48 sm:h-auto relative bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
                    <img
                      src={primaryImage}
                      alt={listing.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <button
                      onClick={(e) => handleToggleFavorite(e, listing.id)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 shadow-xs transition-all cursor-pointer z-10 active:scale-90"
                    >
                      <Heart
                        size={14}
                        className={isSaved ? 'fill-red-500 text-red-500' : ''}
                      />
                    </button>
                    {listing.category && (
                      <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/75 backdrop-blur-md text-[11px] font-semibold text-white/95 border border-white/10 shadow-2xs">
                        {listing.category.name}
                      </span>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 relative">
                            <span>{getInitials(seller?.displayName || seller?.name || 'Seller')}</span>
                            {seller?.avatarUrl && (
                              <img
                                src={getMediaUrl(seller.avatarUrl)}
                                alt={seller.displayName || seller.name}
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                className="w-full h-full object-cover absolute inset-0"
                              />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {seller?.displayName || seller?.name || 'Verified Freelancer'}
                          </span>
                          <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0 fill-indigo-50 dark:fill-indigo-950" />
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 px-2 py-0.5 rounded-md">
                          <ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
                          Escrow Protected
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                        {listing.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {listing.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                          <Star size={13} className="text-amber-400 fill-amber-400" />
                          <span>{listing.averageRating?.toFixed(1) || '5.0'}</span>
                          <span className="text-slate-400 dark:text-slate-500 font-normal">
                            ({listing.reviewCount || 0})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                          <Clock size={12} className="text-slate-400" />
                          <span>{listing.deliveryDays} days delivery</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Starting at
                        </span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">
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
