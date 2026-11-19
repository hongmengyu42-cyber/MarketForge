import { useQuery } from '@tanstack/react-query';
import { vaultApi } from '@/api';
import { formatPrice, formatDate } from '@/utils';
import type { IpCertificateResponse } from '@/types';
import {
  ShieldCheck,
  Printer,
  X,
  FileText,
  Lock,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface IpCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
}

export default function IpCertificateModal({
  isOpen,
  onClose,
  orderId,
}: IpCertificateModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);

  const { data: certData, isLoading, isError } = useQuery({
    queryKey: ['ip-certificate', orderId],
    queryFn: () => vaultApi.getCertificate(orderId),
    enabled: isOpen && !!orderId,
  });

  const cert: IpCertificateResponse | undefined = certData?.data?.data;

  if (!isOpen) return null;

  const handleCopyHash = () => {
    if (!cert?.sha256VerificationHash) return;
    navigator.clipboard.writeText(cert.sha256VerificationHash);
    setCopiedHash(true);
    toast.success('SHA-256 verification seal copied to clipboard');
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Control Bar (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Verified Legal IP Deed & Copyright Registry
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-secondary btn-sm bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs flex items-center gap-1.5"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Certificate Content */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-50/50 print:p-0 print:bg-white print:overflow-visible">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-medium">Authenticating & Verifying Cryptographic Seal...</p>
            </div>
          ) : isError || !cert ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Lock size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">IP Certificate Locked in Escrow</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Legal copyright and ownership transfer only executes once the client confirms delivery and escrow funds are disbursed.
              </p>
            </div>
          ) : (
            <div className="bg-white border-4 border-double border-indigo-950/20 rounded-2xl p-6 sm:p-10 relative shadow-sm">
              {/* Corner Watermarks */}
              <div className="absolute top-3 left-3 text-[10px] font-mono text-gray-400 font-bold">
                REF: {cert.certificateId}
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={11} /> 100% EXECUTED
              </div>

              {/* Certificate Header */}
              <div className="text-center pt-4 pb-6 border-b border-gray-100 space-y-2">
                <img src="/logo-icon.png" alt="MarketForge" className="w-14 h-14 object-contain mx-auto mb-1 drop-shadow-xs" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Certificate of Intellectual Property Assignment
                </h1>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Facilitated by <strong>MarketForge Autonomous Smart Escrow Platform</strong>. Full worldwide proprietary title and copyright transfer.
                </p>
              </div>

              {/* Preamble */}
              <div className="py-6 text-xs text-gray-600 leading-relaxed text-center max-w-xl mx-auto border-b border-gray-100">
                This certifies that all intellectual property, source files, proprietary designs, and work products developed under
                MarketForge Contract <strong>#{cert.contractNumber}</strong> have been irrevocably assigned and transferred to the client upon verified escrow settlement.
              </div>

              {/* Parties Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-gray-100">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Licensor & Creator (Assignor)
                  </span>
                  <div className="font-bold text-sm text-slate-900">{cert.licensorName}</div>
                  <div className="text-xs text-slate-500">{cert.licensorEmail}</div>
                  <div className="pt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 size={12} /> Digital Signature Recorded
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                    Licensee & Owner (Assignee)
                  </span>
                  <div className="font-bold text-sm text-indigo-950">{cert.licenseeName}</div>
                  <div className="text-xs text-indigo-700">{cert.licenseeEmail}</div>
                  <div className="pt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 size={12} /> Title Transferred & Active
                  </div>
                </div>
              </div>

              {/* Project & Escrow Proof */}
              <div className="py-4 border-b border-gray-100 text-xs space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Project / Scope:</span>
                  <span className="font-bold text-gray-900 text-right">{cert.projectTitle}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Consideration Paid:</span>
                  <span className="font-bold text-gray-900">
                    {formatPrice(cert.contractAmount, cert.currency)} (Fully Settled)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Escrow Settlement Reference:</span>
                  <span className="font-mono text-gray-700">{cert.escrowSettlementReference}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Date of Execution:</span>
                  <span className="font-semibold text-gray-900">{formatDate(cert.issueDate)}</span>
                </div>
              </div>

              {/* Covered Deliverable Artifacts */}
              <div className="py-4 border-b border-gray-100 space-y-2 text-xs">
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-primary-600" />
                  Covered Deliverable Artifacts & Codebase:
                </span>
                <ul className="list-disc list-inside space-y-1 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {cert.deliverableArtifacts.map((item, idx) => (
                    <li key={idx} className="truncate">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cryptographic SHA-256 Seal */}
              <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Cryptographic Integrity Seal (SHA-256)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg break-all">
                      {cert.sha256VerificationHash}
                    </span>
                    <button
                      onClick={handleCopyHash}
                      className="p-1 text-gray-400 hover:text-gray-700 shrink-0"
                      title="Copy SHA-256 hash"
                    >
                      {copiedHash ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Registry Authority</div>
                  <div className="text-xs font-black text-slate-900 tracking-tight">MarketForge Trust & Legal Protocol</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
