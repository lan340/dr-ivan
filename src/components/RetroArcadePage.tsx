import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Play,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  ArrowLeft,
  Keyboard,
  BookOpen,
  ShieldCheck,
  Globe,
  Download,
  HelpCircle,
} from 'lucide-react';
import { RetroGameItem, RetroGameMemoryItem, RetroGameControlItem } from '../types/greeting';

declare global {
  interface Window {
    __SF_SWF_PARTS__?: string[];
    __ON_SF_SWF_PART__?: (index: number) => void;
    RufflePlayer?: any;
  }
}

function loadScriptElement(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-sf-src="${src}"]`) as HTMLScriptElement | null;
    if (existing && existing.dataset.loaded === 'true') {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.sfSrc = src;
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => {
      s.remove();
      reject(new Error(`Не удалось загрузить скрипт: ${src}`));
    };
    document.body.appendChild(s);
  });
}

async function ensureSuperfightersSwfPartsLoaded(
  onProgress?: (loadedCount: number, totalCount: number) => void
): Promise<string[]> {
  const TOTAL_PARTS = 6;
  if (
    Array.isArray(window.__SF_SWF_PARTS__) &&
    window.__SF_SWF_PARTS__.filter(Boolean).length === TOTAL_PARTS
  ) {
    onProgress?.(TOTAL_PARTS, TOTAL_PARTS);
    return window.__SF_SWF_PARTS__;
  }

  window.__SF_SWF_PARTS__ = window.__SF_SWF_PARTS__ || [];
  let count = window.__SF_SWF_PARTS__.filter(Boolean).length;
  onProgress?.(count, TOTAL_PARTS);

  window.__ON_SF_SWF_PART__ = () => {
    count = (window.__SF_SWF_PARTS__ || []).filter(Boolean).length;
    onProgress?.(count, TOTAL_PARTS);
  };

  const promises: Promise<void>[] = [];
  for (let i = 0; i < TOTAL_PARTS; i++) {
    if (!window.__SF_SWF_PARTS__[i]) {
      promises.push(loadScriptElement(`/api/ruffle-v10/sf_swf_${i}.js`));
    }
  }
  await Promise.all(promises);
  return window.__SF_SWF_PARTS__;
}

function buildStandaloneSuperfightersHtml(joinedBase64: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Superfighters — Автономная версия (Standalone HTML)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; font-family: system-ui, sans-serif; }
    #player_wrap { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; }
    ruffle-player { width: 100%; height: 100%; display: block; }
  </style>
  <script>
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = {
      preferredRenderer: "webgl",
      autoplay: "on",
      unmuteOverlay: "visible",
      backgroundColor: "#000000",
      letterbox: "on",
      warnOnUnsupportedContent: false,
      scale: "showAll",
      forceScale: true,
      quality: "high"
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle/ruffle.js"></script>
</head>
<body>
  <div id="player_wrap"></div>
  <script>
    (function() {
      var b64 = "${joinedBase64}";
      var bin = window.atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      window.addEventListener("DOMContentLoaded", function() {
        var ruffle = window.RufflePlayer.newest();
        var player = ruffle.createPlayer();
        document.getElementById("player_wrap").appendChild(player);
        player.style.width = "100%";
        player.style.height = "100%";
        var loadCfg = {
          data: bytes,
          swfFileName: "575163_Superfighters.swf",
          autoplay: "on",
          unmuteOverlay: "visible",
          backgroundColor: "#000000",
          scale: "showAll",
          forceScale: true
        };
        if (typeof player.ruffle === "function") player.ruffle().load(loadCfg);
        else player.load(loadCfg);
      });
    })();
  </script>
</body>
</html>`;
}

const SuperfightersDirectPlayer: React.FC<{
  onDownloadStandalone: () => void;
  isDownloadingStandalone: boolean;
}> = ({ onDownloadStandalone, isDownloadingStandalone }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [statusText, setStatusText] = useState<string>('Загрузка пакетов игры (0/6)...');
  const [progressPct, setProgressPct] = useState<number>(8);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    let playerInstance: any = null;

    async function initPlayer() {
      try {
        try {
          Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
        } catch {
          // ignore
        }

        const parts = await ensureSuperfightersSwfPartsLoaded((loaded, total) => {
          if (cancelled) return;
          const pct = Math.min(85, Math.round((loaded / total) * 80) + 8);
          setProgressPct(pct);
          setStatusText(`Загрузка Superfighters: пакет ${loaded} из ${total} (${pct}%)`);
        });

        if (cancelled) return;
        setProgressPct(92);
        setStatusText('Подключение движка Ruffle CDN...');

        window.RufflePlayer = window.RufflePlayer || {};
        window.RufflePlayer.config = {
          preferredRenderer: 'webgl',
          autoplay: 'on',
          unmuteOverlay: 'visible',
          backgroundColor: '#000000',
          letterbox: 'on',
          warnOnUnsupportedContent: false,
          contextMenu: 'on',
          scale: 'showAll',
          forceScale: true,
          quality: 'high',
        };

        if (!window.RufflePlayer?.newest) {
          try {
            await loadScriptElement('https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle/ruffle.js');
          } catch {
            await loadScriptElement('https://unpkg.com/@ruffle-rs/ruffle/ruffle.js');
          }
        }

        if (cancelled || !containerRef.current) return;
        setProgressPct(98);
        setStatusText('Распаковка SWF и запуск...');

        const joined = parts.join('');
        const binStr = window.atob(joined);
        const swfBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          swfBytes[i] = binStr.charCodeAt(i);
        }

        const ruffle = window.RufflePlayer.newest();
        const player = ruffle.createPlayer();
        playerInstance = player;

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(player);
        player.style.width = '100%';
        player.style.height = '100%';
        player.style.display = 'block';

        const hideSplash = () => {
          if (cancelled) return;
          setIsReady(true);
          try {
            const sr = player.shadowRoot;
            if (sr) {
              const sp = sr.getElementById('splash-screen');
              if (sp) sp.classList.add('hidden');
              const ct = sr.getElementById('container');
              if (ct) ct.classList.remove('hidden');
            }
          } catch {
            // ignore
          }
        };

        player.addEventListener('loadedmetadata', hideSplash);
        player.addEventListener('loadeddata', hideSplash);

        const loadConfig = {
          data: swfBytes,
          swfFileName: '575163_Superfighters.swf',
          base: 'https://uploads.ungrounded.net/575000/',
          urlRewriteRules: [
            [
              /^https?:\/\/(www\.)?ngads\.com\/gateway_v2\.php.*/i,
              `${window.location.origin}/api/ngads-gateway`,
            ],
          ],
          parameters: {
            NewgroundsAPI_PublisherID: 1,
            NewgroundsAPI_SandboxID: '6ae0c67aca63f',
            NewgroundsAPI_SessionID: '',
            NewgroundsAPI_UserName: '<deleted>',
            NewgroundsAPI_UserID: 0,
            ng_username: '<deleted>',
            browsermode: 'default',
            ngLoadedViaRuffle: 1,
          },
          autoplay: 'on',
          unmuteOverlay: 'visible',
          backgroundColor: '#000000',
          allowScriptAccess: true,
          allowFullscreen: true,
          forceScale: true,
          scale: 'showAll',
          letterbox: 'on',
          warnOnUnsupportedContent: false,
        };

        const loadPromise =
          typeof player.ruffle === 'function'
            ? player.ruffle().load(loadConfig)
            : player.load(loadConfig);

        await loadPromise;
        hideSplash();
        player.focus?.();
      } catch (err: any) {
        if (!cancelled) {
          setStatusText(`Ошибка запуска: ${err?.message || String(err)}`);
        }
      }
    }

    initPlayer();

    return () => {
      cancelled = true;
      try {
        if (playerInstance && typeof playerInstance.remove === 'function') {
          playerInstance.remove();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
      {!isReady && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="text-lg font-extrabold tracking-wider text-amber-400 uppercase">
            Superfighters
          </div>
          <div className="text-xs sm:text-sm text-slate-300 tabular-nums">{statusText}</div>
          <div className="w-72 max-w-[85vw] h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onDownloadStandalone}
            disabled={isDownloadingStandalone}
            className="mt-2 px-3.5 py-2 text-xs font-medium text-amber-300 hover:text-amber-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isDownloadingStandalone
                ? 'Сборка файла Superfighters.html...'
                : 'Скачать автономный Superfighters.html на ПК'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

interface RetroArcadePageProps {
  friendName: string;
  games: RetroGameItem[];
  onUpdateGames: (updatedGames: RetroGameItem[]) => void;
  onBackToGreeting: () => void;
}

export const RetroArcadePage: React.FC<RetroArcadePageProps> = ({
  friendName,
  games,
  onUpdateGames,
  onBackToGreeting,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || 'tank-trouble-2');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [useCleanProxy, setUseCleanProxy] = useState<boolean>(true);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isDownloadingStandalone, setIsDownloadingStandalone] = useState<boolean>(false);

  // Редактирование или добавление карточки воспоминания
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [memoryDraft, setMemoryDraft] = useState<{
    title: string;
    tag: string;
    story: string;
    highlightQuote: string;
  }>({
    title: '',
    tag: '',
    story: '',
    highlightQuote: '',
  });
  const [isAddingMemory, setIsAddingMemory] = useState<boolean>(false);

  // Добавление новой игры в каталог
  const [isAddingGame, setIsAddingGame] = useState<boolean>(false);
  const [newGameDraft, setNewGameDraft] = useState<{
    title: string;
    subtitle: string;
    embedUrl: string;
    description: string;
    controlsText: string;
    memoryTitle: string;
    memoryStory: string;
  }>({
    title: '',
    subtitle: 'Классика браузерных игр · Игра прямо на сайте',
    embedUrl: '',
    description: '',
    controlsText: 'Стрелки / WASD + Пробел или Мышь',
    memoryTitle: '',
    memoryStory: '',
  });

  const arcadeViewportRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeGame = games.find((g) => g.id === selectedGameId) || games[0];

  const isSuperfightersActive = Boolean(
    activeGame &&
      (activeGame.id === 'superfighters' ||
        activeGame.embedUrl.includes('575163_Superfighters') ||
        activeGame.embedUrl.includes('uploads.ungrounded.net/ruffle_wrapper'))
  );

  // Вычисляем итоговый URL для iframe:
  // Когда включён «Чистый экран» (по умолчанию) — используется локальное серверное зеркало без логотипов и рекламы
  const effectiveGameUrl = React.useMemo(() => {
    if (!activeGame) return '';
    if (isSuperfightersActive) {
      return '/api/retro-mirror/superfighters/index.html';
    }
    if (useCleanProxy) {
      if (activeGame.proxyUrl) {
        return activeGame.proxyUrl;
      }
    }
    return activeGame.embedUrl;
  }, [activeGame, isSuperfightersActive, useCleanProxy]);

  const handleDownloadStandaloneHtml = async () => {
    try {
      setIsDownloadingStandalone(true);
      const parts = await ensureSuperfightersSwfPartsLoaded();
      const htmlString = buildStandaloneSuperfightersHtml(parts.join(''));
      const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Superfighters-Standalone.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Failed to build standalone HTML:', err);
    } finally {
      setIsDownloadingStandalone(false);
    }
  };

  // Выход из полноэкранного режима по клавише Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Синхронизация нативного Fullscreen API
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // Оставляем возможность как нативного, так и оконного полноэкранного режима
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  const focusGameFrame = () => {
    setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.focus();
        try {
          iframeRef.current.contentWindow?.focus();
        } catch {
          // Игнорируем ошибку cross-origin фокуса при прямом URL
        }
      }
    }, 80);
  };

  const handleStartGame = () => {
    setIsPlaying(true);
    focusGameFrame();
  };

  const handleReloadGame = () => {
    setIframeKey((prev) => prev + 1);
    setIsPlaying(true);
    focusGameFrame();
  };

  const handleToggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (!isPlaying) {
        setIsPlaying(true);
      }
      if (arcadeViewportRef.current && arcadeViewportRef.current.requestFullscreen) {
        try {
          await arcadeViewportRef.current.requestFullscreen();
        } catch {
          // Если браузер в iframe блокирует нативный Fullscreen, работает полноэкранный CSS-режим
        }
      }
      focusGameFrame();
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
    }
  };

  // Начать редактирование воспоминания
  const handleStartEditMemory = (mem: RetroGameMemoryItem) => {
    setEditingMemoryId(mem.id);
    setIsAddingMemory(false);
    setMemoryDraft({
      title: mem.title,
      tag: mem.tag || '',
      story: mem.story,
      highlightQuote: mem.highlightQuote || '',
    });
  };

  // Сохранить отредактированное воспоминание
  const handleSaveMemory = () => {
    if (!activeGame || !memoryDraft.title.trim() || !memoryDraft.story.trim()) return;

    const updatedGames = games.map((game) => {
      if (game.id !== activeGame.id) return game;

      if (isAddingMemory) {
        const newMem: RetroGameMemoryItem = {
          id: `mem-${Date.now()}`,
          title: memoryDraft.title.trim(),
          tag: memoryDraft.tag.trim() || 'Воспоминание из игрового зала',
          story: memoryDraft.story.trim(),
          highlightQuote: memoryDraft.highlightQuote.trim() || undefined,
        };
        return {
          ...game,
          memories: [...game.memories, newMem],
        };
      }

      return {
        ...game,
        memories: game.memories.map((m) =>
          m.id === editingMemoryId
            ? {
                ...m,
                title: memoryDraft.title.trim(),
                tag: memoryDraft.tag.trim(),
                story: memoryDraft.story.trim(),
                highlightQuote: memoryDraft.highlightQuote.trim() || undefined,
              }
            : m
        ),
      };
    });

    onUpdateGames(updatedGames);
    setEditingMemoryId(null);
    setIsAddingMemory(false);
  };

  const handleDeleteMemory = (memId: string) => {
    if (!activeGame) return;
    const updatedGames = games.map((game) =>
      game.id === activeGame.id
        ? { ...game, memories: game.memories.filter((m) => m.id !== memId) }
        : game
    );
    onUpdateGames(updatedGames);
  };

  // Добавление новой игры по ссылке
  const handleAddNewGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameDraft.title.trim() || !newGameDraft.embedUrl.trim()) return;

    const newId = `game-${Date.now()}`;
    const controlsList: RetroGameControlItem[] = [
      {
        playerLabel: 'Основное управление',
        keys: newGameDraft.controlsText.trim() || 'Клавиатура + Мышь',
        actionNote: 'Управление в окне браузера',
      },
    ];

    const initialMemories: RetroGameMemoryItem[] = newGameDraft.memoryTitle.trim()
      ? [
          {
            id: `mem-${Date.now()}`,
            title: newGameDraft.memoryTitle.trim(),
            tag: 'Ностальгия · Добавлено в коллекцию',
            story:
              newGameDraft.memoryStory.trim() ||
              'Ещё одна легендарная игра из нашей золотой коллекции браузерных баталий.',
          },
        ]
      : [];

    const createdGame: RetroGameItem = {
      id: newId,
      title: newGameDraft.title.trim(),
      subtitle: newGameDraft.subtitle.trim() || 'Браузерная классика',
      embedUrl: newGameDraft.embedUrl.trim(),
      playersInfo: 'Одиночный или парный режим',
      eraInfo: 'Классика браузерных игр',
      description:
        newGameDraft.description.trim() ||
        'Встроенная браузерная игра из вашей личной ретро-коллекции.',
      controls: controlsList,
      memories: initialMemories,
    };

    const updated = [...games, createdGame];
    onUpdateGames(updated);
    setSelectedGameId(newId);
    setIsPlaying(false);
    setIsAddingGame(false);
    setNewGameDraft({
      title: '',
      subtitle: 'Классика браузерных игр · Игра прямо на сайте',
      embedUrl: '',
      description: '',
      controlsText: 'Стрелки / WASD + Пробел или Мышь',
      memoryTitle: '',
      memoryStory: '',
    });
  };

  const handleDeleteGame = (gameId: string) => {
    if (games.length <= 1) return;
    const filtered = games.filter((g) => g.id !== gameId);
    onUpdateGames(filtered);
    if (selectedGameId === gameId && filtered[0]) {
      setSelectedGameId(filtered[0].id);
      setIsPlaying(false);
    }
  };

  if (!activeGame) return null;

  return (
    <div className="py-8 sm:py-12 space-y-10">
      {/* Шапка второй страницы */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800/80 pb-8">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-amber-400/90 font-medium">
            <span>Секретная комната для {friendName}</span>
            <span aria-hidden="true">·</span>
            <span>Олдовые браузерные игры</span>
            <span aria-hidden="true">·</span>
            <span>Можно играть вдвоём и втроём на одной клавиатуре</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            Ретро-Зал Игр: Легендарные баталии
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Зал славы тех самых браузерных игр, в которые мы рубились часами. Выбирай игру,
            зови напарника за одну клавиатуру или разворачивай битву на весь монитор.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onBackToGreeting}
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>К пазлу-поздравлению</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingGame(!isAddingGame)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить игру по ссылке</span>
          </button>
        </div>
      </section>

      {/* Переключатель игр в каталоге (если игр несколько) */}
      {games.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl">
          {games.map((game) => {
            const isSelected = game.id === activeGame.id;
            return (
              <div key={game.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setIsPlaying(false);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>{game.title}</span>
                </button>
                {games.length > 1 && game.id !== 'tank-trouble-2' && game.id !== 'superfighters' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGame(game.id)}
                    title="Удалить игру из списка"
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Форма добавления новой игры по ссылке */}
      {isAddingGame && (
        <form
          onSubmit={handleAddNewGame}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Добавить браузерную игру</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Вставьте прямую ссылку на HTML5/Flash игру (например, с igroutka.ru или другого портала)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingGame(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Название игры *
              </label>
              <input
                type="text"
                required
                value={newGameDraft.title}
                onChange={(e) => setNewGameDraft({ ...newGameDraft, title: e.target.value })}
                placeholder="Например: Огонь и Вода / Танчики"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Прямая ссылка на игру (URL) *
              </label>
              <input
                type="url"
                required
                value={newGameDraft.embedUrl}
                onChange={(e) => setNewGameDraft({ ...newGameDraft, embedUrl: e.target.value })}
                placeholder="https://g2.igroutka.ru/games/..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Краткое описание или жанр
              </label>
              <input
                type="text"
                value={newGameDraft.subtitle}
                onChange={(e) => setNewGameDraft({ ...newGameDraft, subtitle: e.target.value })}
                placeholder="Игра на двоих · Аркада"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Клавиши управления
              </label>
              <input
                type="text"
                value={newGameDraft.controlsText}
                onChange={(e) =>
                  setNewGameDraft({ ...newGameDraft, controlsText: e.target.value })
                }
                placeholder="Стрелки + Пробел / WASD"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Заголовок первого воспоминания (по желанию)
              </label>
              <input
                type="text"
                value={newGameDraft.memoryTitle}
                onChange={(e) =>
                  setNewGameDraft({ ...newGameDraft, memoryTitle: e.target.value })
                }
                placeholder="Как мы проходили сложные уровни..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Текст воспоминания
              </label>
              <input
                type="text"
                value={newGameDraft.memoryStory}
                onChange={(e) =>
                  setNewGameDraft({ ...newGameDraft, memoryStory: e.target.value })
                }
                placeholder="Напишите вашу историю, связанную с этой игрой"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingGame(false)}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Сохранить и открыть игру</span>
            </button>
          </div>
        </form>
      )}

      {/* Главный игровой корпус (Arcade Cabinet) */}
      <section
        ref={arcadeViewportRef}
        className={
          isFullscreen
            ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-3 sm:p-5'
            : 'bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl'
        }
      >
        {/* Верхняя панель управления игровым экраном */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <Gamepad2 className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{activeGame.title}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{activeGame.playersInfo}</span>
              <span aria-hidden="true">·</span>
              <span>{activeGame.eraInfo}</span>
            </div>
          </div>

          {/* Кнопки управления окном игры */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Переключатель чистого прокси / прямого URL (если у игры есть чистое зеркало) */}
            {activeGame.proxyUrl && (
              <button
                type="button"
                onClick={() => {
                  setUseCleanProxy(!useCleanProxy);
                  setIframeKey((prev) => prev + 1);
                }}
                title="Переключить режим загрузки (чистое зеркало без баннеров или прямой URL)"
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {useCleanProxy ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Чистый экран</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>Прямой URL</span>
                  </>
                )}
              </button>
            )}

            {/* Перезапуск игры */}
            {isPlaying && (
              <button
                type="button"
                onClick={handleReloadGame}
                className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Перезапустить</span>
              </button>
            )}

            {/* Полноэкранный режим */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Выйти из полного экрана (Esc)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>На весь экран</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Игровой экран (Заставка или активный Iframe) */}
        <div
          onClick={() => {
            if (isPlaying) {
              focusGameFrame();
            }
          }}
          className={`relative bg-black w-full flex items-center justify-center ${
            isFullscreen ? 'flex-1 min-h-0' : 'aspect-[3/2] min-h-[480px] max-h-[680px]'
          }`}
        >
          {!isPlaying ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
              {/* Схематичная иллюстрация лабиринта с танками */}
              <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-inner">
                <Gamepad2 className="w-11 h-11 text-amber-400" />
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {activeGame.title}
              </h3>

              <p className="text-slate-400 text-sm sm:text-base max-w-xl mb-6 leading-relaxed">
                {activeGame.description}
              </p>

              {/* Краткая сводка клавиш перед стартом */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-8 text-left">
                {activeGame.controls.map((ctrl, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800/90"
                  >
                    <div className="text-xs text-slate-400 mb-1">{ctrl.playerLabel}</div>
                    <div className="text-xs sm:text-sm font-mono font-semibold text-amber-300 tabular-nums">
                      {ctrl.keys}
                    </div>
                    {ctrl.actionNote && (
                      <div className="text-[11px] text-slate-500 mt-1">{ctrl.actionNote}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="px-6 py-3 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-transform active:scale-95 flex items-center gap-2 shadow-lg shadow-amber-400/10 whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Запустить игру</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="px-5 py-3 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Maximize2 className="w-4 h-4 text-amber-400" />
                  <span>Запустить на весь экран</span>
                </button>
              </div>
            </div>
          ) : (
            <iframe
              key={`${activeGame.id}-${iframeKey}-${useCleanProxy ? 'proxy' : 'direct'}`}
              ref={iframeRef}
              src={effectiveGameUrl}
              title={activeGame.title}
              className="w-full h-full border-0 bg-black"
              allow="autoplay; fullscreen; gamepad; clipboard-write"
              referrerPolicy="no-referrer"
              onLoad={focusGameFrame}
            />
          )}
        </div>

        {/* Нижняя подсказка под игровым окном */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Совет: если танк не реагирует на клавиши, кликните мышкой один раз прямо по игровому полю.
            </span>
          </div>

          {isPlaying && (
            <button
              type="button"
              onClick={() => {
                focusGameFrame();
              }}
              className="text-amber-300 hover:text-amber-200 font-medium underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Вернуть фокус клавиатуры в игру
            </button>
          )}
        </div>
      </section>

      {/* Памятка управления на одной клавиатуре */}
      <section className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span>Раскладка управления для {activeGame.title}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Можно сражаться против легендарного пса-бота Лайки (Laika) или устроить дуэль до 3 человек за одним ПК
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeGame.controls.map((ctrl, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between gap-2"
            >
              <div className="text-xs font-medium text-slate-400">{ctrl.playerLabel}</div>
              <div className="text-sm font-mono font-bold text-amber-300 tabular-nums">
                {ctrl.keys}
              </div>
              {ctrl.actionNote && (
                <div className="text-xs text-slate-500">{ctrl.actionNote}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Карточки ваших воспоминаний к игре */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>Карточки ваших воспоминаний к игре</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Истории, крылатые фразы и локальные мемы ваших баталий в «{activeGame.title}»
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsAddingMemory(true);
              setEditingMemoryId(null);
              setMemoryDraft({
                title: '',
                tag: 'Ностальгия · Наше воспоминание',
                story: '',
                highlightQuote: '',
              });
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Добавить воспоминание</span>
          </button>
        </div>

        {/* Форма создания или редактирования карточки воспоминания */}
        {(isAddingMemory || editingMemoryId) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {isAddingMemory
                  ? 'Новое воспоминание об игре'
                  : 'Редактирование карточки воспоминания'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingMemory(false);
                  setEditingMemoryId(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Заголовок истории *
                </label>
                <input
                  type="text"
                  value={memoryDraft.title}
                  onChange={(e) => setMemoryDraft({ ...memoryDraft, title: e.target.value })}
                  placeholder="Например: Как мы делили одну клавиатуру"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Подпись / рубрика
                </label>
                <input
                  type="text"
                  value={memoryDraft.tag}
                  onChange={(e) => setMemoryDraft({ ...memoryDraft, tag: e.target.value })}
                  placeholder="Локальный мультиплеер · Эмоции"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Текст воспоминания *
              </label>
              <textarea
                rows={3}
                value={memoryDraft.story}
                onChange={(e) => setMemoryDraft({ ...memoryDraft, story: e.target.value })}
                placeholder="Напишите саму историю..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Коронная фраза или цитата из катки (необязательно)
              </label>
              <input
                type="text"
                value={memoryDraft.highlightQuote}
                onChange={(e) =>
                  setMemoryDraft({ ...memoryDraft, highlightQuote: e.target.value })
                }
                placeholder="«Не стреляй в упор, сейчас обоих накроет!»"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingMemory(false);
                  setEditingMemoryId(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveMemory}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Сохранить воспоминание</span>
              </button>
            </div>
          </div>
        )}

        {/* Сетка карточек воспоминаний */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeGame.memories.map((mem, idx) => (
            <article
              key={mem.id}
              className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                {/* Чистые некапсульные метаданные с разделителем · */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-amber-400/90">
                    <span>История #{idx + 1}</span>
                    {mem.tag && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-400">{mem.tag}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEditMemory(mem)}
                      title="Редактировать воспоминание"
                      className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {activeGame.memories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        title="Удалить карточку"
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white">{mem.title}</h3>

                <p className="text-sm text-slate-300 leading-relaxed">{mem.story}</p>
              </div>

              {mem.highlightQuote && (
                <div className="pt-4 border-t border-slate-800/80 text-xs sm:text-sm italic text-amber-200/90">
                  {mem.highlightQuote}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
