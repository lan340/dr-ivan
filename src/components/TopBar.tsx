import React from 'react';
import { Edit3, Eye, Gamepad2, Sparkles } from 'lucide-react';

export type AppPage = 'greeting' | 'retro_arcade';

interface TopBarProps {
  activePage: AppPage;
  onSelectPage: (page: AppPage) => void;
  unlockedCount: number;
  totalCount: number;
  isEditorOpen: boolean;
  onToggleEditor: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  onSelectPage,
  isEditorOpen,
  onToggleEditor,
}) => {
  const handleSectionLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (activePage !== 'greeting') {
      e.preventDefault();
      onSelectPage('greeting');
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Зона 1: Название проекта / Бренд */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectPage('greeting');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
        >
          Поздравление Другу
        </a>

        {/* Зона 2: Переключатель страниц и навигация по главам */}
        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium text-slate-400 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              onSelectPage('greeting');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activePage === 'greeting'
                ? 'text-amber-300 border-amber-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Пазл-поздравление
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectPage('retro_arcade');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 flex items-center gap-1.5 ${
              activePage === 'retro_arcade'
                ? 'text-amber-300 border-amber-400 font-semibold'
                : 'text-slate-300 border-transparent hover:text-amber-300'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Ретро-Игры</span>
          </button>

          <a
            href="#block-car-bass"
            onClick={(e) => handleSectionLinkClick(e, '#block-car-bass')}
            className="hidden lg:inline hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            Тачка & Басы
          </a>
          <a
            href="#block-gaming"
            onClick={(e) => handleSectionLinkClick(e, '#block-gaming')}
            className="hidden lg:inline hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            Танки & Steam
          </a>
          <a
            href="#block-finale"
            onClick={(e) => handleSectionLinkClick(e, '#block-finale')}
            className="hidden lg:inline hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            Салют
          </a>
        </nav>

        {/* Зона 3: Единственное главное действие (Переключатель редактора) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleEditor}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              isEditorOpen
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-amber-500/40'
            }`}
          >
            {isEditorOpen ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Режим просмотра</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Редактировать</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

