import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { authApi } from '@/api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [error, setError] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('no-token'); return; }
    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/'), 3000);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Invalid or expired verification link.');
        setStatus('error');
      });
  }, [token, navigate]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    try {
      await authApi.resendVerification(resendEmail);
      setResendSent(true);
    } catch {
      setResendSent(true); // show success always (anti-enumeration)
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        {status === 'loading' && (
          <>
            <Loader2 className="w-14 h-14 mx-auto mb-4 text-indigo-400 animate-spin" />
            <h1 className="text-xl font-bold text-white mb-2">Verifying your email…</h1>
            <p className="text-slate-400 text-sm">Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-14 h-14 mx-auto mb-4 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-slate-300 text-sm mb-4">
              Your account is now active. Redirecting you to the homepage…
            </p>
            <button onClick={() => navigate('/')}
              className="mt-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors">
              Go to MarketForge
            </button>
          </>
        )}

        {(status === 'error' || status === 'no-token') && (
          <>
            <XCircle className="w-14 h-14 mx-auto mb-4 text-red-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-slate-300 text-sm mb-6">
              {status === 'no-token' ? 'No verification token found in this link.' : error}
            </p>

            {!resendSent ? (
              <form onSubmit={handleResend} className="text-left space-y-3">
                <p className="text-slate-400 text-sm text-center mb-2">
                  Need a new verification email?
                </p>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email" required value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button type="submit" disabled={resending}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                  {resending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Resend Verification Email
                </button>
              </form>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-300 text-sm">
                ✓ If that email is registered, a new link has been sent.
              </div>
            )}

            <button onClick={() => navigate('/')}
              className="mt-4 text-slate-400 hover:text-white text-sm transition-colors">
              Back to homepage
            </button>
          </>
        )}
      </div>
    </div>
  );
}
