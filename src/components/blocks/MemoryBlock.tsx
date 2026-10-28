import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Sparkles } from 'lucide-react';
import { MemoryContent, PuzzleBlock } from '../../types/greeting';
import { fireStars } from '../../utils/confetti';

interface MemoryBlockProps {
  block: PuzzleBlock;
  onUnlock?: () => void;
  isUnlocked?: boolean;
}

export const MemoryBlock: React.FC<MemoryBlockProps> = ({ block, onUnlock, isUnlocked }) => {
  const content = block.data as MemoryContent;
  const [isRevealed, setIsRevealed] = useState(false);

  const toggleReveal = () => {
    const nextState = !isRevealed;
    setIsRevealed(nextState);
    if (nextState) {
      fireStars(0.5, 0.5);
      if (onUnlock && !isUnlocked) {
        onUnlock();
      }
    }
  };

  return (
    <div id={block.id} className="relative w-full max-w-3xl mx-auto my-12 scroll-mt-24">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl transition-all">
        {/* Верхняя строка метаданных */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-semibold uppercase tracking-wider">
              {content.tag || 'Воспоминание'}
            </span>
            {content.dateOrPlace && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{content.dateOrPlace}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {isRevealed ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" /> Секрет открыт
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Спойлер скрыт
              </span>
            )}
          </div>
        </div>

        {/* Заголовок */}
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
          {block.title}
        </h3>

        {/* Текст воспоминания */}
        <p className="text-slate-300 leading-relaxed text-base sm:text-lg mb-6">
          {content.summary}
        </p>

        {/* Изображение, если указано */}
        {content.imageUrl && (
          <div className="mb-6 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src={content.imageUrl}
              alt={content.imageCaption || block.title}
              className="w-full max-h-80 object-cover"
              referrerPolicy="no-referrer"
            />
            {content.imageCaption && (
              <div className="p-2.5 text-xs text-slate-400 text-center bg-slate-900/60">
                {content.imageCaption}
              </div>
            )}
          </div>
        )}

        {/* Секретная деталь / Спойлер */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          {!isRevealed ? (
            <button
              type="button"
              onClick={toggleReveal}
              className="w-full py-3 px-4 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-amber-300 hover:text-amber-200 font-medium text-sm flex items-center justify-center gap-2 transition-all group"
            >
              <Eye className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Раскрыть секретную деталь истории</span>
            </button>
          ) : (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Секретное откровение</span>
                </div>
                <button
                  type="button"
                  onClick={toggleReveal}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Скрыть
                </button>
              </div>
              <p className="text-slate-200 text-sm sm:text-base leading-relaxed italic">
                {content.secretDetail}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
