import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listingsApi } from '@/api';
import { formatPrice, getInitials } from '@/utils';
import { useUIStore } from '@/store';
import {
  Star,
  Zap,
  Check,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import type { Listing } from '@/types';
import EscrowDemoModal from '@/components/modals/EscrowDemoModal';

export default function HomePage() {
  const { openModal } = useUIStore();
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  // Fetch featured listings for the home page preview
  const { data: listingsData, isLoading: isLoadingListings } = useQuery({
    queryKey: ['home-featured-listings'],
    queryFn: () => listingsApi.getAll({ sort: 'rating', size: 4 }),
  });
  const listings: Listing[] = (listingsData?.data?.data?.content || listingsData?.data?.data || []).slice(0, 4);

  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════
           PREMIUM FULL-SCREEN HERO BANNER
           Full viewport height (100dvh - navbar) with centered layout,
           guaranteed 2-line headline, clean Get Started CTA, and pure CSS 3D Orb.
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem)] flex flex-col justify-between bg-white overflow-hidden relative">
        {/* Subtle full-width background gradient that bleeds edge-to-edge */}
        <div className="relative flex-1 flex items-center w-full">
          {/* Background decorative blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute -top-24 -left-24 w-96 h-96 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 65%)' }}
            />
            <div
              className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)' }}
            />
          </div>

          {/* Inner constrained grid */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 lg:py-12">
            <div className="grid lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_520px] gap-8 lg:gap-14 items-center">

              {/* ── LEFT: Copy Column ── */}
              <div className="space-y-6 max-w-2xl animate-fade-up">
                {/* Micro badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Next-Gen Smart Escrow Freelance Marketplace</span>
                </div>

                {/* Headline — STRICTLY 2 LINES */}
                <div className="space-y-1 sm:space-y-2">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] xl:text-[52px] font-black tracking-tight leading-[1.12] text-slate-900 sm:whitespace-nowrap">
                    Hire with Confidence.
                  </h1>
                  <h1
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] xl:text-[52px] font-black tracking-tight leading-[1.12] sm:whitespace-nowrap"
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
                <p className="text-slate-500 text-base sm:text-lg leading-[1.7] max-w-[520px]">
                  MarketForge auto-locks payments in smart escrow, releasing funds only when milestones are verified — so both sides win, every time.
                </p>

                {/* Redesigned Clean Action Buttons (Search moved to Services page) */}
                <div className="pt-2 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => openModal('auth')}
                    className="font-bold text-sm text-white px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 cursor-pointer flex items-center gap-2 group"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    }}
                  >
                    <span>Get Started</span>
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDemoOpen(true)}
                    className="font-semibold text-sm text-slate-700 bg-slate-100/90 hover:bg-slate-200/80 px-6 py-3.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 border border-slate-200/70"
                  >
                    <Zap size={15} className="text-indigo-600" />
                    <span>How Escrow Works</span>
                  </button>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-6 pt-3">
                  {[
                    { icon: <ShieldCheck size={16} className="text-emerald-500" />, label: '100% Escrow Protected' },
                    { icon: <Star size={15} className="text-amber-400 fill-amber-400" />, label: '4.9/5 avg rating' },
                    { icon: <Check size={15} className="text-indigo-600 font-bold" />, label: '2,800+ verified sellers' },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                      {t.icon}
                      <span>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── RIGHT: Pure CSS 3D Glass Orb ── */}
              <div className="relative flex items-center justify-center h-[380px] lg:h-[460px] select-none pointer-events-none">
                {/* Ambient circular glow behind the orb */}
                <div
                  className="absolute w-80 h-80 rounded-full animate-pulse-glow"
                  style={{
                    background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(139,92,246,0.14) 45%, transparent 70%)',
                  }}
                />

                {/* Outer ring 1 — slow spin */}
                <div
                  className="absolute w-[380px] h-[380px] rounded-full animate-orb-spin"
                  style={{
                    border: '1.5px solid rgba(99,102,241,0.18)',
                    boxShadow: 'inset 0 0 40px rgba(99,102,241,0.08)',
                  }}
                >
                  <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', boxShadow: '0 0 10px rgba(129,140,248,0.8)' }}
                  />
                </div>

                {/* Outer ring 2 — reverse spin, tilted */}
                <div
                  className="absolute w-[300px] h-[300px] rounded-full animate-orb-spin-rev"
                  style={{
                    border: '1px solid rgba(139,92,246,0.14)',
                    transform: 'rotate(45deg)',
                  }}
                >
                  <div
                    className="absolute bottom-1 right-1/2 translate-x-1/2 w-2 h-2 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8)', boxShadow: '0 0 8px rgba(96,165,250,0.8)' }}
                  />
                </div>

                {/* Core glass orb */}
                <div
                  className="relative w-52 h-52 rounded-full z-10"
                  style={{
                    background: `
                      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.92) 0%, transparent 42%),
                      radial-gradient(circle at 68% 72%, rgba(192,132,252,0.58) 0%, transparent 48%),
                      radial-gradient(circle at 50% 50%, rgba(99,102,241,0.78) 0%, rgba(139,92,246,0.62) 50%, rgba(59,130,246,0.58) 100%)
                    `,
                    boxShadow: `
                      inset 0 -22px 64px rgba(139,92,246,0.38),
                      inset 0 22px 44px rgba(255,255,255,0.70),
                      0 32px 84px rgba(99,102,241,0.32),
                      0 12px 32px rgba(139,92,246,0.22)
                    `,
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  {/* Specular highlight (white shine top-left) */}
                  <div
                    className="absolute top-6 left-7 w-14 h-10 rounded-full"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(255,255,255,0.92) 0%, transparent 70%)',
                      filter: 'blur(6px)',
                      transform: 'rotate(-20deg)',
                    }}
                  />
                  {/* Secondary highlight bottom-right */}
                  <div
                    className="absolute bottom-7 right-8 w-8 h-6 rounded-full"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(255,255,255,0.48) 0%, transparent 70%)',
                      filter: 'blur(4px)',
                    }}
                  />
                  {/* Inner reflection band */}
                  <div
                    className="absolute inset-6 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, transparent 60%)',
                      border: '1px solid rgba(255,255,255,0.32)',
                    }}
                  />
                </div>

                {/* ── Floating metric cards ── */}

                {/* Top-right card: Escrow Protected */}
                <div
                  className="absolute top-6 right-0 animate-float-reverse z-20 rounded-2xl px-3.5 py-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.94)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.92)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(99,102,241,0.08)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' }}
                    >
                      <ShieldCheck size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">100% Escrow Protected</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Neutral milestone lock</div>
                    </div>
                  </div>
                </div>

                {/* Bottom-left card: Payout */}
                <div
                  className="absolute bottom-8 left-0 animate-float-slow z-20 rounded-2xl px-3.5 py-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.94)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.92)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(99,102,241,0.08)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' }}
                    >
                      <Zap size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">Milestone #1 Approved</div>
                      <div className="text-[10px] text-emerald-600 font-bold mt-0.5">+$450.00 disbursed instantly</div>
                    </div>
                  </div>
                </div>

                {/* Top-left card: Rating */}
                <div
                  className="absolute top-14 left-2 animate-float-slow z-20 rounded-2xl px-3 py-2"
                  style={{
                    background: 'rgba(255,255,255,0.94)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.92)',
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

        {/* ── Pinned Bottom Bar: Trust badges & Smooth Scroll Down cue ── */}
        <div className="border-t border-slate-100/90 bg-white/95 backdrop-blur-sm py-4 shrink-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-slate-400 font-medium">
              <span className="text-slate-300 font-semibold uppercase tracking-widest text-[10px]">
                Trusted by teams using
              </span>
              {['React', 'Next.js', 'Laravel', 'Figma', 'Shopify', 'WordPress'].map((tech) => (
                <span
                  key={tech}
                  className="text-slate-500 font-semibold hover:text-indigo-600 transition-colors cursor-default"
                >
                  {tech}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                document.getElementById('featured-services')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1 cursor-pointer group"
            >
              <span>Explore Marketplace</span>
              <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ──── Section 2: Featured Marketplace Services ──── */}
      <section id="featured-services" className="bg-slate-50/70 py-16 lg:py-20 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Top-Rated Talent</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                Featured Verified Services
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Pre-screened engineering, mobile, and design specialists ready to deliver.
              </p>
            </div>
            <Link
              to="/services"
              className="btn btn-secondary text-xs font-bold self-start sm:self-auto flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
            >
              <span>Browse All Services</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Grid */}
          {isLoadingListings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="h-44 bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((listing) => {
                const primaryImage =
                  listing.imageUrls?.[0] ||
                  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80';
                const seller = listing.seller;

                return (
                  <Link
                    key={listing.id}
                    to={`/listings/${listing.slug}`}
                    className="group card overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-slate-200/80 bg-white"
                  >
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      <img
                        src={primaryImage}
                        alt={listing.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {listing.category && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-medium text-white">
                          {listing.category.name}
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-indigo-100 shrink-0">
                            {seller?.avatarUrl ? (
                              <img src={seller.avatarUrl} alt={seller.displayName || seller.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-indigo-700">
                                {getInitials(seller?.displayName || seller?.name || 'S')}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium text-slate-700 truncate">
                            {seller?.displayName || seller?.name || 'Verified Freelancer'}
                          </span>
                        </div>

                        <h4 className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                          {listing.title}
                        </h4>
                      </div>

                      <div className="border-t border-slate-100 mt-4 pt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span>{listing.averageRating?.toFixed(1) || '5.0'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">From</span>
                          <span className="text-sm font-bold text-slate-900">{formatPrice(listing.priceAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ──── Section 3: How Smart Escrow Works ──── */}
      <section className="bg-white py-16 lg:py-24 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Built for Zero Risk</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              How MarketForge Protects Both Sides
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2">
              Our automated milestone escrow ensures clients never pay for incomplete work, and freelancers always get paid upon completion.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-200/70 relative">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg mb-6 shadow-md shadow-indigo-500/25">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Funds Locked in Neutral Escrow</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                When an order starts, client payment is safely locked into the MarketForge financial ledger. Neither party can touch it until agreed milestones are delivered.
              </p>
            </div>

            <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-200/70 relative">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-lg mb-6 shadow-md shadow-purple-500/25">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Encrypted Vault Deliverables</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Freelancers upload code, designs, or assets to the secure Deliverables Vault. Clients inspect work with built-in revision checkpoints.
              </p>
            </div>

            <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-200/70 relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg mb-6 shadow-md shadow-emerald-500/25">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Instant Payout & IP Transfer</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Upon milestone approval (or 3-day review timer), payment is released instantly to the seller's wallet, along with a cryptographically verifiable IP transfer certificate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──── Section 4: Call to Action Banner ──── */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-16 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to Build or Offer Services on MarketForge?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
            Join thousands of developers, designers, and fast-moving companies collaborating safely with smart escrow contracts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => openModal('auth')}
              className="font-bold text-sm text-slate-900 bg-white hover:bg-slate-100 px-8 py-3.5 rounded-xl transition-all shadow-lg cursor-pointer"
            >
              Get Started Now
            </button>
            <Link
              to="/jobs/new"
              className="font-bold text-sm text-white bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/40 px-8 py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Post a Job
            </Link>
          </div>
        </div>
      </section>

      <EscrowDemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </div>
  );
}
