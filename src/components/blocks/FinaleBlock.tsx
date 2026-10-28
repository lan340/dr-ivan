import React, { useState } from 'react';
import { Sparkles, Heart, Rocket } from 'lucide-react';
import { FinaleContent, PuzzleBlock } from '../../types/greeting';
import { fireGrandFireworks, fireConfetti } from '../../utils/confetti';

interface FinaleBlockProps {
  block: PuzzleBlock;
  onUnlock?: () => void;
  isUnlocked?: boolean;
}

export const FinaleBlock: React.FC<FinaleBlockProps> = ({ block, onUnlock, isUnlocked }) => {
  const content = block.data as FinaleContent;
  const [hasLaunchedFireworks, setHasLaunchedFireworks] = useState(false);
  const [thankYouSent, setThankYouSent] = useState(false);

  const handleLaunch = () => {
    setHasLaunchedFireworks(true);
    fireGrandFireworks();
    if (onUnlock && !isUnlocked) {
      onUnlock();
    }
  };

  const handleThankYou = () => {
    setThankYouSent(true);
    fireConfetti(0.5, 0.7);
  };

  return (
    <div id={block.id} className="relative w-full max-w-3xl mx-auto my-16 text-center scroll-mt-24">
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-stone-900 to-amber-950/40 border border-amber-500/40 rounded-3xl p-8 sm:p-14 shadow-2xl">
        {/* Иконка финала */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-inner">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="text-xs font-semibold tracking-wider text-amber-400 uppercase mb-2">
          {block.subtitle || 'Финальный аккорд'}
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
          {content.heading || block.title}
        </h2>

        {/* Список пожеланий */}
        <div className="space-y-4 max-w-xl mx-auto text-slate-300 text-base sm:text-lg leading-relaxed mb-10">
          {content.wishes.map((wish, idx) => (
            <p key={idx} className="font-normal">
              {wish}
            </p>
          ))}
        </div>

        {/* Кнопка запуска праздничного салюта */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <button
            type="button"
            onClick={handleLaunch}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-base sm:text-lg rounded-2xl shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Rocket className="w-5 h-5" />
            <span>{content.callToAction || 'Запустить праздничный супер-салют!'}</span>
          </button>
        </div>

        {/* Интерактивная кнопка благодарности от друга */}
        <div className="pt-6 border-t border-slate-800/80 max-w-md mx-auto">
          {!thankYouSent ? (
            <button
              type="button"
              onClick={handleThankYou}
              className="text-xs text-slate-400 hover:text-amber-300 flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Нажать, чтобы отправить мысленное спасибо за поздравление</span>
            </button>
          ) : (
            <div className="text-xs text-rose-400 flex items-center justify-center gap-1.5 animate-in fade-in">
              <Heart className="w-3.5 h-3.5 fill-rose-500" />
              <span>Спасибо принято! Ты лучший!</span>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-4">
            {content.authorNote}
          </p>
        </div>
      </div>
    </div>
  );
};
