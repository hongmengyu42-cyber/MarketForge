import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { sellerApi, messagingApi, portfolioApi, assessmentsApi, reviewsApi } from '@/api';
import { useAuthStore, useUIStore } from '@/store';
import { formatPrice, formatDate, getInitials, getMediaUrl } from '@/utils';
import {
  Star,
  Clock,
  CheckCircle,
  MessageSquare,
  Shield,
  Layers,
  Send,
  X,
  ArrowLeft,
  Eye,
  Award,
  ExternalLink,
  Briefcase,
  Trophy,
  CheckCircle2,
  Calendar,
  ThumbsUp,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Listing, PortfolioItem, UserSkillBadge, Review as ReviewType, SellerReputation } from '@/types';
import ProfilePictureViewerModal from '@/components/modals/ProfilePictureViewerModal';

interface PublicSellerData {
  id: number;
  userId?: number;
  name: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  averageRating: number;
  avgQualityRating?: number;
  avgCommunicationRating?: number;
  avgDeadlineRating?: number;
  recommendationRate?: number;
  isTopRated?: boolean;
  reviewCount: number;
  completedOrdersCount: number;
  hourlyRate?: number;
  createdAt?: string;
  listings: Listing[];
}

export default function PublicSellerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const sellerId = Number(id);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { openModal } = useUIStore();

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioItem | null>(null);

  // Fetch public seller details
  const { data: sellerData, isLoading, isError } = useQuery({
    queryKey: ['public-seller', sellerId],
    queryFn: () => sellerApi.getPublic(sellerId),
    enabled: !isNaN(sellerId),
  });
  const seller: PublicSellerData | undefined = sellerData?.data?.data;
  const targetUserId = seller?.userId || seller?.id;

  // Fetch portfolio items for this seller
  const { data: portfolioResp } = useQuery({
    queryKey: ['seller-portfolio', targetUserId],
    queryFn: () => portfolioApi.getForUser(targetUserId!),
    enabled: targetUserId != null,
  });
  const portfolioItems: PortfolioItem[] = portfolioResp?.data?.data || [];

  // Fetch verified badges for this seller
  const { data: badgesResp } = useQuery({
    queryKey: ['seller-badges', targetUserId],
    queryFn: () => assessmentsApi.getUserBadges(targetUserId!),
    enabled: targetUserId != null,
  });
  const badges: UserSkillBadge[] = badgesResp?.data?.data || [];

  // Fetch seller double-blind reputation & verified reviews
  const { data: repData } = useQuery({
    queryKey: ['seller-reputation', targetUserId],
    queryFn: () => reviewsApi.getSellerReputation(targetUserId!),
    enabled: targetUserId != null,
  });
  const reputation = repData?.data?.data as SellerReputation | undefined;

  const { data: reviewsData } = useQuery({
    queryKey: ['seller-reviews', targetUserId],
    queryFn: () => reviewsApi.getForSeller(targetUserId!),
    enabled: targetUserId != null,
  });
  const reviewsList = (reviewsData?.data?.data?.content || []) as ReviewType[];

  // Messaging mutation
  const messageMutation = useMutation({
    mutationFn: (body: string) => {
      const firstListingId = seller?.listings && seller.listings.length > 0 ? seller.listings[0].id : undefined;
      return messagingApi.startConversation({
        sellerId: seller?.id,
        listingId: firstListingId,
        body
      });
    },
    onSuccess: (res) => {
      toast.success('Inquiry sent to freelancer!');
      setMessageBody('');
      setMessageOpen(false);
      const convId = res.data?.data?.id;
      if (convId) {
        navigate(`/messages?conversationId=${convId}`);
      } else {
        navigate('/messages');
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send message';
      toast.error(msg);
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openModal('auth');
      return;
    }
    if (user?.id === seller?.id) {
      toast.error('You cannot message yourself');
      return;
    }
    if (!messageBody.trim()) return;
    messageMutation.mutate(messageBody.trim());
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-48 bg-gray-200 rounded-3xl" />
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-gray-200 rounded-2xl" />
          <div className="h-40 bg-gray-200 rounded-2xl" />
          <div className="h-40 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !seller) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Freelancer Profile Not Found</h2>
        <p className="text-sm text-gray-500">
          The seller profile you are looking for does not exist or may have been deactivated.
        </p>
        <Link to="/explore" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Freelancer Hero Card */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-sm">
        {/* Banner */}
        <div className="h-44 sm:h-52 bg-gradient-to-r from-primary-700 via-primary-800 to-indigo-900 relative">
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Content */}
        <div className="px-6 sm:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            <div className="relative group">
              <div
                onClick={() => setIsAvatarViewerOpen(true)}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl ring-4 ring-white shadow-xl overflow-hidden bg-white flex items-center justify-center cursor-pointer relative"
                title="Click to view profile picture"
              >
                {seller.avatarUrl && !avatarLoadError ? (
                  <img
                    src={getMediaUrl(seller.avatarUrl)}
                    alt={seller.displayName}
                    onError={() => setAvatarLoadError(true)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-600 to-indigo-700 text-white flex items-center justify-center text-3xl font-black">
                    {getInitials(seller.displayName || seller.name)}
                  </div>
                )}
                {/* Hover View Overlay */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1px]">
                  <Eye size={24} className="drop-shadow" />
                  <span className="text-xs font-semibold drop-shadow">View Photo</span>
                </div>
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full ring-2 ring-white" />
            </div>

            <button
              onClick={() => setMessageOpen(true)}
              className="btn-primary flex items-center gap-2 self-start sm:self-auto py-2.5 px-6 shadow-md"
            >
              <MessageSquare size={16} /> Contact Freelancer
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{seller.displayName}</h1>
              {(reputation?.isTopRated || seller.isTopRated) && (
                <span className="font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-amber-950 shadow-xs border border-amber-300/80">
                  <Trophy size={13} className="text-amber-950 fill-amber-950" />
                  <span>Top Rated Freelancer</span>
                </span>
              )}
              <span className="badge-blue font-semibold text-xs px-2.5 py-0.5 rounded-full">
                Freelancer Pro
              </span>
              <span className="badge-green font-semibold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle size={12} /> ID Verified
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 pt-1">
              <div className="flex items-center gap-1.5">
                <Star size={16} className="rating-star" />
                <span className="font-bold text-gray-900">
                  {(reputation?.averageRating ?? seller.averageRating)?.toFixed(1) || '5.0'}
                </span>
                <span className="text-gray-400">({reputation?.reviewCount ?? seller.reviewCount ?? 0} reviews)</span>
              </div>

              {(reputation?.recommendationRate != null || seller.recommendationRate != null) && (
                <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 font-semibold text-xs">
                  <ThumbsUp size={12} />
                  <span>{reputation?.recommendationRate ?? seller.recommendationRate}% Recommended</span>
                </div>
              )}

              <div>
                <span className="font-bold text-gray-900">{seller.completedOrdersCount || 0}</span> orders completed
              </div>

              {seller.hourlyRate && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Rate:</span>
                  <span className="font-bold text-gray-900">${seller.hourlyRate}/hr</span>
                </div>
              )}

              {seller.createdAt && (
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={14} /> Member since {formatDate(seller.createdAt)}
                </div>
              )}
            </div>

            {/* Bio */}
            {seller.bio && (
              <div className="pt-2 text-sm text-gray-700 leading-relaxed max-w-3xl whitespace-pre-line">
                {seller.bio}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──── VERIFIED SKILL BADGES ──── */}
      {badges.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="text-amber-500 w-5 h-5" />
                Verified Skill Credentials ({badges.length})
              </h2>
              <p className="text-xs text-gray-500">
                Certified through MarketForge standardized technical examinations.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Proctored & Tested
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {badges.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-emerald-50/40 border border-amber-200/80 flex items-center gap-3.5 shadow-xs"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-sm truncate">{b.skillName}</h4>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.2 rounded-full border border-amber-200">
                      {b.badgeLevel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Score: <strong className="text-emerald-700 font-bold">{b.score}%</strong> • Verified Pro
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── FEATURED PORTFOLIO & CASE STUDIES ──── */}
      {portfolioItems.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="text-primary-600 w-5 h-5" />
                Portfolio & Case Studies ({portfolioItems.length})
              </h2>
              <p className="text-xs text-gray-500">
                Real client work, architecture diagrams, and delivered solutions.
              </p>
            </div>
            <span className="text-xs text-gray-500 font-medium">Click any project to inspect</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolioItems.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPortfolio(p)}
                className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="h-48 bg-gray-100 overflow-hidden relative">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary-50 flex items-center justify-center text-primary-300 font-bold text-3xl">
                        {p.title[0]}
                      </div>
                    )}
                    {p.completionDate && (
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {p.completionDate}
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-2.5">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Skills pills */}
                    {p.skills && p.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {p.skills.slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md"
                          >
                            {s}
                          </span>
                        ))}
                        {p.skills.length > 3 && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            +{p.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-gray-50/75 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-primary-600">
                  <span>View Project Case Study</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="text-primary-600" />
            Services by {seller.displayName} ({seller.listings?.length || 0})
          </h2>
          <span className="text-xs text-gray-500">Fixed-price escrow packages</span>
        </div>

        {seller.listings && seller.listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {seller.listings.map((item) => (
              <Link
                key={item.id}
                to={`/listings/${item.slug}`}
                className="card-hover group overflow-hidden border border-gray-200"
              >
                <div className="h-44 bg-gray-100 overflow-hidden relative">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <img
                      src={item.imageUrls[0]}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary-300 bg-primary-50">
                      {item.title[0]}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 line-clamp-2 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Star size={13} className="rating-star" />
                    <span className="font-bold">{item.averageRating?.toFixed(1) || '5.0'}</span>
                    <span className="text-gray-400">({item.reviewCount || 0})</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock size={12} /> {item.deliveryDays}d delivery
                    </span>
                    <span className="text-base font-extrabold text-gray-900">
                      {formatPrice(item.priceAmount)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-gray-400">
            This seller does not have any active public listings at this time.
          </div>
        )}
      </div>

      {/* ──── VERIFIED CLIENT REVIEWS & DOUBLE-BLIND REPUTATION SCORECARD ──── */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-500 w-5 h-5" />
              Verified Client Reviews & Reputation ({reputation?.reviewCount ?? reviewsList.length})
            </h2>
            <p className="text-xs text-gray-500">
              Evaluated via MarketForge's Double-Blind Feedback Protocol for authentic ratings without retaliation.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5 self-start sm:self-auto">
            <Lock size={12} /> Double-Blind Verified
          </span>
        </div>

        {/* Reputation Scorecard Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-primary-50/20 border border-gray-200/70">
          {/* Overall Score */}
          <div className="text-center md:border-r border-gray-200/80 pr-4 flex flex-col items-center justify-center space-y-2">
            <span className="text-4xl font-extrabold text-gray-900">
              {(reputation?.averageRating ?? seller.averageRating)?.toFixed(1) || '5.0'}
            </span>
            <div className="flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={18}
                  className={star <= Math.round(reputation?.averageRating ?? seller.averageRating ?? 5) ? 'fill-amber-500' : 'text-gray-300'}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Based on {reputation?.reviewCount ?? reviewsList.length} completed contracts
            </p>
            {(reputation?.recommendationRate != null || seller.recommendationRate != null) && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ThumbsUp size={11} /> {reputation?.recommendationRate ?? seller.recommendationRate}% would recommend
              </span>
            )}
          </div>

          {/* Category Dimensions */}
          <div className="space-y-3.5 md:border-r border-gray-200/80 px-2 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Performance Dimensions
            </h4>

            {/* Quality */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Quality of Delivery</span>
                <span className="font-bold text-gray-900">{(reputation?.avgQualityRating || 5.0).toFixed(1)} / 5.0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${((reputation?.avgQualityRating || 5.0) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Communication */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Communication</span>
                <span className="font-bold text-gray-900">{(reputation?.avgCommunicationRating || 5.0).toFixed(1)} / 5.0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${((reputation?.avgCommunicationRating || 5.0) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Deadlines */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">On-Time Milestones</span>
                <span className="font-bold text-gray-900">{(reputation?.avgDeadlineRating || 5.0).toFixed(1)} / 5.0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${((reputation?.avgDeadlineRating || 5.0) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Star Distribution */}
          <div className="space-y-2 pl-2 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Rating Distribution
            </h4>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reputation?.ratingDistribution ? reputation.ratingDistribution[star] || 0 : 0;
              const total = reputation?.reviewCount || 1;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-6 font-semibold">{star} ★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[11px] text-gray-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        {reviewsList.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No public reviews yet. Once orders are completed and double-blind feedback is submitted, verified client testimonials will appear here.
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-gray-100">
            {reviewsList.map((rev) => (
              <div key={rev.id} className="pt-4 first:pt-0 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                      {getInitials(rev.reviewerName || rev.reviewer?.name || 'Client')}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {rev.reviewerName || rev.reviewer?.name || 'Verified Client'}
                      </p>
                      {rev.listingTitle && (
                        <p className="text-[10px] text-gray-500 truncate max-w-xs">{rev.listingTitle}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {formatDate(rev.revealedAt || rev.createdAt)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                      />
                    ))}
                    <span className="text-xs font-bold text-gray-900 ml-1">{rev.rating}.0</span>
                  </div>

                  {rev.qualityRating && (
                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                      Quality: {rev.qualityRating}★
                    </span>
                  )}
                  {rev.communicationRating && (
                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                      Communication: {rev.communicationRating}★
                    </span>
                  )}
                  {rev.deadlineRating && (
                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                      On-Time: {rev.deadlineRating}★
                    </span>
                  )}
                  {rev.wouldRecommend && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <ThumbsUp size={10} /> Recommends
                    </span>
                  )}
                </div>

                {rev.comment && (
                  <p className="text-xs text-gray-700 italic bg-gray-50/80 p-3.5 rounded-xl border border-gray-100/80">
                    "{rev.comment}"
                  </p>
                )}

                {rev.sellerResponse && (
                  <div className="bg-primary-50/60 p-3 rounded-xl border border-primary-100 text-xs ml-4">
                    <span className="font-bold text-primary-900 block mb-0.5">
                      Response from {seller.displayName}:
                    </span>
                    <p className="text-primary-800 italic">"{rev.sellerResponse}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="card p-6 bg-gray-50 border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-primary-600 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-gray-900 text-sm">MarketForge Escrow Protection</p>
            <p className="text-gray-500">Your payments are held in escrow until you approve the delivered work.</p>
          </div>
        </div>

        <button
          onClick={() => setMessageOpen(true)}
          className="btn-secondary btn-sm flex-shrink-0"
        >
          Message Freelancer
        </button>
      </div>

      {/* Message Modal */}
      {messageOpen && (
        <div className="modal-overlay" onClick={() => setMessageOpen(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-base flex items-center gap-2">
                <MessageSquare size={18} className="text-primary-600" />
                Message {seller.displayName}
              </h3>
              <button onClick={() => setMessageOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSendMessage} className="modal-body space-y-4">
              <div>
                <label className="label">Project Scope & Requirements</label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={4}
                  placeholder="Introduce yourself and describe your project goals, deadlines, and budget..."
                  className="input text-sm"
                  required
                />
              </div>

              <div className="modal-footer px-0 pb-0">
                <button
                  type="button"
                  onClick={() => setMessageOpen(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={messageMutation.isPending}
                  className="btn-primary btn-sm flex items-center gap-1.5"
                >
                  <Send size={14} />
                  {messageMutation.isPending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── Portfolio Project Details Lightbox Modal ──── */}
      {selectedPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-gray-100 flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-gray-900 text-base">{selectedPortfolio.title}</h3>
              </div>
              <button
                onClick={() => setSelectedPortfolio(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Screenshots gallery */}
              {selectedPortfolio.imageUrls && selectedPortfolio.imageUrls.length > 0 ? (
                <div className="space-y-3">
                  <div className="rounded-2xl overflow-hidden border border-gray-200 h-64 sm:h-80 bg-gray-100">
                    <img
                      src={selectedPortfolio.imageUrls[0]}
                      alt={selectedPortfolio.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {selectedPortfolio.imageUrls.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedPortfolio.imageUrls.slice(1).map((img, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 h-24 bg-gray-100">
                          <img src={img} alt="Screenshot" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedPortfolio.thumbnailUrl ? (
                <div className="rounded-2xl overflow-hidden border border-gray-200 h-64 bg-gray-100">
                  <img
                    src={selectedPortfolio.thumbnailUrl}
                    alt={selectedPortfolio.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              {/* Case Study Details */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-400">
                    Completed: {selectedPortfolio.completionDate || 'Recent'}
                  </span>
                  {selectedPortfolio.projectUrl && (
                    <a
                      href={selectedPortfolio.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-100"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Visit Live Demonstration
                    </a>
                  )}
                </div>

                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Project Challenge & Solution</h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {selectedPortfolio.description}
                </p>
              </div>

              {/* Skills utilized */}
              {selectedPortfolio.skills && selectedPortfolio.skills.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Technologies & Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPortfolio.skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-800"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPortfolio(null)}
                className="btn-secondary btn-sm"
              >
                Close Case Study
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Picture Fullscreen Viewer Modal */}
      <ProfilePictureViewerModal
        isOpen={isAvatarViewerOpen}
        onClose={() => setIsAvatarViewerOpen(false)}
        imageUrl={getMediaUrl(seller?.avatarUrl)}
        userName={seller?.displayName || seller?.name || 'Freelancer'}
        userRole="Freelancer Pro"
        isOwnProfile={user?.id === seller?.id}
      />
    </div>
  );
}
