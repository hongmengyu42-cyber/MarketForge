import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { authApi } from '@/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2 : 3;

  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-400', 'bg-emerald-500'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!token) { setError('Invalid reset link — no token found.'); return; }

    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setStatus('success');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reset failed. The link may have expired.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <CheckCircle className="w-14 h-14 mx-auto mb-4 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
        <p className="text-slate-300 text-sm mb-6">Your password has been updated. You can now sign in with your new credentials.</p>
        <button onClick={() => navigate('/')}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors">
          Sign In
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">

        {!token ? (
          <div className="text-center">
            <XCircle className="w-14 h-14 mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h1>
            <p className="text-slate-400 text-sm mb-4">This link is missing a reset token.</p>
            <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-sm">Request a new link</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
            <p className="text-slate-400 text-sm mb-6">Must be at least 8 characters.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input type={showPw ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10">
                      <div className={`h-full rounded-full transition-all ${strengthColor}`}
                        style={{ width: `${(strength / 3) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-400">{strengthLabel}</span>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} required value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset Password
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm mt-6">
              <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300">Request a new link</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
