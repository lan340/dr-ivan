import React from 'react';
import { Sparkles, Calendar, Heart, ChevronDown } from 'lucide-react';
import { FriendProfile } from '../types/greeting';
import { fireConfetti } from '../utils/confetti';

interface HeroHeaderProps {
  friend: FriendProfile;
  totalBlocks: number;
  unlockedCount: number;
}

export const HeroHeader: React.FC<HeroHeaderProps> = ({
  friend,
  totalBlocks,
  unlockedCount,
}) => {
  const handleStart = () => {
    fireConfetti(0.5, 0.5);
    const firstBlock = document.getElementById('block-letter');
    if (firstBlock) {
      firstBlock.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const progressPercent = Math.round((unlockedCount / Math.max(1, totalBlocks)) * 100);

  return (
    <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 text-center overflow-hidden">
      {/* Мягкое фоновое свечение */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        {/* Бейдж события */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold mb-6 animate-in fade-in duration-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{friend.occasion}</span>
        </div>

        {/* Главное имя */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Для тебя,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
            {friend.name}
          </span>
          {friend.avatarEmoji && (
            <span className="inline-block ml-3 animate-bounce">
              {friend.avatarEmoji}
            </span>
          )}
        </h1>

        {/* Прозвище и статус дружбы */}
        <p className="text-lg sm:text-2xl text-slate-300 font-medium max-w-2xl mx-auto mb-6">
          {friend.nickname}
        </p>

        {/* Информационные плашки */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-400 mb-10">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-slate-800">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>{friend.dateText}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-slate-800">
            <Heart className="w-4 h-4 text-rose-400" />
            <span>{friend.friendshipDuration}</span>
          </div>
        </div>

        {/* Индикатор прогресса открытия пазла */}
        <div className="max-w-xs mx-auto mb-10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Прогресс пазла воспоминаний:</span>
            <span className="font-semibold text-amber-300">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Кнопка старта */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleStart}
            className="group px-7 py-3.5 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-bold text-sm sm:text-base rounded-2xl shadow-xl transition-all flex items-center gap-2"
          >
            <span>Открыть первый кусочек пазла</span>
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};
