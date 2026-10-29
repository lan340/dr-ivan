import React, { useState } from 'react';
import { Gamepad2, ArrowRight } from 'lucide-react';
import { GreetingConfig, RetroGameItem } from './types/greeting';
import { INITIAL_GREETING_CONFIG } from './data/initialConfig';
import { TopBar, AppPage } from './components/TopBar';
import { HeroHeader } from './components/HeroHeader';
import { GreetingMenu } from './components/GreetingMenu';
import { BlockRenderer } from './components/BlockRenderer';
import { EditorModal } from './components/EditorModal';
import { RetroArcadePage } from './components/RetroArcadePage';

import { resolveSteamAvatarUrl, resolveSteamFrameUrl } from './utils/gamingStats';

const LOCAL_STORAGE_KEY = 'greeting_puzzle_config_v9';
const UNLOCKED_BLOCKS_KEY = 'greeting_unlocked_blocks_v9';

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>('greeting');

  const [config, setConfig] = useState<GreetingConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GreetingConfig;
        const defaultGamingBlock = INITIAL_GREETING_CONFIG.blocks.find((b) => b.type === 'gaming');
        const defaultSteamAvatar = defaultGamingBlock?.data?.steam?.avatarUrl || '';
        const defaultSteamFrame = defaultGamingBlock?.data?.steam?.avatarFrameUrl || '';
        const defaultTanki = defaultGamingBlock?.data?.tanki;
        const defaultBlitz = defaultGamingBlock?.data?.blitz;

        const defaultRetroGames = INITIAL_GREETING_CONFIG.retroGames || [];
        if (!Array.isArray(parsed.retroGames) || parsed.retroGames.length === 0) {
          parsed.retroGames = defaultRetroGames;
        } else {
          parsed.retroGames = parsed.retroGames.map((g) => {
            if (g.id === 'tank-trouble-2') {
              return {
                ...g,
                title: 'Танки в лабиринте 4 (Tank Trouble)',
                proxyUrl: '/api/retro-mirror/tank-trouble-2/index.html',
              };
            }
            if (
              g.id === 'superfighters' ||
              g.embedUrl?.includes('575163_Superfighters') ||
              g.embedUrl?.includes('uploads.ungrounded.net/ruffle_wrapper')
            ) {
              return {
                ...g,
                proxyUrl: '/api/retro-mirror/superfighters/index.html',
              };
            }
            return g;
          });
          const existingIds = new Set(parsed.retroGames.map((g) => g.id));
          for (const defGame of defaultRetroGames) {
            if (!existingIds.has(defGame.id)) {
              parsed.retroGames.push(defGame);
            }
          }
        }

        if (Array.isArray(parsed.blocks)) {
          parsed.blocks = parsed.blocks
            .filter(
              (b) =>
                b.id !== 'block-quote' &&
                !(b.type === 'quote' && b.subtitle?.includes('Слова великих людей')) &&
                b.id !== 'block-memory-1' &&
                !(b.type === 'memory' && b.title?.includes('Тот самый легендарный случай'))
            )
            .map((b) => {
              if (b.type === 'gaming' && b.data) {
                const rawAv = b.data.steam?.avatarUrl || '';
                const wasFrameInAvatarSlot = /community_assets\/images\/items\/\d+\/[a-f0-9]+\.(?:png|gif|webp)/i.test(
                  rawAv
                );
                const cleanedAvatar = resolveSteamAvatarUrl(rawAv);
                const cleanedFrame = resolveSteamFrameUrl(
                  b.data.steam?.avatarFrameUrl || (wasFrameInAvatarSlot ? rawAv : '')
                );
                const isDefaultNick =
                  !b.data.steam?.steamNick || b.data.steam.steamNick.toLowerCase() === 'm0nesy';

                return {
                  ...b,
                  data: {
                    ...b.data,
                    tanki: b.data.tanki
                      ? {
                          ...b.data.tanki,
                          avatarUrl: b.data.tanki.avatarUrl || defaultTanki?.avatarUrl || '',
                          badgeUrl: b.data.tanki.badgeUrl || defaultTanki?.badgeUrl || '',
                          clanEmblemUrl: b.data.tanki.clanEmblemUrl || defaultTanki?.clanEmblemUrl || '',
                          topTankImageUrl: b.data.tanki.topTankImageUrl || defaultTanki?.topTankImageUrl || '',
                        }
                      : defaultTanki,
                    blitz: b.data.blitz
                      ? {
                          ...b.data.blitz,
                          avatarUrl: b.data.blitz.avatarUrl || defaultBlitz?.avatarUrl || '',
                          badgeUrl: b.data.blitz.badgeUrl || defaultBlitz?.badgeUrl || '',
                          topTankImageUrl: b.data.blitz.topTankImageUrl || defaultBlitz?.topTankImageUrl || '',
                        }
                      : defaultBlitz,
                    steam: b.data.steam
                      ? {
                          ...b.data.steam,
                          avatarUrl: cleanedAvatar || (isDefaultNick ? defaultSteamAvatar : ''),
                          avatarFrameUrl: cleanedFrame || (isDefaultNick ? defaultSteamFrame : ''),
                        }
                      : defaultGamingBlock?.data?.steam,
                  },
                };
              }
              if (b.type === 'car_bass' && b.data) {
                return {
                  ...b,
                  data: {
                    ...b.data,
                    audioUrl: b.data.audioUrl || '/assets/aistudio/____________5d3ff621.mp3',
                    trackName:
                      !b.data.trackName || b.data.trackName === 'Тёмный дух'
                        ? 'Тёмный друн'
                        : b.data.trackName,
                  },
                };
              }
              if ((b.id === 'block-achievements' || b.type === 'achievement') && b.data && Array.isArray(b.data.items)) {
                const filteredItems = b.data.items.filter(
                  (item: any) =>
                    item.id !== 'ach-1' &&
                    item.id !== 'ach-3' &&
                    item.title !== 'Генератор безумных идей' &&
                    item.title !== 'Аура неиссякаемого юмора'
                );
                return {
                  ...b,
                  subtitle: b.subtitle?.replace('Кусочек пазла #5', 'Кусочек пазла #4') || b.subtitle,
                  order: 4,
                  data: {
                    ...b.data,
                    items: filteredItems,
                  },
                };
              }
              if (b.id === 'block-finale' || b.type === 'finale') {
                return {
                  ...b,
                  order: 5,
                };
              }
              return b;
            });
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved config from localStorage', e);
    }
    return INITIAL_GREETING_CONFIG;
  });

  const [unlockedBlockIds, setUnlockedBlockIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(UNLOCKED_BLOCKS_KEY);
      if (saved) {
        const parsedIds = JSON.parse(saved);
        return Array.isArray(parsedIds)
          ? parsedIds.filter((id) => id !== 'block-quote' && id !== 'block-memory-1')
          : [];
      }
    } catch (e) {
      console.warn('Failed to parse unlocked blocks', e);
    }
    return [];
  });

  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Список видимых блоков (не скрытых пользователем)
  const visibleBlocks = config.blocks.filter((b) => !b.hidden);

  // Сохранение конфигурации в localStorage
  const handleSaveConfig = (newConfig: GreetingConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save config to localStorage', e);
    }
    setIsEditorOpen(false);
  };

  // Сброс к исходным настройкам
  const handleResetConfig = () => {
    if (window.confirm('Сбросить все изменения к первоначальным настройкам?')) {
      setConfig(INITIAL_GREETING_CONFIG);
      setUnlockedBlockIds([]);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(UNLOCKED_BLOCKS_KEY);
      } catch (e) {
        console.warn('Failed to clear storage', e);
      }
      setIsEditorOpen(false);
    }
  };

  // Отметка блока как открытого (для прогресса пазла)
  const handleUnlockBlock = (blockId: string) => {
    if (!unlockedBlockIds.includes(blockId)) {
      const updated = [...unlockedBlockIds, blockId];
      setUnlockedBlockIds(updated);
      try {
        localStorage.setItem(UNLOCKED_BLOCKS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save unlocked block', e);
      }
    }
  };

  // Быстрое обновление данных конкретного блока
  const handleUpdateBlockData = (blockId: string, newData: any) => {
    setConfig((prevConfig) => {
      const updated: GreetingConfig = {
        ...prevConfig,
        blocks: prevConfig.blocks.map((b) =>
          b.id === blockId ? { ...b, data: { ...b.data, ...newData } } : b
        ),
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save config to localStorage', e);
      }
      return updated;
    });
  };

  // Обновление списка ретро-игр и карточек воспоминаний на 2-й странице
  const handleUpdateRetroGames = (updatedGames: RetroGameItem[]) => {
    setConfig((prevConfig) => {
      const updated: GreetingConfig = {
        ...prevConfig,
        retroGames: updatedGames,
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save retro games to localStorage', e);
      }
      return updated;
    });
  };

  return (
    <div id="top" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Верхняя панель с переключателем страниц */}
      <TopBar
        activePage={activePage}
        onSelectPage={setActivePage}
        unlockedCount={unlockedBlockIds.filter((id) => visibleBlocks.some((b) => b.id === id)).length}
        totalCount={visibleBlocks.length}
        isEditorOpen={isEditorOpen}
        onToggleEditor={() => setIsEditorOpen(!isEditorOpen)}
      />

      {/* Основной контент: Страница 1 (Поздравление) или Страница 2 (Ретро-Игры) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6">
        {activePage === 'greeting' ? (
          <>
            {/* Главный экран приветствия */}
            <HeroHeader
              friend={config.friend}
              totalBlocks={visibleBlocks.length}
              unlockedCount={unlockedBlockIds.filter((id) => visibleBlocks.some((b) => b.id === id)).length}
            />

            {/* Интерактивное меню глав поздравления */}
            <GreetingMenu blocks={config.blocks} unlockedIds={unlockedBlockIds} />

            {/* Кусочки пазла (блоки) */}
            <div className="space-y-6">
              {visibleBlocks.map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  isUnlocked={unlockedBlockIds.includes(block.id)}
                  onUnlock={() => handleUnlockBlock(block.id)}
                  onUpdateData={(newData) => handleUpdateBlockData(block.id, newData)}
                />
              ))}
            </div>

            {/* Приглашение перейти на 2-ю страницу с ретро-играми */}
            <section className="mt-12 bg-slate-900/80 border border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <span>Секретная вторая страница</span>
                  <span aria-hidden="true">·</span>
                  <span>Олдовые браузерные игры</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                  <Gamepad2 className="w-6 h-6 text-amber-400 shrink-0" />
                  <span>Ретро-Зал Игр: Танки в лабиринте 4 и Superfighters</span>
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Заходи в нашу секретную комнату, чтобы зарубиться в Танки в лабиринте 4 и
                  Superfighters прямо в браузере (на одной клавиатуре) и почитать карточки наших
                  воспоминаний.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActivePage('retro_arcade');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Открыть Ретро-Зал Игр</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </section>
          </>
        ) : (
          <RetroArcadePage
            friendName={config.friend.name}
            games={config.retroGames || INITIAL_GREETING_CONFIG.retroGames || []}
            onUpdateGames={handleUpdateRetroGames}
            onBackToGreeting={() => {
              setActivePage('greeting');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Подвал */}
      <footer className="mt-20 py-8 border-t border-slate-900 bg-slate-950/60 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            Сделано с душой для {config.friend.name} · «Пазл поздравлений»
          </p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setActivePage(activePage === 'greeting' ? 'retro_arcade' : 'greeting');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-slate-400 hover:text-amber-300 transition-colors"
            >
              {activePage === 'greeting' ? 'Перейти в Ретро-Зал Игр' : 'Вернуться к поздравлению'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              Редактировать поздравление
            </button>
          </div>
        </div>
      </footer>

      {/* Модальное окно визуального редактора */}
      <EditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onResetConfig={handleResetConfig}
      />
    </div>
  );
}

