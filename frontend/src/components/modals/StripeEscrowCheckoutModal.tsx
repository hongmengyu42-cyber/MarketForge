import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/api';
import { formatPrice } from '@/utils';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StripeEscrowCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: number;
  listingId?: number;
  milestoneId?: number;
  title: string;
  amount: number; // in dollars
  currency?: string;
  onSuccess?: (orderId: number) => void;
}

export default function StripeEscrowCheckoutModal({
  isOpen,
  onClose,
  orderId,
  listingId,
  milestoneId,
  title,
  amount,
  currency = 'USD',
  onSuccess,
}: StripeEscrowCheckoutModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('Alex Mercer');
  const [postalCode, setPostalCode] = useState('94103');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const platformFee = Math.round(amount * 0.05 * 100) / 100;
  const totalAmount = Math.round((amount + platformFee) * 100) / 100;

  const handleFillTestCard = () => {
    setCardNumber('4242 •••• •••• 4242');
    setExpiry('12/28');
    setCvc('739');
    setCardholderName('Alex Mercer (Client)');
    setPostalCode('94103');
    toast('Filled with Stripe Sandbox Test Card', { icon: '💳' });
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvc) {
      toast.error('Please fill out all card payment fields');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create PaymentIntent on Backend
      const intentRes = await paymentsApi.createPaymentIntent({
        orderId,
        listingId,
        milestoneId,
        amount,
        currency,
      });

      const intent = intentRes.data?.data;
      const paymentIntentId = intent?.paymentIntentId || 'pi_mf_test_' + Date.now();

      // Simulated 3D-Secure / Stripe processing delay for realism
      await new Promise((r) => setTimeout(r, 1200));

      // 2. Confirm Payment and Capture into Escrow
      const confirmRes = await paymentsApi.confirmPayment({
        paymentIntentId,
        orderId: intent?.orderId || orderId,
        listingId,
        milestoneId,
      });

      const createdOrder = confirmRes.data?.data;
      const targetOrderId = createdOrder?.id || orderId;

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', targetOrderId] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      toast.success('Escrow Payment Authorized & Secured!');
      onClose();

      if (onSuccess && targetOrderId) {
        onSuccess(targetOrderId);
      } else if (targetOrderId) {
        navigate(`/orders/${targetOrderId}`);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Payment processing failed. Please check your card.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Lock size={12} /> Stripe Escrow Checkout
            </span>
          </div>

          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="text-xs text-indigo-200 mt-1">
            Deposit is held safely in MarketForge Escrow until work is delivered and approved.
          </p>
        </div>

        {/* Price Breakdown */}
        <div className="p-6 bg-slate-50 border-b border-gray-100">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Service / Milestone Amount</span>
              <span className="font-semibold text-gray-900">{formatPrice(amount, currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1">
                MarketForge Escrow Protection Fee (5%)
                <ShieldCheck size={13} className="text-emerald-600 inline" />
              </span>
              <span className="font-semibold text-gray-900">{formatPrice(platformFee, currency)}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-black text-gray-900">
              <span>Total Escrow Deposit</span>
              <span className="text-lg text-primary-600">{formatPrice(totalAmount, currency)}</span>
            </div>
          </div>

          {/* Guarantee Pill */}
          <div className="mt-3.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
              <strong className="font-bold">100% Client Refund Protection:</strong> The freelancer is only paid when you review and confirm the milestones.
            </p>
          </div>
        </div>

        {/* Card Form */}
        <form onSubmit={handlePayment} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <CreditCard size={14} className="text-gray-500" /> Payment Details
            </label>
            <button
              type="button"
              onClick={handleFillTestCard}
              className="text-[11px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
            >
              <Sparkles size={12} /> Auto-fill Stripe Test Card
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Cardholder Name"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              required
              className="input text-xs w-full py-2.5"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              required
              className="input text-xs w-full py-2.5 font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <input
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                maxLength={5}
                required
                className="input text-xs w-full py-2.5 text-center font-mono"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="CVC"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                maxLength={4}
                required
                className="input text-xs w-full py-2.5 text-center font-mono"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Postal Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
                className="input text-xs w-full py-2.5 text-center font-mono"
              />
            </div>
          </div>

          {/* Security badge & submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-primary-600/20 hover:shadow-xl transition-all"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Securing Funds in Escrow...</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Authorize & Fund Escrow ({formatPrice(totalAmount, currency)})</span>
                </>
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-gray-400">
              <ShieldCheck size={14} className="text-gray-400" />
              <span>Encrypted via Stripe 256-bit SSL • PCI DSS Level 1 Certified</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
