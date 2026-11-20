import { Link } from 'react-router-dom';
import {
  Lock,
  FileCheck2,
  Scale,
  Award,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '@/store';

export default function AboutPage() {
  const { openModal } = useUIStore();

  const pillars = [
    {
      icon: <Lock className="text-indigo-600" size={24} />,
      title: 'Automated Smart Escrow',
      description:
        'When an order begins, client funds are safely locked in our neutral double-entry ledger. Sellers are guaranteed payment upon delivery, and buyers never pay for incomplete work.',
      badge: 'Zero Counterparty Risk',
    },
    {
      icon: <FileCheck2 className="text-purple-600" size={24} />,
      title: 'Deliverables Vault & IP Transfer',
      description:
        'All project assets, source code, and deliverables are archived in our encrypted vault. Upon milestone sign-off, a legally binding IP transfer certificate is generated automatically.',
      badge: 'Legally Binding IP',
    },
    {
      icon: <Scale className="text-emerald-600" size={24} />,
      title: 'Objective Dispute Arbitration',
      description:
        'If requirements diverge, our dedicated arbitration desk provides evidence-based resolution within 2 hours, preventing scope creep and unfair chargebacks.',
      badge: '< 2 Hour SLA',
    },
    {
      icon: <Award className="text-amber-500" size={24} />,
      title: 'Verified Skill Badges',
      description:
        'We replace self-reported resumes with timed, anti-cheated technical skill assessments. Clients hire proven engineers and designers with confidence.',
      badge: 'Proof of Competence',
    },
  ];

  const stats = [
    { value: '100%', label: 'Escrow Protected', helper: 'Every funded dollar held in neutral ledger' },
    { value: '0%', label: 'Buyer Deposit Fees', helper: 'Transparent milestone pricing, no hidden costs' },
    { value: '< 2h', label: 'Dispute SLA', helper: 'Fast, neutral resolution for active orders' },
    { value: '2,800+', label: 'Verified Specialists', helper: 'Screened developers, designers, and creators' },
  ];

  const coreValues = [
    {
      title: 'Neutrality Above All',
      description:
        'A marketplace cannot take sides. We built MarketForge to be a fair, impartial arbiter where rules are clear and financial settlement is deterministic.',
    },
    {
      title: 'Builders First',
      description:
        'Freelancers create real value. We charge one of the lowest platform commissions in the industry (10%) and disburse funds instantly upon approval.',
    },
    {
      title: 'Transparency by Default',
      description:
        'No hidden processing fees, no opaque algorithms, and no fake reviews. Ratings are double-blind and tied strictly to funded milestone completions.',
    },
    {
      title: 'Bank-Grade Financial Integrity',
      description:
        'Powered by global payment infrastructure (Stripe Escrow) and TLS-encrypted communication for ironclad peace of mind.',
    },
  ];

  return (
    <div className="w-full bg-white">
      {/* ──── Hero Section ──── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-slate-100">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-60"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-2xs">
            <Sparkles size={13} className="text-indigo-600" />
            <span>Next-Gen Freelance Infrastructure</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Reinventing How the World <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Hires & Delivers.
            </span>
          </h1>

          <p className="text-slate-600 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            MarketForge eliminates freelance ghosting, non-payment, and unfair chargebacks by combining automated smart escrow contracts with cryptographic deliverable verification.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/services"
              className="btn-primary text-sm font-bold px-7 py-3 rounded-xl shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              Browse Marketplace
            </Link>
            <Link
              to="/contact"
              className="btn-secondary text-sm font-semibold px-6 py-3 rounded-xl cursor-pointer"
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>

      {/* ──── Mission Statement ──── */}
      <section className="py-16 lg:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">The Problem We Solve</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              Traditional freelancing is plagued by a trust crisis.
            </h2>
          </div>
          <div className="md:col-span-7 space-y-4 text-slate-600 text-base leading-relaxed border-l-2 border-indigo-100 pl-6 sm:pl-8">
            <p>
              Clients worry about paying upfront only to receive subpar work, missed deadlines, or uncommunicative contractors. Freelancers worry about delivering high-effort work and spending weeks chasing unpaid invoices.
            </p>
            <p>
              <strong>MarketForge was built to be the neutral middle ground.</strong> By requiring milestone funds to be deposited in smart escrow before work begins and releasing them upon verified delivery, we create complete alignment so both sides succeed every time.
            </p>
          </div>
        </div>
      </section>

      {/* ──── 4 Core Infrastructure Pillars ──── */}
      <section className="bg-slate-50/70 py-16 lg:py-24 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Engineered for Security</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              The Four Pillars of MarketForge
            </h2>
            <p className="text-slate-500 text-base mt-2">
              Every feature on MarketForge is architected to guarantee accountability, speed, and safety.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5">
                    {pillar.icon}
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] mb-3">
                    {pillar.badge}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mb-2.5">{pillar.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{pillar.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Key Platform Stats ──── */}
      <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-6 rounded-2xl bg-white border border-slate-200/70 shadow-xs text-center"
            >
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{stat.value}</div>
              <div className="text-sm font-bold text-slate-800 mt-1">{stat.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.helper}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ──── Core Values ──── */}
      <section className="bg-slate-50/50 py-16 lg:py-24 border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Our Commitments</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              Guiding Principles
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {coreValues.map((val) => (
              <div key={val.title} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  <h3 className="font-bold text-slate-900 text-base">{val.title}</h3>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed pl-6">{val.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Call to Action ──── */}
      <section className="relative overflow-hidden bg-slate-950 py-16 lg:py-20 text-white text-center border-t border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Experience Risk-Free Freelancing?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Whether you are building your next product or offering specialized technical services, MarketForge protects every milestone.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
            <button
              type="button"
              onClick={() => openModal('auth')}
              className="font-bold text-sm text-slate-900 bg-white hover:bg-slate-100 px-7 py-3 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              Create Free Account
            </button>
            <Link
              to="/services"
              className="font-semibold text-sm text-white bg-white/10 hover:bg-white/15 border border-white/20 px-7 py-3 rounded-xl transition-all cursor-pointer"
            >
              Explore Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
