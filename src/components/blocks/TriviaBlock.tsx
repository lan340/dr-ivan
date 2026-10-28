import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';
import { TriviaContent, PuzzleBlock } from '../../types/greeting';
import { fireConfetti } from '../../utils/confetti';

interface TriviaBlockProps {
  block: PuzzleBlock;
  onUnlock?: () => void;
  isUnlocked?: boolean;
}

export const TriviaBlock: React.FC<TriviaBlockProps> = ({ block, onUnlock, isUnlocked }) => {
  const content = block.data as TriviaContent;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    fireConfetti(0.5, 0.5);
    if (onUnlock && !isUnlocked) {
      onUnlock();
    }
  };

  return (
    <div id={block.id} className="relative w-full max-w-3xl mx-auto my-14 scroll-mt-24">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 sm:p-10 shadow-xl">
        {/* Заголовок викторины */}
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              {block.subtitle || 'Интерактивный квиз'}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              {block.title}
            </h3>
          </div>
        </div>

        {/* Вопрос */}
        <div className="my-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <p className="text-lg sm:text-xl font-semibold text-slate-100">
            {content.question}
          </p>
          {content.contextHint && (
            <p className="text-xs text-slate-400 mt-2">
              {content.contextHint}
            </p>
          )}
        </div>

        {/* Варианты ответов */}
        <div className="space-y-3">
          {content.options.map((option, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <div key={idx} className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left p-4 rounded-xl border text-sm sm:text-base font-medium transition-all duration-200 flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/80 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{option.text}</span>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                </button>

                {/* Реакция автора на выбранный ответ */}
                {isSelected && (
                  <div className="ml-2 pl-4 py-2 border-l-2 border-amber-400/60 text-xs sm:text-sm text-amber-300 italic flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <MessageSquare className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>{option.comment}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Финальное сообщение при любом ответе */}
        {selectedIdx !== null && content.rewardMessage && (
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-emerald-400 animate-in fade-in duration-300">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{content.rewardMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
