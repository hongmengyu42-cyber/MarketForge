import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  Zap,
  Check,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Listing, Category } from '@/types';
import EscrowDemoModal from '@/components/modals/EscrowDemoModal';

export default function ExplorePage() {
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();
  const queryClient = useQueryClient();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
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

  // Listings with Faceted Filters
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['listings', search, selectedCategory, sortBy, minPrice, maxPrice, deliveryDays, minRating],
    queryFn: () =>
      listingsApi.getAll({
        search: search || undefined,
        category: selectedCategory || undefined,
        sort: sortBy,
        minPrice: minPrice !== '' ? minPrice : undefined,
        maxPrice: maxPrice !== '' ? maxPrice : undefined,
        deliveryDays: deliveryDays !== '' ? deliveryDays : undefined,
        minRating: minRating !== '' ? minRating : undefined,
        size: 32,
      }),
  });
  const listings: Listing[] = listingsData?.data?.data?.content || [];

  // User Favorite IDs for Wishlist Heart Highlighting
  const { data: favoriteIdsData } = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: () => favoritesApi.getIds(),
    enabled: isAuthenticated,
  });
  const favoriteIds: number[] = favoriteIdsData?.data?.data || [];
  const favoriteSet = new Set(favoriteIds);

  // Toggle Favorite Mutation
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
      {/* ══════════════════════════════════════════════════════════════
           PREMIUM HERO BANNER — Pure CSS 3D Glass Orb (no image assets)
           Senior FE pattern: asymmetric 55/45 grid, clean type scale,
           animated CSS orb with layered radial gradients + ring halos
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-white overflow-hidden">
        {/* Subtle full-width background gradient that bleeds edge-to-edge */}
        <div className="relative min-h-[580px] lg:min-h-[640px] flex items-center">
          {/* Background decorative blobs — fixed positions, no overflow issues */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 65%)' }} />
            <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)' }} />
          </div>

          {/* Inner constrained grid */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 lg:py-20">
            <div className="grid lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_540px] gap-10 lg:gap-16 items-center">

              {/* ── LEFT: Copy Column ── */}
              <div className="space-y-7 max-w-2xl animate-fade-up">

                {/* Headline — 2 controlled lines, no orphans */}
                <div className="space-y-2">
                  <h1 className="text-[42px] sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.1] text-slate-900">
                    Hire with Confidence.
                  </h1>
                  <h1 className="text-[42px] sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.1]"
                    style={{
                      background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Pay Only on Delivery.
                  </h1>
                </div>

                {/* Subheadline */}
                <p className="text-slate-500 text-[17px] leading-[1.75] max-w-[520px]">
                  MarketForge auto-locks payments in smart escrow, releases funds only when milestones are verified — so both sides win, every time.
                </p>

                {/* Single primary CTA */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => openModal('auth')}
                    className="font-bold text-sm text-white px-8 py-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      boxShadow: '0 8px 24px rgba(99,102,241,0.35), 0 2px 6px rgba(99,102,241,0.20)',
                    }}
                  >
                    Get Started — It's Free
                  </button>
                </div>

                {/* Search bar */}
                <div className="pt-1 max-w-[500px]">
                  <div className="relative rounded-2xl"
                    style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.05)' }}
                  >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search services, skills, or sellers..."
                      className="w-full pl-11 pr-28 py-3.5 rounded-2xl text-slate-800 bg-white border border-slate-200/80 text-sm focus:outline-none focus:ring-2 focus:border-indigo-400 placeholder-slate-400 transition-all"
                      style={{ focusRingColor: 'rgba(99,102,241,0.3)' } as React.CSSProperties}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-[88px] top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 px-1"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                    >
                      Search
                    </button>
                  </div>
                  {/* Popular tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="text-[11px] text-slate-400 font-medium">Popular:</span>
                    {['Web Dev', 'UI/UX Design', 'AI Prompts', 'Smart Contracts', 'Branding'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearch(tag)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white text-slate-600 border border-slate-200/80 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-5 pt-2">
                  {[
                    { icon: <ShieldCheck size={15} className="text-emerald-500" />, label: '100% Escrow Protected' },
                    { icon: <Star size={14} className="text-amber-400 fill-amber-400" />, label: '4.9/5 avg rating' },
                    { icon: <Check size={14} className="text-indigo-500 font-bold" />, label: '2,800+ verified sellers' },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      {t.icon}
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── RIGHT: Pure CSS 3D Glass Orb ── */}
              <div className="relative flex items-center justify-center h-[400px] lg:h-[480px] select-none pointer-events-none">

                {/* Ambient circular glow behind the orb — strictly rounded-full, no square container */}
                <div
                  className="absolute w-80 h-80 rounded-full animate-pulse-glow"
                  style={{
                    background: 'radial-gradient(circle, rgba(99,102,241,0.20) 0%, rgba(139,92,246,0.12) 45%, transparent 70%)',
                  }}
                />

                {/* Outer ring 1 — slow spin */}
                <div className="absolute w-[380px] h-[380px] rounded-full animate-orb-spin"
                  style={{
                    border: '1.5px solid rgba(99,102,241,0.18)',
                    boxShadow: 'inset 0 0 40px rgba(99,102,241,0.08)',
                  }}
                >
                  {/* Orbiting dot on ring 1 */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', boxShadow: '0 0 10px rgba(129,140,248,0.8)' }}
                  />
                </div>

                {/* Outer ring 2 — reverse spin, tilted */}
                <div className="absolute w-[300px] h-[300px] rounded-full animate-orb-spin-rev"
                  style={{
                    border: '1px solid rgba(139,92,246,0.14)',
                    transform: 'rotate(45deg)',
                  }}
                >
                  <div className="absolute bottom-1 right-1/2 translate-x-1/2 w-2 h-2 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8)', boxShadow: '0 0 8px rgba(96,165,250,0.8)' }}
                  />
                </div>

                {/* Core glass orb */}
                <div className="relative w-52 h-52 rounded-full z-10"
                  style={{
                    background: `
                      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.90) 0%, transparent 42%),
                      radial-gradient(circle at 68% 72%, rgba(192,132,252,0.55) 0%, transparent 48%),
                      radial-gradient(circle at 50% 50%, rgba(99,102,241,0.75) 0%, rgba(139,92,246,0.60) 50%, rgba(59,130,246,0.55) 100%)
                    `,
                    boxShadow: `
                      inset 0 -20px 60px rgba(139,92,246,0.35),
                      inset 0 20px 40px rgba(255,255,255,0.65),
                      0 30px 80px rgba(99,102,241,0.30),
                      0 10px 30px rgba(139,92,246,0.20)
                    `,
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  {/* Specular highlight (white shine top-left) */}
                  <div className="absolute top-6 left-7 w-14 h-10 rounded-full"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(255,255,255,0.90) 0%, transparent 70%)',
                      filter: 'blur(6px)',
                      transform: 'rotate(-20deg)',
                    }}
                  />
                  {/* Secondary highlight bottom-right */}
                  <div className="absolute bottom-7 right-8 w-8 h-6 rounded-full"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)',
                      filter: 'blur(4px)',
                    }}
                  />
                  {/* Inner reflection band */}
                  <div className="absolute inset-6 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)',
                      border: '1px solid rgba(255,255,255,0.30)',
                    }}
                  />
                </div>

                {/* ── Floating metric cards ── */}

                {/* Top-right card: Escrow Protected */}
                <div className="absolute top-8 right-0 animate-float-reverse z-20 rounded-2xl px-3.5 py-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.90)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(99,102,241,0.08)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' }}>
                      <ShieldCheck size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">100% Escrow Protected</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Neutral milestone lock</div>
                    </div>
                  </div>
                </div>

                {/* Bottom-left card: Payout */}
                <div className="absolute bottom-10 left-0 animate-float-slow z-20 rounded-2xl px-3.5 py-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.90)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(99,102,241,0.08)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' }}>
                      <Zap size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">Milestone #1 Approved</div>
                      <div className="text-[10px] text-emerald-600 font-bold mt-0.5">+$450.00 disbursed instantly</div>
                    </div>
                  </div>
                </div>

                {/* Top-left card: Rating */}
                <div className="absolute top-16 left-4 animate-float-slow z-20 rounded-2xl px-3 py-2"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.90)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    animationDelay: '2s',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Star size={13} className="text-amber-400 fill-amber-400" />
                    <span className="text-[11px] font-bold text-slate-800">4.9/5</span>
                    <span className="text-[10px] text-slate-400">· Double-blind verified</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ── Trust bar below hero ── */}
        <div className="border-t border-slate-100 bg-white py-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs text-slate-400 font-medium">
              <span className="text-slate-300 font-semibold uppercase tracking-widest text-[10px]">Trusted by teams using</span>
              {['React', 'Next.js', 'Laravel', 'Figma', 'Shopify', 'WordPress'].map((tech) => (
                <span key={tech} className="text-slate-500 font-semibold hover:text-indigo-600 transition-colors cursor-default">
                  {tech}
                </span>
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
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
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
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
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

      {/* ──── Main Content Area with Faceted Filters ──── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Controls Bar: Filter Toggle, Sort & View Mode */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                isFilterOpen || hasActiveFilters
                  ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary-600" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-1 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}

            <span className="text-sm text-gray-500 hidden sm:inline">
              Showing <strong className="text-gray-900">{listings.length}</strong> services
            </span>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-xs"
              >
                <option value="created_at">Newest Arrivals</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Top Rated (4.5+)</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-200 rounded-xl p-0.5 bg-gray-50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-primary-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="List View"
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Faceted Filter Drawer */}
        {isFilterOpen && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Budget / Price Filter */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                  Budget Range ($)
                </label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min ($)"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max ($)"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                {/* Budget Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any', min: '', max: '' },
                    { label: '< $50', min: '', max: 50 },
                    { label: '$50–$150', min: 50, max: 150 },
                    { label: '$150–$500', min: 150, max: 500 },
                    { label: '$500+', min: 500, max: '' },
                  ].map((preset, idx) => {
                    const isSelected = minPrice === preset.min && maxPrice === preset.max;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMinPrice(preset.min as number | '');
                          setMaxPrice(preset.max as number | '');
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Speed Filter */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                  Delivery Speed
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Any Delivery', days: '' },
                    { label: '⚡ 24h Express', days: 1 },
                    { label: 'Up to 3 Days', days: 3 },
                    { label: 'Up to 7 Days', days: 7 },
                  ].map((preset, idx) => {
                    const isSelected = deliveryDays === preset.days;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDeliveryDays(preset.days as number | '')}
                        className={`text-xs px-3 py-2 rounded-xl border font-medium text-left transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary-50 border-primary-500 text-primary-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {isSelected && <Check size={13} className="text-primary-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seller Rating Filter */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                  Minimum Rating
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Any Rating', rating: '' },
                    { label: '⭐ 4.5 & up (Top Talent)', rating: 4.5 },
                    { label: '⭐ 4.0 & up (Established)', rating: 4.0 },
                  ].map((preset, idx) => {
                    const isSelected = minRating === preset.rating;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMinRating(preset.rating as number | '')}
                        className={`text-xs px-3 py-2 rounded-xl border font-medium text-left transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary-50 border-primary-500 text-primary-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {isSelected && <Check size={13} className="text-primary-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Clear All Footer */}
            {hasActiveFilters && (
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Clear all filter criteria
                </button>
              </div>
            )}
          </div>
        )}

        {/* ──── Listings Results ──── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
                <div className="bg-gray-200 h-48" />
                <div className="p-4 space-y-3">
                  <div className="bg-gray-200 h-4 rounded w-3/4" />
                  <div className="bg-gray-200 h-3 rounded w-1/2" />
                  <div className="bg-gray-200 h-6 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 py-16 px-4 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No services found</h3>
            <p className="text-sm text-gray-500 mb-6">
              We couldn&apos;t find any gigs matching your current filters. Try relaxing your budget or searching with different keywords.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="btn-primary px-5 py-2.5 rounded-xl text-sm"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ──── GRID VIEW ──── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => {
              const isSaved = favoriteSet.has(listing.id);
              return (
                <div
                  key={listing.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative"
                >
                  {/* Top-Right Heart Wishlist Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, listing.id)}
                    className={`absolute top-3 right-3 z-20 p-2 rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 ${
                      isSaved
                        ? 'bg-red-500 text-white'
                        : 'bg-white/80 hover:bg-white text-gray-600 hover:text-red-500'
                    }`}
                    title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
                  >
                    <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                  </button>

                  <Link to={`/listings/${listing.slug}`} className="flex-1 flex flex-col">
                    {/* Gig Image Banner */}
                    <div className="relative h-48 bg-gradient-to-br from-primary-100 to-indigo-100 overflow-hidden">
                      {listing.imageUrls && listing.imageUrls.length > 0 ? (
                        <img
                          src={listing.imageUrls[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-primary-400">
                          <span className="text-4xl font-extrabold">{listing.title[0]}</span>
                        </div>
                      )}
                      {listing.deliveryDays <= 1 && (
                        <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs flex items-center gap-1 shadow-sm">
                          <Zap size={10} fill="currentColor" /> Express 24h
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Seller */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {getInitials(listing.seller?.name || 'S')}
                          </div>
                          <span className="text-xs text-gray-600 font-medium truncate">
                            {listing.seller?.displayName || listing.seller?.name}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
                          {listing.title}
                        </h3>
                      </div>

                      <div>
                        {/* Rating */}
                        <div className="flex items-center gap-1 mb-3">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-gray-900">
                            {listing.averageRating ? listing.averageRating.toFixed(1) : 'New'}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({listing.reviewCount || 0})
                          </span>
                        </div>

                        {/* Price & Delivery */}
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={12} /> {listing.deliveryDays}d delivery
                          </span>
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block -mb-0.5 uppercase tracking-wider font-semibold">From</span>
                            <span className="text-base font-extrabold text-gray-900">
                              {formatPrice(listing.priceAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          /* ──── LIST VIEW ──── */
          <div className="space-y-4">
            {listings.map((listing) => {
              const isSaved = favoriteSet.has(listing.id);
              return (
                <div
                  key={listing.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row group relative"
                >
                  {/* Image container */}
                  <div className="relative md:w-64 h-48 md:h-auto bg-gradient-to-br from-primary-100 to-indigo-100 shrink-0 overflow-hidden">
                    {listing.imageUrls && listing.imageUrls.length > 0 ? (
                      <img
                        src={listing.imageUrls[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-primary-400">
                        <span className="text-4xl font-bold">{listing.title[0]}</span>
                      </div>
                    )}
                    {listing.deliveryDays <= 1 && (
                      <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs flex items-center gap-1 shadow-sm">
                        <Zap size={10} fill="currentColor" /> Express 24h
                      </span>
                    )}

                    {/* Heart button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, listing.id)}
                      className={`absolute top-3 left-3 z-20 p-2 rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 ${
                        isSaved
                          ? 'bg-red-500 text-white'
                          : 'bg-white/80 hover:bg-white text-gray-600 hover:text-red-500'
                      }`}
                      title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
                    >
                      <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Body container */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-[10px] flex items-center justify-center">
                            {getInitials(listing.seller?.name || 'S')}
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {listing.seller?.displayName || listing.seller?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-gray-900">
                            {listing.averageRating ? listing.averageRating.toFixed(1) : 'New'}
                          </span>
                          <span className="text-xs text-gray-400">({listing.reviewCount || 0})</span>
                        </div>
                      </div>

                      <Link to={`/listings/${listing.slug}`}>
                        <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                          {listing.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                          {listing.description || 'Professional freelance service delivered with fast turnaround and revision guarantees.'}
                        </p>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {listing.deliveryDays} Days Delivery
                        </span>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium">Escrow Protected</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block -mb-0.5 uppercase tracking-wider font-semibold">Starting at</span>
                          <span className="text-lg font-black text-gray-900">
                            {formatPrice(listing.priceAmount)}
                          </span>
                        </div>
                        <Link
                          to={`/listings/${listing.slug}`}
                          className="btn-primary text-xs px-4 py-2 rounded-xl"
                        >
                          View Gig
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Smart Escrow Demo Modal */}
      <EscrowDemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </div>
  );
}