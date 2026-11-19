import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { sellerApi, listingsApi, metadataApi } from '@/api';
import { useAuthStore } from '@/store';
import { formatPrice, getInitials } from '@/utils';
import {
  Palette,
  Plus,
  Star,
  CheckCircle,
  Trash2,
  PauseCircle,
  PlayCircle,
  Eye,
  X,
  Sparkles,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Listing, Category } from '@/types';

export default function SellerStudioPage() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form states for Create Listing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [priceAmount, setPriceAmount] = useState<number>(50);
  const [deliveryDays, setDeliveryDays] = useState<number>(3);
  const [revisionsIncluded, setRevisionsIncluded] = useState<number>(2);
  const [skillsInput, setSkillsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Fetch seller profile
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: () => sellerApi.getProfile(),
    retry: false,
  });
  const sellerProfile = profileData?.data?.data;
  const isSeller = !!sellerProfile || user?.isSeller;

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => metadataApi.getCategories(),
  });
  const categories: Category[] = categoriesData?.data?.data || [];

  // Fetch seller listings
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['seller-listings'],
    queryFn: () => listingsApi.getMine(),
    enabled: isSeller,
  });
  const listings: Listing[] = listingsData?.data?.data?.content || [];

  // Fetch seller analytics (Phase 3)
  const { data: analyticsResp, isLoading: analyticsLoading } = useQuery({
    queryKey: ['seller-analytics'],
    queryFn: () => sellerApi.getAnalytics(),
    enabled: isSeller,
  });
  const analytics = analyticsResp?.data?.data;

  // Mutations
  const onboardMutation = useMutation({
    mutationFn: () => sellerApi.onboard(),
    onSuccess: () => {
      toast.success('Congratulations! Your Seller Studio is now active.');
      updateUser({ isSeller: true });
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Onboarding failed';
      toast.error(msg);
    },
  });

  const createListingMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => listingsApi.create(data),
    onSuccess: () => {
      toast.success('New service listing published successfully!');
      queryClient.invalidateQueries({ queryKey: ['seller-listings'] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create listing';
      toast.error(msg);
    },
  });

  const togglePauseMutation = useMutation({
    mutationFn: ({ id, isPaused }: { id: number; isPaused: boolean }) =>
      isPaused ? listingsApi.activate(id) : listingsApi.pause(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-listings'] });
      toast.success(variables.isPaused ? 'Listing activated' : 'Listing paused');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => listingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-listings'] });
      toast.success('Listing deleted');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete';
      toast.error(msg);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategoryId('');
    setPriceAmount(50);
    setDeliveryDays(3);
    setRevisionsIncluded(2);
    setSkillsInput('');
    setImageUrl('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) {
      toast.error('Please enter title and select category');
      return;
    }

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    createListingMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      categoryId: Number(categoryId),
      priceAmount: Number(priceAmount) * 100, // stored in cents
      currency: 'usd',
      deliveryDays: Number(deliveryDays),
      revisionsIncluded: Number(revisionsIncluded),
      skills,
      imageUrls: imageUrl.trim() ? [imageUrl.trim()] : [],
    });
  };

  if (profileLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  // Not a seller yet -> Onboarding landing screen
  if (!isSeller) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card p-8 sm:p-12 text-center space-y-6 border-primary-200 shadow-xl bg-gradient-to-b from-white to-primary-50/20">
          <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Palette size={32} />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h1 className="text-3xl font-extrabold text-gray-900">Become a Seller on MarketForge</h1>
            <p className="text-gray-600">
              Monetize your expertise in engineering, design, marketing, and more with guaranteed escrow protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl mx-auto pt-4">
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-2">
              <TrendingUp className="text-primary-600" size={20} />
              <h3 className="font-bold text-gray-900 text-sm">Set Your Pricing</h3>
              <p className="text-xs text-gray-500">Fixed rate or milestone contracts with automated invoices.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-2">
              <CheckCircle className="text-green-600" size={20} />
              <h3 className="font-bold text-gray-900 text-sm">Guaranteed Payouts</h3>
              <p className="text-xs text-gray-500">Escrow funds pre-funded by buyers before work begins.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-2">
              <Sparkles className="text-accent-500" size={20} />
              <h3 className="font-bold text-gray-900 text-sm">Low Platform Fee</h3>
              <p className="text-xs text-gray-500">Only 10% standard platform fee. Keep 90% of your earnings.</p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => onboardMutation.mutate()}
              disabled={onboardMutation.isPending}
              className="btn-primary py-3 px-8 text-base font-semibold shadow-lg shadow-primary-500/25"
            >
              {onboardMutation.isPending ? 'Activating Profile...' : 'Activate Free Seller Studio'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Seller Studio
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="avatar w-14 h-14 text-base font-bold bg-primary-600 text-white">
            {getInitials(sellerProfile?.displayName || user?.name || 'S')}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
              Seller Studio
            </h1>
            <p className="text-sm text-gray-500">
              Welcome back, <span className="font-semibold text-gray-800">{sellerProfile?.displayName || user?.name}</span>!
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={18} /> Create New Listing
        </button>
      </div>

      {/* ──── Key Performance KPIs ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Total Released Earnings</span>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {formatPrice(analytics?.totalEarnings || 0)}
          </div>
          <div className="text-[11px] text-gray-400">Available or withdrawn</div>
        </div>

        <div className="card p-5 space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Protected in Escrow</span>
            <ShieldCheck size={16} className="text-primary-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {formatPrice(analytics?.inEscrow || 0)}
          </div>
          <div className="text-[11px] text-primary-600 font-medium">{analytics?.activeOrders || 0} active orders</div>
        </div>

        <div className="card p-5 space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Order Completion Rate</span>
            <CheckCircle size={16} className="text-green-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {analytics?.completionRate ?? 100}%
          </div>
          <div className="text-[11px] text-gray-400">{analytics?.completedOrders || 0} completed orders</div>
        </div>

        <div className="card p-5 space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Client Satisfaction</span>
            <Star size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 flex items-baseline gap-1">
            <span>{analytics?.rating ? analytics.rating.toFixed(1) : (sellerProfile?.averageRating ? sellerProfile.averageRating.toFixed(1) : '5.0')}</span>
            <span className="text-xs text-gray-400 font-normal">({analytics?.reviewCount || sellerProfile?.reviewCount || 0} reviews)</span>
          </div>
          <div className="text-[11px] text-gray-400">{listings.filter((l) => l.status === 'active').length} active listings</div>
        </div>
      </div>

      {/* ──── Revenue & Performance Analytics Chart ──── */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary-600" /> Revenue & Order Volume Trends
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Monthly trajectory of released earnings and closed projects</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/wallet"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowUpRight size={14} /> Payout & Wallet Ledger
            </Link>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="h-44 bg-gray-50 rounded-2xl animate-pulse flex items-center justify-center text-xs text-gray-400">
            Loading analytics telemetry...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Bar Chart */}
            <div className="pt-4 pb-2">
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 border-b border-gray-100 pb-2">
                {(() => {
                  const trend = analytics?.monthlyTrend || [];
                  const maxEarn = Math.max(...trend.map((t: { earnings: number }) => t.earnings), 100);
                  return trend.map((item: { month: string; earnings: number; orderCount: number }, idx: number) => {
                    const heightPct = Math.max(8, Math.round((item.earnings / maxEarn) * 100));
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatPrice(item.earnings)}
                        </div>
                        <div
                          className="w-full max-w-[48px] rounded-t-xl transition-all duration-300 group-hover:brightness-110 flex items-end justify-center pb-2 cursor-pointer"
                          style={{
                            height: `${heightPct}%`,
                            background: item.earnings > 0
                              ? 'linear-gradient(180deg, #4f46e5 0%, #818cf8 100%)'
                              : '#e2e8f0',
                          }}
                        >
                          {item.orderCount > 0 && (
                            <span className="text-[9px] font-bold text-white hidden sm:inline">
                              {item.orderCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500 truncate w-full text-center">
                          {item.month.split(' ')[0]}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Performance Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-[11px] text-gray-500 font-medium">Average Order Value</div>
                <div className="text-base font-bold text-gray-900 mt-0.5">
                  {formatPrice(analytics?.averageOrderValue || 0)}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-[11px] text-gray-500 font-medium">In Escrow Pipeline</div>
                <div className="text-base font-bold text-primary-600 mt-0.5">
                  {formatPrice(analytics?.inEscrow || 0)}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-[11px] text-gray-500 font-medium">Completed Milestones</div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">
                  {analytics?.completedOrders || 0} Orders
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-[11px] text-gray-500 font-medium">Disputes / Issues</div>
                <div className="text-base font-bold text-gray-700 mt-0.5">
                  {analytics?.disputedOrders || 0} cases
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Listings Section */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-bold text-gray-900">Your Service Listings ({listings.length})</h2>
          <span className="text-xs text-gray-400">Manage visibility and pricing</span>
        </div>

        {listingsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Palette className="mx-auto text-gray-300" size={40} />
            <h3 className="text-base font-bold text-gray-800">No listings yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              You haven&apos;t created any freelance listings yet. Click the button above to publish your first offer!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {listings.map((item) => {
              const isPaused = item.status === 'paused';

              return (
                <div
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border">
                      {item.imageUrls && item.imageUrls.length > 0 ? (
                        <img src={item.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                          {item.title[0]}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/listings/${item.slug}`}
                          className="font-bold text-gray-900 hover:text-primary-600 transition-colors line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                            isPaused ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatPrice(item.priceAmount)}</span>
                        <span>•</span>
                        <span>{item.deliveryDays}d delivery</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Star size={11} className="rating-star" />
                          {item.averageRating?.toFixed(1) || '5.0'} ({item.reviewCount || 0})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      to={`/listings/${item.slug}`}
                      className="p-2 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                      title="View Public Page"
                    >
                      <Eye size={18} />
                    </Link>

                    <button
                      onClick={() => togglePauseMutation.mutate({ id: item.id, isPaused })}
                      className="p-2 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-gray-100"
                      title={isPaused ? 'Activate Listing' : 'Pause Listing'}
                    >
                      {isPaused ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this listing?')) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100"
                      title="Delete Listing"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      {createModalOpen && (
        <div className="modal-overlay" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg">Create New Service Listing</h3>
              <button onClick={() => setCreateModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateSubmit} className="modal-body space-y-4">
              <div>
                <label className="label">Listing Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., I will build a full-stack Spring Boot and React application"
                  className="input text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="input text-sm"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Base Price ($ USD)</label>
                  <input
                    type="number"
                    min={5}
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(Number(e.target.value))}
                    className="input text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Delivery Time (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(Number(e.target.value))}
                    className="input text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="label">Revisions Included</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={revisionsIncluded}
                    onChange={(e) => setRevisionsIncluded(Number(e.target.value))}
                    className="input text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Skills / Tags (comma separated)</label>
                <input
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="React, TypeScript, Spring Boot, MySQL"
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label">Cover Image URL (optional)</label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label">Service Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe your workflow, deliverables, and requirements..."
                  className="input text-sm"
                  required
                />
              </div>

              <div className="modal-footer px-0 pb-0">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createListingMutation.isPending}
                  className="btn-primary btn-sm"
                >
                  {createListingMutation.isPending ? 'Publishing...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
