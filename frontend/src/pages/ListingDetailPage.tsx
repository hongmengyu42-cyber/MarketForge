import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsApi, reviewsApi, ordersApi, messagingApi } from '@/api';
import { useAuthStore, useUIStore } from '@/store';
import { formatPrice, formatDate, getInitials } from '@/utils';
import { Star, Clock, RefreshCw, CheckCircle, MessageSquare, ArrowLeft, Send, Trophy, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Listing, Review } from '@/types';
import StripeEscrowCheckoutModal from '@/components/modals/StripeEscrowCheckoutModal';

export default function ListingDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const { openModal } = useUIStore();

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Fetch listing details
  const { data: listingData, isLoading, isError } = useQuery({
    queryKey: ['listing', slug],
    queryFn: () => listingsApi.getBySlug(slug!),
    enabled: !!slug,
  });
  const listing: Listing | undefined = listingData?.data?.data;

  // Fetch reviews for listing
  const { data: reviewsData } = useQuery({
    queryKey: ['listing-reviews', listing?.id],
    queryFn: () => reviewsApi.getForListing(listing!.id),
    enabled: !!listing?.id,
  });
  const reviews: Review[] = reviewsData?.data?.data?.content || [];

  // Order mutation
  const orderMutation = useMutation({
    mutationFn: (listingId: number) => ordersApi.create({ listingId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order placed successfully!');
      const orderId = res.data?.data?.id;
      navigate(orderId ? `/orders` : '/orders');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to place order';
      toast.error(msg);
    },
  });

  // Message mutation
  const messageMutation = useMutation({
    mutationFn: (body: string) => messagingApi.startConversation({ listingId: listing!.id, body }),
    onSuccess: (res) => {
      toast.success('Message sent to seller!');
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

  const handleOrder = () => {
    if (!isAuthenticated) {
      openModal('auth');
      return;
    }
    if (user?.id === listing?.seller?.id) {
      toast.error('You cannot purchase your own service');
      return;
    }
    if (listing?.id) {
      setIsCheckoutOpen(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openModal('auth');
      return;
    }
    if (!messageBody.trim()) return;
    messageMutation.mutate(messageBody.trim());
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-1/4" />
        <div className="h-10 bg-gray-200 rounded w-2/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-80 bg-gray-200 rounded-2xl" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h2>
        <p className="text-gray-600 mb-6">The service listing you are looking for might have been removed or is unavailable.</p>
        <Link to="/explore" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/explore" className="hover:text-primary-600">Explore</Link>
        <span>/</span>
        <span className="text-gray-700">{listing.category?.name || 'Services'}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{listing.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details, Images, Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight">
              {listing.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <Link to={`/sellers/${listing.seller?.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="avatar w-8 h-8 text-xs font-semibold">
                  {getInitials(listing.seller?.displayName || listing.seller?.name || 'S')}
                </div>
                <span className="font-semibold text-gray-900 hover:text-primary-600">
                  {listing.seller?.displayName || listing.seller?.name}
                </span>
                {listing.seller?.isTopRated && (
                  <span className="font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-xs border border-amber-300">
                    <Trophy size={10} className="fill-amber-950" /> Top Rated
                  </span>
                )}
              </Link>

              <div className="flex items-center gap-1">
                <Star size={16} className="rating-star" />
                <span className="font-bold text-gray-900">
                  {listing.averageRating ? listing.averageRating.toFixed(1) : 'New'}
                </span>
                <span className="text-gray-400">({listing.reviewCount || 0} reviews)</span>
              </div>

              <div className="text-gray-400">•</div>
              <span>{listing.completedOrdersCount || 0} orders completed</span>
            </div>
          </div>

          {/* Image Showcase */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
            {listing.imageUrls && listing.imageUrls.length > 0 ? (
              <img
                src={listing.imageUrls[0]}
                alt={listing.title}
                className="w-full h-80 sm:h-96 object-cover"
              />
            ) : (
              <div className="w-full h-80 sm:h-96 flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 text-primary-400">
                <span className="text-6xl font-bold mb-2">{listing.title[0]}</span>
                <span className="text-sm font-medium text-primary-600">MarketForge Verified Service</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3">About This Service</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
              {listing.description || 'No detailed description provided by the seller.'}
            </div>
          </div>

          {/* Skills / Tags */}
          {listing.skills && listing.skills.length > 0 && (
            <div className="card p-6 space-y-3">
              <h2 className="text-lg font-bold text-gray-900">Relevant Skills & Technologies</h2>
              <div className="flex flex-wrap gap-2">
                {listing.skills.map((skill, idx) => (
                  <span key={idx} className="badge-blue px-3 py-1 rounded-full text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Seller Bio Card */}
          <div className="card p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
            <Link to={`/sellers/${listing.seller?.id}`} className="flex gap-4 items-center group">
              <div className="avatar w-14 h-14 text-base font-bold group-hover:ring-2 ring-primary-500 transition-all">
                {getInitials(listing.seller?.displayName || listing.seller?.name || 'S')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {listing.seller?.displayName || listing.seller?.name}
                  </h3>
                  {listing.seller?.isTopRated && (
                    <span className="font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-xs border border-amber-300">
                      <Trophy size={10} className="fill-amber-950" /> Top Rated
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">Professional Freelancer</p>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Star size={13} className="rating-star" />
                  <span className="font-semibold">{listing.seller?.averageRating?.toFixed(1) || '5.0'}</span>
                  <span>({listing.seller?.reviewCount || 0} reviews)</span>
                </div>
              </div>
            </Link>

            <button
              onClick={() => setMessageOpen(!messageOpen)}
              className="btn-secondary text-sm flex items-center gap-2 self-stretch sm:self-auto justify-center"
            >
              <MessageSquare size={16} /> Contact Seller
            </button>
          </div>

          {/* Quick Message Box */}
          {messageOpen && (
            <form onSubmit={handleSendMessage} className="card p-5 space-y-3 border-primary-200 bg-primary-50/30">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-primary-600" />
                Send a direct message to {listing.seller?.displayName || listing.seller?.name}
              </h3>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={3}
                placeholder="Ask about project requirements, timeline, or custom offer requests..."
                className="input text-sm bg-white"
                required
              />
              <div className="flex justify-end gap-2">
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
                  className="btn-primary btn-sm flex items-center gap-1"
                >
                  <Send size={14} />
                  {messageMutation.isPending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          )}

          {/* Reviews Section */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Customer Reviews ({reviews.length})
              </h2>
              <div className="flex items-center gap-1">
                <Star size={16} className="rating-star" />
                <span className="font-bold text-gray-900">
                  {listing.averageRating ? listing.averageRating.toFixed(1) : '5.0'}
                </span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No reviews yet. Be the first to order and review this service!
              </p>
            ) : (
              <div className="space-y-6 divide-y divide-gray-100">
                {reviews.map((rev) => (
                  <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="avatar w-7 h-7 text-[10px]">
                          {getInitials(rev.reviewer?.name || 'U')}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{rev.reviewer?.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(rev.createdAt)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            className={i < rev.rating ? 'rating-star' : 'text-gray-300'}
                            fill={i < rev.rating ? 'currentColor' : 'none'}
                          />
                        ))}
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

                    <p className="text-sm text-gray-700">{rev.comment}</p>

                    {rev.sellerResponse && (
                      <div className="bg-gray-50 border-l-2 border-primary-500 pl-3 py-2 mt-2 rounded-r">
                        <p className="text-xs font-semibold text-gray-800">Seller Response:</p>
                        <p className="text-xs text-gray-600 mt-0.5">{rev.sellerResponse}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Column: Purchase Box */}
        <div>
          <div className="sticky top-24 card p-6 space-y-6 shadow-md border-gray-200">
            <div className="flex items-baseline justify-between border-b pb-4">
              <span className="text-sm text-gray-500">Service Fee</span>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-gray-900">
                  {formatPrice(listing.priceAmount, listing.currency)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary-600" />
                <span className="font-medium text-gray-900">{listing.deliveryDays} Days Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-primary-600" />
                <span>{listing.revisionsIncluded} Revisions Included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>Protected by MarketForge Escrow Guarantee</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleOrder}
                disabled={orderMutation.isPending}
                className="btn-primary w-full py-3.5 text-base font-semibold shadow-lg shadow-primary-500/20"
              >
                {orderMutation.isPending ? 'Processing Order...' : 'Order Now'}
              </button>

              <button
                onClick={() => setMessageOpen(true)}
                className="btn-secondary w-full py-2.5 text-sm"
              >
                Inquire & Custom Request
              </button>
            </div>

            <div className="pt-4 border-t text-xs text-gray-400 space-y-1">
              <p>• Funds held in secure escrow until you confirm delivery</p>
              <p>• Full refund policy with transparent dispute arbitration</p>
            </div>
          </div>
        </div>
      </div>

      {listing && (
        <StripeEscrowCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          listingId={listing.id}
          title={listing.title}
          amount={listing.priceAmount / 100}
          currency={listing.currency}
        />
      )}
    </div>
  );
}
