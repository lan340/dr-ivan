import React, { useState } from 'react';
import { 
  Trophy, Flame, Shield, Sparkles, Award, Zap, Heart, Star, Compass, 
  Crown, ThumbsUp, CheckCircle 
} from 'lucide-react';
import { AchievementContent, PuzzleBlock } from '../../types/greeting';
import { fireStars } from '../../utils/confetti';

interface AchievementBlockProps {
  block: PuzzleBlock;
  onUnlock?: () => void;
  isUnlocked?: boolean;
}

// Хелпер для динамического подбора иконки
const getIcon = (iconName: string) => {
  const props = { className: "w-6 h-6 text-amber-400 shrink-0" };
  switch (iconName.toLowerCase()) {
    case 'flame': return <Flame {...props} className="w-6 h-6 text-orange-400 shrink-0" />;
    case 'shield': return <Shield {...props} className="w-6 h-6 text-emerald-400 shrink-0" />;
    case 'sparkles': return <Sparkles {...props} className="w-6 h-6 text-purple-400 shrink-0" />;
    case 'trophy': return <Trophy {...props} className="w-6 h-6 text-amber-400 shrink-0" />;
    case 'zap': return <Zap {...props} className="w-6 h-6 text-yellow-400 shrink-0" />;
    case 'heart': return <Heart {...props} className="w-6 h-6 text-rose-400 shrink-0" />;
    case 'crown': return <Crown {...props} className="w-6 h-6 text-amber-300 shrink-0" />;
    case 'compass': return <Compass {...props} className="w-6 h-6 text-sky-400 shrink-0" />;
    default: return <Award {...props} />;
  }
};

export const AchievementBlock: React.FC<AchievementBlockProps> = ({ block, onUnlock, isUnlocked }) => {
  const content = block.data as AchievementContent;
  const [celebratedId, setCelebratedId] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    setCelebratedId(id);
    fireStars(0.5, 0.6);
    if (onUnlock && !isUnlocked) {
      onUnlock();
    }
    setTimeout(() => setCelebratedId(null), 1500);
  };

  return (
    <div id={block.id} className="relative w-full max-w-4xl mx-auto my-14 scroll-mt-24">
      {/* Заголовок */}
      <div className="mb-8 text-center">
        <div className="text-xs font-semibold tracking-wider text-amber-400 uppercase mb-1">
          {block.subtitle || 'Достижения'}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          {block.title}
        </h2>
        {content.subtitle && (
          <p className="text-sm text-slate-400">
            {content.subtitle}
          </p>
        )}
      </div>

      {/* Сетка достижений */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {content.items.map((item) => {
          const isClicked = celebratedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick(item.id)}
              className={`group cursor-pointer relative bg-slate-900/90 border rounded-2xl p-6 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
                isClicked 
                  ? 'border-amber-400 bg-amber-950/20 scale-[1.02] shadow-xl shadow-amber-500/10' 
                  : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:scale-110 group-hover:border-amber-500/40 transition-all">
                  {getIcon(item.iconName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-amber-400/90 uppercase tracking-wider">
                      {item.badge}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> Разблокировано
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors mb-2">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-slate-500 mt-4">
        Нажмите на любую карточку, чтобы отметить достижение
      </p>
    </div>
  );
};
