import React, { useState } from 'react';
import type { AiAssistContext } from '../../lib/gemini';
import { useAdminWorkspace } from './AdminWorkspaceContext';

interface AiBilingualFieldProps {
  labelIt: string;
  labelEn: string;
  valueIt: string;
  valueEn: string;
  onChangeIt: (val: string) => void;
  onChangeEn: (val: string) => void;
  context?: AiAssistContext;
  multiline?: boolean;
  rows?: number;
  placeholderIt?: string;
  placeholderEn?: string;
}

export const AiBilingualField: React.FC<AiBilingualFieldProps> = ({
  labelIt,
  labelEn,
  valueIt,
  valueEn,
  onChangeIt,
  onChangeEn,
  context = 'general',
  multiline = false,
  rows = 3,
  placeholderIt,
  placeholderEn,
}) => {
  const { aiIsBlocked, requestAiAssist } = useAdminWorkspace();
  const [busyAction, setBusyAction] = useState<'optimize_it' | 'translate_en' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleOptimizeIt() {
    if (!valueIt.trim() || aiIsBlocked) return;
    setLocalError(null);
    setBusyAction('optimize_it');
    try {
      const res = await requestAiAssist('optimize_it', valueIt, context);
      if (res.ok) {
        onChangeIt(res.text);
      } else {
        setLocalError(res.error);
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTranslateEn() {
    if (!valueIt.trim() || aiIsBlocked) return;
    setLocalError(null);
    setBusyAction('translate_en');
    try {
      const res = await requestAiAssist('translate_en', valueIt, context);
      if (res.ok) {
        onChangeEn(res.text);
      } else {
        setLocalError(res.error);
      }
    } finally {
      setBusyAction(null);
    }
  }

  const inputClasses =
    'w-full rounded-xl bg-black/50 border border-white/15 focus:border-neonPurple focus:outline-none px-3 py-2 text-xs text-white placeholder:text-gray-600';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Italian Column */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 truncate">
              {labelIt}
            </label>
            <button
              type="button"
              disabled={aiIsBlocked || busyAction !== null || !valueIt.trim()}
              onClick={() => void handleOptimizeIt()}
              title={aiIsBlocked ? 'AI temporaneamente disabilitata' : 'Ottimizza testo IT con Gemini'}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neonPurple/15 hover:bg-neonPurple/30 border border-neonPurple/35 text-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <i
                className={`fas ${
                  busyAction === 'optimize_it' ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'
                } text-[9px]`}
              />
              <span>Ottimizza con AI</span>
            </button>
          </div>
          {multiline ? (
            <textarea
              rows={rows}
              value={valueIt}
              onChange={(e) => onChangeIt(e.target.value)}
              placeholder={placeholderIt}
              className={inputClasses}
            />
          ) : (
            <input
              type="text"
              value={valueIt}
              onChange={(e) => onChangeIt(e.target.value)}
              placeholder={placeholderIt}
              className={inputClasses}
            />
          )}
        </div>

        {/* English Column */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 truncate">
              {labelEn}
            </label>
            <button
              type="button"
              disabled={aiIsBlocked || busyAction !== null || !valueIt.trim()}
              onClick={() => void handleTranslateEn()}
              title={aiIsBlocked ? 'AI temporaneamente disabilitata' : 'Traduci da IT a EN con Gemini'}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/35 text-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <i
                className={`fas ${
                  busyAction === 'translate_en' ? 'fa-circle-notch fa-spin' : 'fa-language'
                } text-[9px]`}
              />
              <span>Traduci con AI</span>
            </button>
          </div>
          {multiline ? (
            <textarea
              rows={rows}
              value={valueEn}
              onChange={(e) => onChangeEn(e.target.value)}
              placeholder={placeholderEn}
              className={inputClasses}
            />
          ) : (
            <input
              type="text"
              value={valueEn}
              onChange={(e) => onChangeEn(e.target.value)}
              placeholder={placeholderEn}
              className={inputClasses}
            />
          )}
        </div>
      </div>

      {localError && (
        <span className="text-[11px] text-amber-300">
          <i className="fas fa-circle-info mr-1" />
          {localError}
        </span>
      )}
    </div>
  );
};
