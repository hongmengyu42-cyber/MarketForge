import { useState } from 'react';
import { X, ShieldCheck, Lock, CheckCircle2, ArrowRight, Wallet, Award, RefreshCw, FileText } from 'lucide-react';

interface EscrowDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EscrowDemoModal({ isOpen, onClose }: EscrowDemoModalProps) {
  const [activeStep, setActiveStep] = useState(1);

  if (!isOpen) return null;

  const steps = [
    {
      id: 1,
      title: '1. Upfront Escrow Deposit',
      shortTitle: 'Escrow Lock',
      icon: Lock,
      color: 'from-blue-600 to-indigo-600',
      badge: 'Step 1: Security Deposit',
      description: 'The client funds the project upfront via Stripe or Bank Wire. 100% of the funds are locked in MarketForge neutral escrow holding. The freelancer can now begin work knowing payment is guaranteed.',
      metricLabel: 'Secured in Escrow Holding',
      metricValue: '$1,250.00',
      metricNote: '100% Protected & Segregated',
      actor: 'Client funds order',
    },
    {
      id: 2,
      title: '2. Phased Milestone Execution',
      shortTitle: 'Milestones',
      icon: RefreshCw,
      color: 'from-amber-500 to-orange-500',
      badge: 'Step 2: Phased Execution',
      description: 'Complex contracts are split into verifiable milestones (e.g., Wireframes, Frontend, Backend). As each phase is completed, the freelancer submits source links and assets securely.',
      metricLabel: 'Active Milestone Progress',
      metricValue: 'Phase 1 of 3: Complete',
      metricNote: 'Deliverable uploaded & signed',
      actor: 'Freelancer submits work',
    },
    {
      id: 3,
      title: '3. Deliverable Vault & IP Deed',
      shortTitle: 'IP Security',
      icon: FileText,
      color: 'from-purple-600 to-indigo-700',
      badge: 'Step 3: Verification & Review',
      description: 'Clients inspect files using 60-minute signed vault tokens. If adjustments are needed, revisions are tracked. Once satisfied, the client approves with one click.',
      metricLabel: 'Deliverable Security Vault',
      metricValue: 'SHA-256 Verified',
      metricNote: 'Time-limited signed access tokens',
      actor: 'Client reviews in vault',
    },
    {
      id: 4,
      title: '4. Instant Disbursement & IP Transfer',
      shortTitle: 'Instant Payout',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Step 4: Payout & Legal Deed',
      description: 'Approval triggers instant ledger disbursement directly to the freelancer\'s wallet balance. A permanent legal Intellectual Property Transfer Deed is minted and assigned to the client.',
      metricLabel: 'Disbursed to Freelancer',
      metricValue: '$450.00 Net Payout',
      metricNote: 'Withdraw anytime via Stripe Express',
      actor: 'Instant payout + Legal Deed',
    },
  ];

  const current = steps[activeStep - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 border border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                How MarketForge Autonomous Escrow Works
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Interactive walkthrough of our 4-stage smart contract & milestone engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-4 relative z-10">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === activeStep;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(s.id)}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  isActive
                    ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Icon size={13} />
                  </div>
                  <span className="text-xs font-bold truncate">{s.shortTitle}</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{s.actor}</div>
              </button>
            );
          })}
        </div>

        {/* Step Visual Showcase */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 relative z-10">
          <div className="p-6 rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-blue-200 border border-white/10 w-fit">
                {current.badge}
              </span>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{current.metricLabel}</div>
                <div className="text-xl font-black text-emerald-400">{current.metricValue}</div>
                <div className="text-[10px] text-slate-400">{current.metricNote}</div>
              </div>
            </div>

            <h4 className="text-xl font-black tracking-tight mb-2 text-white">
              {current.title}
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Value Guarantee Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold">
                <ShieldCheck size={16} /> Zero Non-Payment Risk
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Freelancers never work without verified escrow funds locked in advance.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                <Award size={16} /> Legal IP Transfer Deed
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatic cryptographic copyright assignment deeds upon release.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <Wallet size={16} /> Instant Payouts
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Disbursements clear in 0 seconds with direct bank transfers in 130+ currencies.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 relative z-10">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Step {activeStep} of {steps.length}
          </div>
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep((prev) => prev - 1)}
                className="btn-secondary btn-sm rounded-xl px-4"
              >
                Previous Step
              </button>
            )}
            {activeStep < steps.length ? (
              <button
                onClick={() => setActiveStep((prev) => prev + 1)}
                className="btn-primary btn-sm rounded-xl px-5 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                <span>Next: {steps[activeStep].shortTitle}</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="btn-primary btn-sm rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                Got It, Start Exploring
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
