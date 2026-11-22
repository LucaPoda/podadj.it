import React, { useState } from 'react';

interface LoginFormProps {
  onSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password) {
      setError('Inserisci la password di amministrazione.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        authenticated?: boolean;
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 500) {
          setError(
            'Configurazione server incompleta (ADMIN_PASSWORD / SESSION_SECRET non impostate).'
          );
        } else if (response.status === 401) {
          setError('Password non valida. Riprova.');
        } else {
          setError(data.error || 'Errore durante il login.');
        }
        return;
      }

      setPassword('');
      onSuccess();
    } catch {
      setError('Impossibile contattare il server di autenticazione.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full min-h-[75vh] flex items-center justify-center px-2 py-8">
      <div className="w-full max-w-md rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-neonPurple/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-neonBlue/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center mb-6">
          <img
            src="/assets/logo.png"
            alt="Poda DJ"
            width="140"
            height="46"
            className="w-32 mb-4 drop-shadow-lg"
          />
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            Accesso Riservato
          </h1>
          <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
            Inserisci la password amministratore per gestire contenuti, tracklist e configurazioni di{' '}
            <span className="text-gray-200 font-medium">podadj.it</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-password"
              className="text-[11px] font-semibold uppercase tracking-wider text-gray-300"
            >
              Password Amministratore
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••••••"
                disabled={submitting}
                className="w-full rounded-2xl bg-black/60 border border-white/15 focus:border-neonPurple focus:outline-none focus:ring-2 focus:ring-neonPurple/30 px-4 py-3 pr-11 text-sm text-white placeholder:text-gray-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 transition-colors"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl bg-red-500/10 border border-red-500/35 px-3.5 py-2.5 text-xs text-red-200 flex items-start gap-2"
            >
              <i className="fas fa-triangle-exclamation text-red-400 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-neonPurple hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest py-3.5 px-5 transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <i className="fas fa-circle-notch fa-spin text-xs" />
                <span>Verifica in corso...</span>
              </>
            ) : (
              <>
                <i className="fas fa-right-to-bracket text-xs" />
                <span>Accedi al Portale</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
