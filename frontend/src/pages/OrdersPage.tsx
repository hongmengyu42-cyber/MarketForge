import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, reviewsApi, disputesApi } from '@/api';
import { formatPrice, formatDate, getStatusColor, getInitials } from '@/utils';
import {
  ShoppingBag,
  Clock,
  AlertTriangle,
  Star,
  Upload,
  X,
  PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Order } from '@/types';

export default function OrdersPage() {
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const queryClient = useQueryClient();

  // Modals state
  const [deliverModalOrder, setDeliverModalOrder] = useState<Order | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliverySourceUrl, setDeliverySourceUrl] = useState('');

  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [disputeModalOrder, setDisputeModalOrder] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState('non_delivery');
  const [disputeDescription, setDisputeDescription] = useState('');

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', role],
    queryFn: () => ordersApi.getAll({ role }),
  });
  const orders: Order[] = ordersData?.data?.data?.content || [];

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: (id: number) => ordersApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order delivery confirmed! Funds released to seller.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to confirm order';
      toast.error(msg);
    },
  });

  const deliverMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { notes?: string; sourceUrl?: string } }) =>
      ordersApi.deliver(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Work delivered to buyer!');
      setDeliverModalOrder(null);
      setDeliveryNotes('');
      setDeliverySourceUrl('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to deliver work';
      toast.error(msg);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ orderId, rating, comment }: { orderId: number; rating: number; comment?: string }) =>
      reviewsApi.create({ orderId, rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Thank you for leaving a review!');
      setReviewModalOrder(null);
      setReviewComment('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit review';
      toast.error(msg);
    },
  });

  const disputeMutation = useMutation({
    mutationFn: ({ orderId, reason, description }: { orderId: number; reason: string; description?: string }) =>
      disputesApi.create({ orderId, reason, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Dispute submitted. MarketForge arbitration team has been notified.');
      setDisputeModalOrder(null);
      setDisputeDescription('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit dispute';
      toast.error(msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel order';
      toast.error(msg);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-primary-600" /> Order Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track active deliverables, confirm completions, and manage payments with escrow protection.
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="inline-flex p-1 bg-gray-200 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setRole('buyer')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              role === 'buyer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Purchases (Buyer)
          </button>
          <button
            onClick={() => setRole('seller')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              role === 'seller' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Client Orders (Seller)
          </button>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-6 bg-gray-200 rounded w-20" />
              </div>
              <div className="h-12 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center max-w-lg mx-auto my-12 space-y-4">
          <ShoppingBag className="mx-auto text-gray-300" size={48} />
          <h3 className="text-lg font-bold text-gray-900">No {role} orders found</h3>
          <p className="text-sm text-gray-500">
            {role === 'buyer'
              ? 'You have not placed any orders yet. Browse services to find talented freelancers!'
              : 'You do not have any incoming orders yet. Publish or share your listings to get started!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isDelivered = order.status === 'delivered';
            const isConfirmed = order.status === 'confirmed' || order.status === 'released' || order.status === 'paid_out';
            const canDeliver = role === 'seller' && (order.status === 'in_progress' || order.status === 'authorized');
            const canConfirm = role === 'buyer' && isDelivered;
            const canCancel = (order.status === 'pending_payment' || order.status === 'in_progress');

            return (
              <div key={order.id} className="card p-5 sm:p-6 transition-all border hover:border-gray-300 space-y-4">
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-1 bg-gray-100 rounded text-gray-700">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={12} /> Placed {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`badge ${getStatusColor(order.status)} font-semibold text-xs uppercase px-2.5 py-0.5 rounded-full`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Content row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* Listing & Counterparty */}
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="text-base font-bold text-gray-900 hover:text-primary-600 transition-colors">
                      <Link to={`/orders/${order.id}`}>
                        {order.listing?.title || 'Custom Project Delivery'}
                      </Link>
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">{role === 'buyer' ? 'Seller:' : 'Buyer:'}</span>
                        <div className="avatar w-5 h-5 text-[9px]">
                          {getInitials(role === 'buyer' ? order.seller?.name || 'S' : order.buyer?.name || 'B')}
                        </div>
                        <span className="font-semibold text-gray-800">
                          {role === 'buyer' ? order.seller?.name : order.buyer?.name}
                        </span>
                      </div>

                      {order.expectedDeliveryAt && (
                        <div>
                          Due by: <span className="font-medium text-gray-700">{formatDate(order.expectedDeliveryAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial amounts */}
                  <div className="md:text-right space-y-1">
                    <div className="text-xs text-gray-400">Total Escrow Amount</div>
                    <div className="text-xl font-extrabold text-gray-900">
                      {formatPrice(order.amountTotal, order.currency)}
                    </div>
                    {role === 'seller' && (
                      <div className="text-xs text-green-600 font-medium">
                        Payout: {formatPrice(order.sellerPayoutAmount, order.currency)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t">
                  <Link
                    to={`/orders/${order.id}`}
                    className="btn-secondary btn-sm flex items-center gap-1.5 text-primary-600 border-primary-200 hover:bg-primary-50"
                  >
                    <span>Open Order Room</span> &rarr;
                  </Link>
                  {canDeliver && (
                    <button
                      onClick={() => setDeliverModalOrder(order)}
                      className="btn-primary btn-sm flex items-center gap-1.5"
                    >
                      <Upload size={14} /> Deliver Finished Work
                    </button>
                  )}

                  {canConfirm && (
                    <>
                      <button
                        onClick={() => confirmMutation.mutate(order.id)}
                        disabled={confirmMutation.isPending}
                        className="btn-primary btn-sm flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <PackageCheck size={14} /> Confirm & Release Funds
                      </button>
                      <button
                        onClick={() => setDisputeModalOrder(order)}
                        className="btn-secondary btn-sm text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <AlertTriangle size={14} /> Open Dispute
                      </button>
                    </>
                  )}

                  {isConfirmed && role === 'buyer' && (
                    <button
                      onClick={() => setReviewModalOrder(order)}
                      className="btn-secondary btn-sm flex items-center gap-1.5 text-amber-600 hover:bg-amber-50"
                    >
                      <Star size={14} /> Review Seller
                    </button>
                  )}

                  {canCancel && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this order?')) {
                          cancelMutation.mutate(order.id);
                        }
                      }}
                      disabled={cancelMutation.isPending}
                      className="btn-secondary btn-sm text-gray-500 hover:text-red-600"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deliver Modal */}
      {deliverModalOrder && (
        <div className="modal-overlay" onClick={() => setDeliverModalOrder(null)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg">Deliver Work for #{deliverModalOrder.orderNumber}</h3>
              <button onClick={() => setDeliverModalOrder(null)}><X size={20} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">Delivery Description / Release Notes</label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={4}
                  placeholder="Detail your work, instructions, and list deliverables..."
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="label">Deliverable URL (GitHub repo, Google Drive, Figma, Zip link)</label>
                <input
                  value={deliverySourceUrl}
                  onChange={(e) => setDeliverySourceUrl(e.target.value)}
                  placeholder="https://github.com/... or https://drive.google.com/..."
                  className="input text-sm"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeliverModalOrder(null)} className="btn-secondary btn-sm">Cancel</button>
              <button
                onClick={() => deliverMutation.mutate({
                  id: deliverModalOrder.id,
                  data: { notes: deliveryNotes, sourceUrl: deliverySourceUrl }
                })}
                disabled={deliverMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1"
              >
                <Upload size={14} /> Submit Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOrder && (
        <div className="modal-overlay" onClick={() => setReviewModalOrder(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg">Review Your Experience</h3>
              <button onClick={() => setReviewModalOrder(null)}><X size={20} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={24}
                        className={star <= reviewRating ? 'rating-star' : 'text-gray-300'}
                        fill={star <= reviewRating ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-gray-700 ml-2">{reviewRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="label">Feedback Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder="Share details of what you liked or how the seller performed..."
                  className="input text-sm"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setReviewModalOrder(null)} className="btn-secondary btn-sm">Cancel</button>
              <button
                onClick={() => reviewMutation.mutate({
                  orderId: reviewModalOrder.id,
                  rating: reviewRating,
                  comment: reviewComment
                })}
                disabled={reviewMutation.isPending}
                className="btn-primary btn-sm"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOrder && (
        <div className="modal-overlay" onClick={() => setDisputeModalOrder(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-red-600 flex items-center gap-2">
                <AlertTriangle size={20} /> Open Dispute for Order #{disputeModalOrder.orderNumber}
              </h3>
              <button onClick={() => setDisputeModalOrder(null)}><X size={20} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">Reason for Dispute</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="input text-sm"
                >
                  <option value="non_delivery">Delivered work does not match requirements</option>
                  <option value="poor_quality">Substandard or incomplete deliverable</option>
                  <option value="unresponsive">Seller unresponsive</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              <div>
                <label className="label">Detailed Explanation</label>
                <textarea
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  rows={4}
                  placeholder="Explain why the deliverable cannot be accepted..."
                  className="input text-sm"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDisputeModalOrder(null)} className="btn-secondary btn-sm">Cancel</button>
              <button
                onClick={() => disputeMutation.mutate({
                  orderId: disputeModalOrder.id,
                  reason: disputeReason,
                  description: disputeDescription
                })}
                disabled={disputeMutation.isPending || !disputeDescription.trim()}
                className="btn-primary btn-sm bg-red-600 hover:bg-red-700"
              >
                Submit for Arbitration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
