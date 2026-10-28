import React from 'react';
import { 
  Mail, Car, Gamepad2, Bookmark, Trophy, HelpCircle, Quote, Rocket, ChevronRight 
} from 'lucide-react';
import { PuzzleBlock } from '../types/greeting';
import { fireStars } from '../utils/confetti';

interface GreetingMenuProps {
  blocks: PuzzleBlock[];
  unlockedIds: string[];
}

const getBlockIcon = (type: string) => {
  const iconProps = { className: "w-4 h-4 text-amber-400" };
  switch (type) {
    case 'letter': return <Mail {...iconProps} />;
    case 'car_bass': return <Car {...iconProps} className="w-4 h-4 text-emerald-400" />;
    case 'gaming': return <Gamepad2 {...iconProps} className="w-4 h-4 text-orange-400" />;
    case 'memory': return <Bookmark {...iconProps} className="w-4 h-4 text-sky-400" />;
    case 'achievement': return <Trophy {...iconProps} className="w-4 h-4 text-amber-400" />;
    case 'trivia': return <HelpCircle {...iconProps} className="w-4 h-4 text-purple-400" />;
    case 'quote': return <Quote {...iconProps} className="w-4 h-4 text-rose-400" />;
    case 'finale': return <Rocket {...iconProps} className="w-4 h-4 text-yellow-400" />;
    default: return <Bookmark {...iconProps} />;
  }
};

export const GreetingMenu: React.FC<GreetingMenuProps> = ({ blocks, unlockedIds }) => {
  const visibleBlocks = blocks.filter(b => !b.hidden);

  const handleScrollTo = (blockId: string) => {
    fireStars(0.5, 0.3);
    const element = document.getElementById(blockId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Небольшое временное подсвечивание блока
      element.classList.add('ring-2', 'ring-amber-400', 'rounded-3xl', 'transition-all');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-amber-400');
      }, 1500);
    }
  };

  return (
    <nav aria-label="Меню поздравлений" className="max-w-4xl mx-auto my-8 px-4">
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Меню поздравлений & историй
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {visibleBlocks.length} глав для именинника
          </span>
        </div>

        {/* Сетка быстрых ссылок на главы */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {visibleBlocks.map((block, idx) => {
            const isUnlocked = unlockedIds.includes(block.id);
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => handleScrollTo(block.id)}
                className="group w-full p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left transition-all flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 group-hover:scale-105 transition-transform shrink-0">
                    {getBlockIcon(block.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500">#{idx + 1}</span>
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 truncate">
                        {block.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {block.subtitle || 'Перейти к главе'}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
