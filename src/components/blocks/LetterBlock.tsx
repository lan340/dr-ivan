import React, { useState } from 'react';
import { Mail, MailOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { LetterContent, PuzzleBlock } from '../../types/greeting';
import { fireConfetti } from '../../utils/confetti';

interface LetterBlockProps {
  block: PuzzleBlock;
  onUnlock?: () => void;
  isUnlocked?: boolean;
}

export const LetterBlock: React.FC<LetterBlockProps> = ({ block, onUnlock, isUnlocked }) => {
  const content = block.data as LetterContent;
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
      fireConfetti(0.5, 0.4);
      if (onUnlock && !isUnlocked) {
        onUnlock();
      }
    }
  };

  return (
    <div id={block.id} className="relative w-full max-w-3xl mx-auto my-12 scroll-mt-24">
      {/* Заголовок блока */}
      <div className="mb-4 text-center">
        <div className="text-xs font-semibold tracking-wider text-amber-400 uppercase mb-1">
          {block.subtitle || 'Интерактивное вскрытие'}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {block.title}
        </h2>
      </div>

      {!isOpen ? (
        /* Интерактивный запечатанный конверт */
        <div
          onClick={handleOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpen()}
          className="group cursor-pointer relative bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 hover:border-amber-400/70 rounded-2xl p-8 sm:p-12 shadow-2xl shadow-amber-950/20 text-center transition-all duration-300 hover:scale-[1.01] hover:shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {/* Сургучная печать */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-600 via-rose-700 to-red-900 flex items-center justify-center shadow-lg shadow-red-950/60 mb-6 group-hover:rotate-6 transition-transform">
            <Mail className="w-9 h-9 text-amber-200" />
          </div>

          <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 tracking-widest mb-3">
            {content.stampText || 'ЛИЧНО В РУКИ'}
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
            Вам пришло персональное письмо
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Конверт запечатан специальной праздничной пломбой. Нажмите, чтобы сломать печать и прочитать послание.
          </p>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Вскрыть конверт
          </button>
        </div>
      ) : (
        /* Раскрытое письмо */
        <div className="relative bg-gradient-to-b from-stone-900/90 to-stone-950/90 border border-amber-500/40 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm transition-all duration-500 animate-in fade-in zoom-in-95">
          {/* Статус вскрытия */}
          <div className="flex items-center justify-between pb-6 border-b border-stone-800 mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Печать взломана · Кусочек пазла открыт</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
              <MailOpen className="w-4 h-4" />
              <span>Личное обращение</span>
            </div>
          </div>

          {/* Приветствие */}
          <h3 className="text-2xl sm:text-3xl font-bold text-amber-300 font-handwriting tracking-wide mb-6">
            {content.salutation}
          </h3>

          {/* Тело письма */}
          <div className="space-y-4 text-slate-300 leading-relaxed text-base sm:text-lg">
            {content.message.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>

          {/* Подпись */}
          <div className="mt-8 pt-6 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              {content.postScriptum && (
                <p className="text-xs text-slate-400 italic">
                  {content.postScriptum}
                </p>
              )}
            </div>
            <div className="text-right sm:text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                Всегда рядом:
              </div>
              <div className="text-2xl font-handwriting font-bold text-amber-400">
                {content.signature}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
