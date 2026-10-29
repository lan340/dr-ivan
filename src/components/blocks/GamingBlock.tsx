import React, { useState } from 'react';
import {
  Gamepad2,
  Crosshair,
  Flame,
  Trophy,
  Award,
  Shield,
  Search,
  Sliders,
  Sparkles,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { PuzzleBlock, GamingContent, TankStats, SteamStats } from '../../types/greeting';
import {
  getWN8Tier,
  GAMING_PRESETS,
  fetchRealTankiStats,
  fetchRealBlitzStats,
  fetchRealSteamStats,
  resolveSteamAvatarUrl,
  resolveSteamFrameUrl,
  resolveGameImageUrl,
  resolveTankImageByName,
  normalizeTankTitle,
  TANK_AVATAR_PRESETS,
  TankiCandidate,
  SteamCandidate,
} from '../../utils/gamingStats';
import { fireCelebrationConfetti } from '../../utils/confetti';

interface GamingBlockProps {
  block: PuzzleBlock;
  onUnlock?: () => void;
  isUnlocked?: boolean;
  onUpdateData?: (newData: Partial<GamingContent>) => void;
}

export const GamingBlock: React.FC<GamingBlockProps> = ({
  block,
  onUnlock,
  isUnlocked = false,
  onUpdateData,
}) => {
  const content = block.data as GamingContent;
  const [activeTab, setActiveTab] = useState<'tanki' | 'blitz' | 'steam'>('tanki');
  const [showSearchModal, setShowSearchModal] = useState(false);

  // ОТДЕЛЬНЫЕ поисковые поля для каждой из 3 игр!
  const [tankiQuery, setTankiQuery] = useState(content?.tanki?.nickname || 'LeBwa');
  const [blitzQuery, setBlitzQuery] = useState(content?.blitz?.nickname || '');
  const [steamQuery, setSteamQuery] = useState(content?.steam?.steamNick || 'm0NESY');

  // Состояния загрузки и ответов отдельно для каждой игры
  const [loadingTanki, setLoadingTanki] = useState(false);
  const [loadingBlitz, setLoadingBlitz] = useState(false);
  const [loadingSteam, setLoadingSteam] = useState(false);

  const [tankiFeedback, setTankiFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [blitzFeedback, setBlitzFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [steamFeedback, setSteamFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [tankiCandidates, setTankiCandidates] = useState<TankiCandidate[]>([]);
  const [blitzCandidates, setBlitzCandidates] = useState<TankiCandidate[]>([]);
  const [steamCandidates, setSteamCandidates] = useState<SteamCandidate[]>([]);

  // Локальный режим быстрого редактирования прямо в блоке
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [editableTanki, setEditableTanki] = useState<TankStats>(
    content?.tanki || {
      nickname: 'LeBwa',
      server: 'RU · Lesta Games',
      battles: 25000,
      winrate: 58.0,
      avgDamage: 2400,
      ratingWN8: 2400,
      ratingTitle: 'Бирюза',
      survivalRate: 39.5,
      favoriteTanks: ['ИС-7', 'Объект 140'],
      medals: ['Воин', 'Мастер'],
    }
  );
  const [editableBlitz, setEditableBlitz] = useState<TankStats>(
    content?.blitz || {
      nickname: 'Blitz_Legend_RU',
      server: 'Tanks Blitz · Lesta RU',
      battles: 10000,
      winrate: 60.0,
      avgDamage: 2000,
      ratingWN8: 2400,
      ratingTitle: 'Мастер',
      survivalRate: 42.0,
      favoriteTanks: ['Progetto 46'],
      medals: ['Воин'],
    }
  );
  const [editableSteam, setEditableSteam] = useState<SteamStats>(
    content?.steam || {
      steamNick: 'm0NESY',
      level: 30,
      totalHours: 3500,
      favoriteGames: [{ name: 'Counter-Strike 2', hours: 2000 }],
    }
  );

  const [steamAvatarError, setSteamAvatarError] = useState(false);
  const [steamFrameError, setSteamFrameError] = useState(false);
  const [tankiAvatarError, setTankiAvatarError] = useState(false);
  const [tankiBadgeError, setTankiBadgeError] = useState(false);
  const [blitzAvatarError, setBlitzAvatarError] = useState(false);
  const [blitzBadgeError, setBlitzBadgeError] = useState(false);

  const resolvedSteamAvatar = resolveSteamAvatarUrl(content?.steam?.avatarUrl);
  const resolvedSteamFrame = resolveSteamFrameUrl(content?.steam?.avatarFrameUrl);

  const resolvedTankiAvatar = resolveGameImageUrl(content?.tanki?.avatarUrl);
  const resolvedTankiBadge = resolveGameImageUrl(content?.tanki?.badgeUrl);
  const resolvedTankiClanEmblem = resolveGameImageUrl(content?.tanki?.clanEmblemUrl);
  const resolvedTankiTopTank = resolveGameImageUrl(content?.tanki?.topTankImageUrl);

  const resolvedBlitzAvatar = resolveGameImageUrl(content?.blitz?.avatarUrl);
  const resolvedBlitzBadge = resolveGameImageUrl(content?.blitz?.badgeUrl);
  const resolvedBlitzTopTank = resolveGameImageUrl(content?.blitz?.topTankImageUrl);

  // Синхронизация при изменении props
  React.useEffect(() => {
    if (content?.tanki) {
      setEditableTanki(content.tanki);
      if (content.tanki.nickname) setTankiQuery(content.tanki.nickname);
      setTankiAvatarError(false);
      setTankiBadgeError(false);
    }
    if (content?.blitz) {
      setEditableBlitz(content.blitz);
      if (content.blitz.nickname) setBlitzQuery(content.blitz.nickname);
      setBlitzAvatarError(false);
      setBlitzBadgeError(false);
    }
    if (content?.steam) {
      setEditableSteam(content.steam);
      if (content.steam.steamNick) setSteamQuery(content.steam.steamNick);
      setSteamAvatarError(false);
      setSteamFrameError(false);
    }
  }, [content]);

  // Автовосстановление аватарки/рамки Steam, сортировки по часам и дробных часов для игр из недавней активности (например, SULFUR)
  const attemptedAutoAvatarRef = React.useRef<string>('');
  React.useEffect(() => {
    const nick = content?.steam?.steamNick?.trim();
    const srcUrl = content?.steam?.sourceUrl?.trim();
    const games = content?.steam?.favoriteGames || [];
    const hasOldActivityLabel = games.some(
      (g) => g.genre === 'Активность в Steam'
    );
    const isUnsortedByHours = games.some(
      (g, i) => i > 0 && (g.hours || 0) > (games[i - 1].hours || 0)
    );
    const needsAvatarOrFrame =
      !resolvedSteamAvatar ||
      (!resolvedSteamFrame && content?.steam?.avatarFrameUrl === undefined) ||
      hasOldActivityLabel ||
      isUnsortedByHours;

    if (needsAvatarOrFrame && (nick || srcUrl)) {
      const key = `${nick || ''}|${srcUrl || ''}|${hasOldActivityLabel ? 'act' : ''}|${isUnsortedByHours ? 'sort' : ''}`;
      if (attemptedAutoAvatarRef.current === key) return;
      attemptedAutoAvatarRef.current = key;

      fetchRealSteamStats(nick || '', srcUrl).then((res) => {
        if (res.found && res.stats && onUpdateData) {
          onUpdateData({
            steam: {
              ...content.steam,
              ...res.stats,
              avatarUrl: res.stats.avatarUrl || content.steam.avatarUrl,
              avatarFrameUrl: res.stats.avatarFrameUrl ?? content.steam.avatarFrameUrl ?? '',
              totalHours: res.stats.totalHours > 0 ? res.stats.totalHours : content.steam.totalHours,
              sourceUrl: res.sourceUrl || content.steam.sourceUrl,
            },
          });
        }
      });
    }
  }, [
    resolvedSteamAvatar,
    resolvedSteamFrame,
    content?.steam?.steamNick,
    content?.steam?.sourceUrl,
    content?.steam?.favoriteGames,
  ]);

  // Автообновление иконок всех 4 танков для сохранённых профилей «Мир Танков» и «Tanks Blitz» (включая замену Танк #30209 -> МС-11)
  const attemptedTankiIconsRef = React.useRef<string>('');
  React.useEffect(() => {
    const nick = content?.tanki?.nickname?.trim();
    const accId = content?.tanki?.accountId?.trim();
    const missingAllTankImages = !content?.tanki?.tankImages || content.tanki.tankImages.length < 2;
    if (nick && missingAllTankImages && onUpdateData) {
      const key = `${nick}|${accId || ''}`;
      if (attemptedTankiIconsRef.current === key) return;
      attemptedTankiIconsRef.current = key;
      fetchRealTankiStats(nick, accId).then((res) => {
        if (res.found && res.stats) {
          onUpdateData({
            tanki: {
              ...content.tanki,
              ...res.stats,
              avatarUrl: content.tanki.avatarUrl || res.stats.avatarUrl,
              funnyTitle: content.tanki.funnyTitle,
            },
          });
        }
      });
    }
  }, [content?.tanki?.nickname, content?.tanki?.accountId, content?.tanki?.tankImages]);

  const attemptedBlitzIconsRef = React.useRef<string>('');
  React.useEffect(() => {
    const nick = content?.blitz?.nickname?.trim();
    const accId = content?.blitz?.accountId?.trim();
    const hasRawTankId = content?.blitz?.favoriteTanks?.some((t) => /Танк\s*#\d+/i.test(t));
    const missingAllBlitzImages = !content?.blitz?.tankImages || content.blitz.tankImages.length < 2;
    if (nick && nick !== 'Blitz_Legend_RU' && (hasRawTankId || missingAllBlitzImages) && onUpdateData) {
      const key = `${nick}|${accId || ''}`;
      if (attemptedBlitzIconsRef.current === key) return;
      attemptedBlitzIconsRef.current = key;
      fetchRealBlitzStats(nick, accId).then((res) => {
        if (res.found && res.stats) {
          onUpdateData({
            blitz: {
              ...content.blitz,
              ...res.stats,
              avatarUrl: content.blitz.avatarUrl || res.stats.avatarUrl,
              funnyTitle: content.blitz.funnyTitle,
            },
          });
        }
      });
    }
  }, [content?.blitz?.nickname, content?.blitz?.accountId, content?.blitz?.tankImages, content?.blitz?.favoriteTanks]);

  const handleTabChange = (tab: 'tanki' | 'blitz' | 'steam') => {
    setActiveTab(tab);
    if (!isUnlocked && onUnlock) {
      onUnlock();
    }
  };

  const currentTankiWN8 = getWN8Tier(content?.tanki?.ratingWN8 || 2450);
  const currentBlitzWN8 = getWN8Tier(content?.blitz?.ratingWN8 || 2200);

  // ============================================================================
  // 1. Поиск реального игрока в «Мире Танков» (tanki.su + kttc.ru)
  // ============================================================================
  const handleSearchTanki = async (customNick?: string, accountId?: string) => {
    const query = (customNick ?? tankiQuery).trim();
    if (!query && !accountId) return;

    setLoadingTanki(true);
    setTankiFeedback(null);

    const res = await fetchRealTankiStats(query, accountId);
    setLoadingTanki(false);

    if (res.found && res.stats) {
      setTankiCandidates(res.candidates || []);
      const updatedTanki: TankStats = {
        ...content.tanki,
        ...res.stats,
        funnyTitle: content?.tanki?.funnyTitle || 'Главный кошмар вражеских статистов и повелитель кустов Малиновки',
        kttcUrl: res.kttcUrl,
        sourceUrl: res.sourceUrl,
        isRealData: true,
      };
      setTankiQuery(updatedTanki.nickname);
      setEditableTanki(updatedTanki);
      if (onUpdateData) {
        onUpdateData({ tanki: updatedTanki });
      }
      setTankiFeedback({
        type: 'ok',
        text: `Реальная статистика игрока «${updatedTanki.nickname}» загружена с серверов Lesta (tanki.su & KTTC)!`,
      });
      fireCelebrationConfetti();
    } else {
      setTankiFeedback({
        type: 'err',
        text: res.error || 'Не удалось найти игрока в «Мире Танков». Проверьте точное написание ника.',
      });
    }
  };

  // ============================================================================
  // 2. Поиск реального игрока в «Tanks Blitz» (Lesta API / blitz-commander.by)
  // ============================================================================
  const handleSearchBlitz = async (customNick?: string, accountId?: string) => {
    const query = (customNick ?? blitzQuery).trim();
    if (!query && !accountId) return;

    setLoadingBlitz(true);
    setBlitzFeedback(null);

    const res = await fetchRealBlitzStats(query, accountId);
    setLoadingBlitz(false);

    if (res.found && res.stats) {
      setBlitzCandidates(res.candidates || []);
      const updatedBlitz: TankStats = {
        ...content.blitz,
        ...res.stats,
        funnyTitle: content?.blitz?.funnyTitle || 'Умудряется тащить даже в самой проигрышной ситуации',
        sourceUrl: res.sourceUrl,
        isRealData: true,
      };
      setBlitzQuery(updatedBlitz.nickname);
      setEditableBlitz(updatedBlitz);
      if (onUpdateData) {
        onUpdateData({ blitz: updatedBlitz });
      }
      setBlitzFeedback({
        type: 'ok',
        text: `Реальная статистика игрока «${updatedBlitz.nickname}» загружена из базы Tanks Blitz (Lesta)!`,
      });
      fireCelebrationConfetti();
    } else {
      setBlitzFeedback({
        type: 'err',
        text: res.error || 'Игрок не найден в «Tanks Blitz». Проверьте точный никнейм.',
      });
    }
  };

  // ============================================================================
  // 3. Поиск реального профиля в «Steam» (steamcommunity.com)
  // ============================================================================
  const handleSearchSteam = async (customQuery?: string, profileUrl?: string) => {
    const query = (customQuery ?? steamQuery).trim();
    if (!query && !profileUrl) return;

    setLoadingSteam(true);
    setSteamFeedback(null);

    const res = await fetchRealSteamStats(query, profileUrl);
    setLoadingSteam(false);

    if (res.found && res.stats) {
      if (res.candidates && res.candidates.length > 0) {
        setSteamCandidates(res.candidates);
      }
      const updatedSteam: SteamStats = {
        ...content.steam,
        ...res.stats,
        // Если часы в Steam скрыты приватностью, сохраняем текущие часы если пользователь их уже вводил, либо показываем реальные
        totalHours: res.stats.totalHours > 0 ? res.stats.totalHours : content?.steam?.totalHours || 0,
        sourceUrl: res.sourceUrl,
        isRealData: true,
      };
      setSteamQuery(updatedSteam.steamNick);
      setEditableSteam(updatedSteam);
      if (onUpdateData) {
        onUpdateData({ steam: updatedSteam });
      }
      setSteamFeedback({
        type: 'ok',
        text: res.hoursArePrivate
          ? `Профиль Steam «${updatedSteam.steamNick}» (Ур. ${updatedSteam.level}) загружен! Часы игр скрыты настройками приватности в Steam — вы можете дополнить их вручную.`
          : `Реальный профиль Steam «${updatedSteam.steamNick}» (Ур. ${updatedSteam.level}) успешно синхронизирован!`,
      });
      fireCelebrationConfetti();
    } else {
      setSteamFeedback({
        type: 'err',
        text: res.error || 'Профиль Steam не найден. Введите никнейм, SteamID или ссылку на профиль.',
      });
    }
  };

  // Применение готового пресета (с сохранением раздельных ников!)
  const handleApplyPreset = (presetId: string) => {
    const preset = GAMING_PRESETS.find((p) => p.id === presetId);
    if (!preset || !onUpdateData) return;

    onUpdateData({
      tanki: {
        ...content.tanki,
        ...preset.tanki,
        nickname: content?.tanki?.nickname || 'LeBwa',
        isRealData: false,
      },
      blitz: {
        ...content.blitz,
        ...preset.blitz,
        nickname: content?.blitz?.nickname || 'Blitz_Legend_RU',
        isRealData: false,
      },
      steam: {
        ...content.steam,
        ...preset.steam,
        steamNick: content?.steam?.steamNick || 'm0NESY',
        isRealData: false,
      },
    });

    fireCelebrationConfetti();
    setShowSearchModal(false);
  };

  // Сохранение быстрого редактирования
  const handleSaveQuickEdit = () => {
    if (onUpdateData) {
      onUpdateData({
        tanki: editableTanki,
        blitz: editableBlitz,
        steam: editableSteam,
      });
    }
    setIsQuickEditing(false);
    fireCelebrationConfetti();
  };

  return (
    <section
      id={block.id}
      className="relative scroll-mt-24 transition-all duration-300"
      onClick={() => {
        if (!isUnlocked && onUnlock) onUnlock();
      }}
    >
      <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 sm:p-8 shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Фоновые неоновые световые акценты */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Заголовок блока */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Gamepad2 className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {block.subtitle || 'Игровой профиль легенды'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {block.title || 'Игры, танки & статистика'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {content?.headline || 'Реальные боевые заслуги в Мире Танков, Tanks Blitz и Steam (у каждой игры свой ник)'}
            </p>
          </div>

          {/* Быстрые действия: Поиск по всем 3 играм и Ручная настройка */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Найти реальные профили отдельно для Мира Танков, Blitz и Steam"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Поиск по никам (3 игры)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQuickEditing(!isQuickEditing)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isQuickEditing
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80 hover:border-amber-400/40'
              }`}
              title="Редактировать ники, винрейт, любимые танки и цифры отдельно для каждой игры"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>{isQuickEditing ? 'Закрыть редактор' : 'Настроить цифры'}</span>
            </button>
          </div>
        </div>

        {/* Переключатель вкладок 3 игр (с отображением отдельного ника каждой игры!) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 p-1.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
          <button
            type="button"
            onClick={() => handleTabChange('tanki')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 ${
              activeTab === 'tanki'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Crosshair className="w-4 h-4 shrink-0" />
              <span className="truncate">Мир Танков</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono truncate max-w-[110px] ${
                activeTab === 'tanki' ? 'bg-slate-950/25 text-slate-950 font-black' : 'bg-slate-900 text-amber-400/90'
              }`}
            >
              {content?.tanki?.nickname || 'Ник #1'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('blitz')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 ${
              activeTab === 'blitz'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span className="truncate">Tanks Blitz</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono truncate max-w-[110px] ${
                activeTab === 'blitz' ? 'bg-slate-950/25 text-slate-950 font-black' : 'bg-slate-900 text-orange-400/90'
              }`}
            >
              {content?.blitz?.nickname || 'Ник #2'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('steam')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 ${
              activeTab === 'steam'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Gamepad2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Steam & PC</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono truncate max-w-[110px] ${
                activeTab === 'steam' ? 'bg-slate-950/25 text-slate-950 font-black' : 'bg-slate-900 text-cyan-400/90'
              }`}
            >
              {content?.steam?.steamNick || 'Ник #3'}
            </span>
          </button>
        </div>

        {/* ========================================================
            ВКЛАДКА 1: МИР ТАНКОВ (LESTA / TANKI.SU + KTTC.RU)
            ======================================================== */}
        {activeTab === 'tanki' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Панель живого поиска реального аккаунта МИР ТАНКОВ */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Search className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Реальная статистика «Мир Танков» (сервер Lesta: tanki.su + KTTC):</span>
                </div>
                {content?.tanki?.sourceUrl && (
                  <div className="flex items-center gap-3 text-[11px]">
                    <a
                      href={content.tanki.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2"
                    >
                      <span>Профиль tanki.su</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {content.tanki.kttcUrl && (
                      <a
                        href={content.tanki.kttcUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline underline-offset-2"
                      >
                        <span>KTTC WN8</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={tankiQuery}
                  onChange={(e) => setTankiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchTanki()}
                  placeholder="Введите никнейм друга в Мире Танков (например, LeBwa)..."
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700/90 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => handleSearchTanki()}
                  disabled={loadingTanki}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0 shadow-md shadow-amber-500/10"
                >
                  {loadingTanki ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{loadingTanki ? 'Загрузка с Lesta...' : 'Загрузить реальный аккаунт'}</span>
                </button>
              </div>

              {/* Список найденных аккаунтов (если нашли несколько похожих ников) */}
              {tankiCandidates.length > 1 && (
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    Найденные игроки Lesta:
                  </span>
                  {tankiCandidates.map((cand) => (
                    <button
                      key={cand.accountId}
                      type="button"
                      onClick={() => handleSearchTanki(cand.nickname, cand.accountId)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                        cand.nickname.toLowerCase() === (content?.tanki?.nickname || '').toLowerCase()
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-amber-500/40'
                      }`}
                    >
                      {cand.clanEmblemUrl && (
                        <img
                          src={resolveGameImageUrl(cand.clanEmblemUrl)}
                          alt={cand.clanTag || cand.nickname}
                          className="w-4 h-4 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span>
                        {cand.nickname} {cand.clanTag ? `[${cand.clanTag}]` : ''} · {(cand.battles || 0).toLocaleString('ru-RU')} боёв ({cand.winrate}%)
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {tankiFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    tankiFeedback.type === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {tankiFeedback.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{tankiFeedback.text}</span>
                </div>
              )}
            </div>

            {/* Карточка профиля танкиста (с реальной эмблемой клана / высшей медалью Lesta и бейджем отличия) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0 m-1">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-amber-500/25 via-slate-900 to-orange-500/15 border-2 border-amber-500/50 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(245,158,11,0.2)] overflow-hidden">
                    {resolvedTankiAvatar && !tankiAvatarError ? (
                      <img
                        src={resolvedTankiAvatar}
                        alt={content?.tanki?.nickname || 'Аватар Мир Танков'}
                        onError={() => setTankiAvatarError(true)}
                        className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-3xl">🎖️</span>
                    )}
                  </div>

                  {resolvedTankiBadge &&
                    !tankiBadgeError &&
                    resolvedTankiBadge !== resolvedTankiAvatar && (
                      <div
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-slate-950/95 border border-amber-400/60 p-0.5 shadow-lg flex items-center justify-center z-10"
                        title="Высшая боевая награда профиля Lesta"
                      >
                        <img
                          src={resolvedTankiBadge}
                          alt="Знак отличия Lesta"
                          onError={() => setTankiBadgeError(true)}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                      {content?.tanki?.nickname || 'Танкист'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                      {content?.tanki?.server || 'RU · Lesta Games'}
                    </span>
                    {content?.tanki?.isRealData && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Реальный профиль Lesta
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`w-2 h-2 rounded-full ${currentTankiWN8.colorClass.replace('text-', 'bg-')} animate-pulse`}
                    />
                    <span className={`font-semibold ${currentTankiWN8.colorClass}`}>
                      Рейтинг WN8: {content?.tanki?.ratingWN8 || 2450} (
                      {content?.tanki?.ratingTitle || currentTankiWN8.label})
                    </span>
                  </p>

                  {/* Быстрый переключатель вида аватарки (Клан / Медаль / Любимый танк) */}
                  {(resolvedTankiClanEmblem || resolvedTankiBadge || resolvedTankiTopTank) && onUpdateData && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-500">Аватарка:</span>
                      {resolvedTankiClanEmblem && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateData({
                              tanki: { ...content.tanki, avatarUrl: content.tanki.clanEmblemUrl },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                            resolvedTankiAvatar === resolvedTankiClanEmblem
                              ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🛡 Эмблема клана
                        </button>
                      )}
                      {resolvedTankiBadge && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateData({
                              tanki: { ...content.tanki, avatarUrl: content.tanki.badgeUrl },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                            resolvedTankiAvatar === resolvedTankiBadge
                              ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🏅 Боевая медаль
                        </button>
                      )}
                      {resolvedTankiTopTank && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateData({
                              tanki: { ...content.tanki, avatarUrl: content.tanki.topTankImageUrl },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                            resolvedTankiAvatar === resolvedTankiTopTank
                              ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🚜 Топ-танк
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Мемное звание */}
              {content?.tanki?.funnyTitle && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-right max-w-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 block">
                    Почетное звание экипажа:
                  </span>
                  <p className="text-xs text-slate-200 font-medium italic mt-0.5">«{content.tanki.funnyTitle}»</p>
                </div>
              )}
            </div>

            {/* Сетка 4 ключевых показателей */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Процент побед */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Процент побед</span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                    {content?.tanki?.winrate ?? 58.4}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(0, content?.tanki?.winrate || 58.4))}%` }}
                  />
                </div>
              </div>

              {/* Количество боев */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Сыграно боев</span>
                  <Flame className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {(content?.tanki?.battles ?? 28410).toLocaleString('ru-RU')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">В случайных боях Lesta</span>
              </div>

              {/* Средний урон */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Средний урон</span>
                  <Crosshair className="w-4 h-4 text-rose-400" />
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
                    {(content?.tanki?.avgDamage ?? 2480).toLocaleString('ru-RU')}{' '}
                    <span className="text-xs text-slate-400 font-normal">HP</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Средний дамаг за бой</span>
              </div>

              {/* Выживаемость */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Выживаемость</span>
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                    {content?.tanki?.survivalRate ?? 39.5}%
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Мастерство сохранения ХП</span>
              </div>
            </div>

            {/* Любимые танки (Гараж / Ангар) */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Любимый ангар в «Мире Танков» (топ по боям):
                </h4>
                <span className="text-[11px] text-amber-400/80">Коронная техника</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(content?.tanki?.favoriteTanks || ['ИС-7', 'Bat.-Châtillon 25 t', 'Объект 140', 'Super Conqueror']).map(
                  (rawTank, idx) => {
                    const tank = normalizeTankTitle(rawTank);
                    const tankImgUrl = resolveTankImageByName(
                      tank,
                      content?.tanki?.tankImages?.[idx] || (idx === 0 ? content?.tanki?.topTankImageUrl : undefined)
                    );
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center gap-2.5 group"
                      >
                        <div className="relative w-14 h-10 rounded-lg bg-slate-950/90 border border-amber-500/30 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                          {tankImgUrl ? (
                            <img
                              src={tankImgUrl}
                              alt={tank}
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-amber-400 text-xs font-black">#{idx + 1}</span>
                          )}
                          <span className="absolute top-0.5 left-0.5 px-1 rounded bg-slate-950/85 text-[9px] font-black text-amber-400 leading-tight">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 group-hover:text-amber-300 break-words">
                            {tank}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {idx === 0 ? 'Коронный танк #1' : `Топ #${idx + 1} ангара`}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Медали и награды */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3.5 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Заслуженные боевые награды (Мир Танков)</span>
              </h4>

              <div className="flex flex-wrap gap-2.5">
                {(
                  content?.tanki?.medals || [
                    'Медаль Колобанова',
                    'Знак классности «Мастер»',
                    'Воин (6+ фрагов)',
                    'Основной калибр',
                  ]
                ).map((medal, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800/90 hover:border-amber-400/40 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all shadow-sm"
                  >
                    <span className="text-amber-400">🏅</span>
                    <span>{medal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ВКЛАДКА 2: TANKS BLITZ (LESTA / BLITZ-COMMANDER API)
            ======================================================== */}
        {activeTab === 'blitz' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Панель живого поиска реального аккаунта TANKS BLITZ */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-orange-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
                  <Smartphone className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Реальная статистика «Tanks Blitz» (отдельный ник · Lesta Blitz API):</span>
                </div>
                {content?.blitz?.sourceUrl && (
                  <a
                    href={content.blitz.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 text-[11px] flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Профиль Blitz Commander</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={blitzQuery}
                  onChange={(e) => setBlitzQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchBlitz()}
                  placeholder="Введите отдельный никнейм друга в Tanks Blitz..."
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700/90 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-orange-400"
                />
                <button
                  type="button"
                  onClick={() => handleSearchBlitz()}
                  disabled={loadingBlitz}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0 shadow-md shadow-orange-500/10"
                >
                  {loadingBlitz ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{loadingBlitz ? 'Поиск в Blitz...' : 'Загрузить аккаунт Blitz'}</span>
                </button>
              </div>

              {/* Список кандидатов Tanks Blitz */}
              {blitzCandidates.length > 1 && (
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-orange-400" />
                    Найденные игроки Blitz:
                  </span>
                  {blitzCandidates.map((cand) => (
                    <button
                      key={cand.accountId}
                      type="button"
                      onClick={() => handleSearchBlitz(cand.nickname, cand.accountId)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        cand.nickname.toLowerCase() === (content?.blitz?.nickname || '').toLowerCase()
                          ? 'bg-orange-500/20 border-orange-400 text-orange-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-orange-500/40'
                      }`}
                    >
                      {cand.nickname}
                    </button>
                  ))}
                </div>
              )}

              {blitzFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    blitzFeedback.type === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {blitzFeedback.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{blitzFeedback.text}</span>
                </div>
              )}
            </div>

            {/* Карточка Blitz профиля (с реальной боевой медалью / знаком Мастер и иконкой техники) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900/90 border border-orange-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0 m-1">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-orange-500/25 via-slate-900 to-amber-500/15 border-2 border-orange-500/50 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(249,115,22,0.2)] overflow-hidden">
                    {resolvedBlitzAvatar && !blitzAvatarError ? (
                      <img
                        src={resolvedBlitzAvatar}
                        alt={content?.blitz?.nickname || 'Аватар Tanks Blitz'}
                        onError={() => setBlitzAvatarError(true)}
                        className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-3xl">⚡</span>
                    )}
                  </div>

                  {resolvedBlitzBadge &&
                    !blitzBadgeError &&
                    resolvedBlitzBadge !== resolvedBlitzAvatar && (
                      <div
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-slate-950/95 border border-orange-400/60 p-0.5 shadow-lg flex items-center justify-center z-10"
                        title="Боевой знак отличия Tanks Blitz"
                      >
                        <img
                          src={resolvedBlitzBadge}
                          alt="Знак отличия Blitz"
                          onError={() => setBlitzBadgeError(true)}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                      {content?.blitz?.nickname || 'Blitz_Warrior'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/30 text-orange-300 text-[11px] font-bold">
                      {content?.blitz?.server || 'Tanks Blitz · Lesta RU'}
                    </span>
                    {content?.blitz?.isRealData && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Реальный профиль Blitz
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${currentBlitzWN8.colorClass.replace('text-', 'bg-')} animate-pulse`}
                    />
                    <span className={`font-semibold ${currentBlitzWN8.colorClass}`}>
                      Рейтинг WN8: {content?.blitz?.ratingWN8 || 2520} (
                      {content?.blitz?.ratingTitle || currentBlitzWN8.label})
                    </span>
                  </p>

                  {/* Быстрый переключатель вида аватарки Blitz */}
                  {(resolvedBlitzBadge || resolvedBlitzTopTank) && onUpdateData && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-500">Аватарка:</span>
                      {TANK_AVATAR_PRESETS.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            onUpdateData({
                              blitz: { ...content.blitz, avatarUrl: p.url },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                            resolvedBlitzAvatar === p.url
                              ? 'bg-orange-500/20 border-orange-400/60 text-orange-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                      {resolvedBlitzTopTank && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateData({
                              blitz: { ...content.blitz, avatarUrl: content.blitz.topTankImageUrl },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                            resolvedBlitzAvatar === resolvedBlitzTopTank
                              ? 'bg-orange-500/20 border-orange-400/60 text-orange-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🚜 Топ-танк
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {content?.blitz?.funnyTitle && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-right max-w-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400/80 block">
                    Стиль игры в Blitz:
                  </span>
                  <p className="text-xs text-slate-200 font-medium italic mt-0.5">«{content.blitz.funnyTitle}»</p>
                </div>
              )}
            </div>

            {/* Метрики Blitz (4 карточки) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Винрейт Blitz</span>
                  <Trophy className="w-4 h-4 text-orange-400" />
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-orange-400 tracking-tight">
                    {content?.blitz?.winrate ?? 62.4}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-300 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(0, content?.blitz?.winrate || 62.4))}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Бои в Blitz</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {(content?.blitz?.battles ?? 12600).toLocaleString('ru-RU')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Мобильные катки 7×7</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Средний урон</span>
                  <Crosshair className="w-4 h-4 text-rose-400" />
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                    {(content?.blitz?.avgDamage ?? 2150).toLocaleString('ru-RU')}{' '}
                    <span className="text-xs text-slate-400 font-normal">HP</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Средний урон за бой</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Выживаемость</span>
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                    {content?.blitz?.survivalRate ?? 44.1}%
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Выжил в боях Blitz</span>
              </div>
            </div>

            {/* Топ техника Blitz */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Коронные танки в Tanks Blitz (топ ангара):
                </h4>
                <span className="text-[11px] text-orange-400/80">Любимая техника</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(content?.blitz?.favoriteTanks || ['Progetto 46', 'T-54', 'Kranvagn', 'ИС-7']).map(
                  (rawTank, idx) => {
                    const tank = normalizeTankTitle(rawTank);
                    const tankImgUrl = resolveTankImageByName(
                      tank,
                      content?.blitz?.tankImages?.[idx] || (idx === 0 ? content?.blitz?.topTankImageUrl : undefined)
                    );
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-orange-500/40 transition-all flex items-center gap-3 group"
                      >
                        <div className="relative w-14 h-10 rounded-lg bg-slate-950/90 border border-orange-500/30 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                          {tankImgUrl ? (
                            <img
                              src={tankImgUrl}
                              alt={tank}
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-orange-400 font-bold text-xs">#{idx + 1}</span>
                          )}
                          <span className="absolute top-0.5 left-0.5 px-1 rounded bg-slate-950/85 text-[9px] font-black text-orange-400 leading-tight">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 group-hover:text-orange-300 break-words">
                            {tank}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {idx === 0 ? 'Коронный танк #1' : `Топ #${idx + 1} по боям в Blitz`}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Медали Tanks Blitz */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3.5 flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-400" />
                <span>Боевые награды в Tanks Blitz</span>
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {(content?.blitz?.medals || ['Герой Расейняя', 'Воин', 'Основной калибр', 'Снайпер']).map(
                  (medal, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800/90 hover:border-orange-400/40 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all shadow-sm"
                    >
                      <span className="text-orange-400">⚡</span>
                      <span>{medal}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ВКЛАДКА 3: STEAM & PC (ОТДЕЛЬНЫЙ НИК / ССЫЛКА STEAM)
            ======================================================== */}
        {activeTab === 'steam' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Панель живого поиска реального профиля STEAM */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Реальный профиль Steam (по нику, SteamID или ссылке steamcommunity.com):</span>
                </div>
                {content?.steam?.sourceUrl && (
                  <a
                    href={content.steam.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Открыть профиль в Steam</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={steamQuery}
                  onChange={(e) => setSteamQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSteam()}
                  placeholder="Ник в Steam, кастомный ID или ссылка https://steamcommunity.com/..."
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700/90 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => handleSearchSteam()}
                  disabled={loadingSteam}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0 shadow-md shadow-cyan-500/10"
                >
                  {loadingSteam ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{loadingSteam ? 'Поиск в Steam...' : 'Загрузить профиль Steam'}</span>
                </button>
              </div>

              {/* Список кандидатов Steam с реальными аватарками */}
              {steamCandidates.length > 1 && (
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Выберите профиль друга в Steam:
                  </span>
                  {steamCandidates.map((cand, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearchSteam(cand.steamNick, cand.profileUrl)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                        cand.profileUrl === content?.steam?.sourceUrl
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/40'
                      }`}
                    >
                      {resolveSteamAvatarUrl(cand.avatarUrl) && (
                        <img
                          src={resolveSteamAvatarUrl(cand.avatarUrl)}
                          alt={cand.steamNick}
                          className="w-4 h-4 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span>{cand.steamNick}</span>
                    </button>
                  ))}
                </div>
              )}

              {steamFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    steamFeedback.type === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {steamFeedback.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{steamFeedback.text}</span>
                </div>
              )}
            </div>

            {/* Карточка профиля Steam (аватарка + фирменная рамка профиля Steam поверх!) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900/90 border border-cyan-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0 m-1.5">
                  {resolvedSteamAvatar && !steamAvatarError ? (
                    <img
                      src={resolvedSteamAvatar}
                      alt={content?.steam?.steamNick || 'Steam Avatar'}
                      onError={() => setSteamAvatarError(true)}
                      className={`w-full h-full object-cover shadow-lg bg-slate-900 ${
                        resolvedSteamFrame && !steamFrameError
                          ? 'rounded-lg'
                          : 'rounded-2xl border-2 border-cyan-500/50'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/40 flex items-center justify-center text-3xl shadow-inner">
                      🎮
                    </div>
                  )}

                  {resolvedSteamFrame && !steamFrameError && (
                    <img
                      src={resolvedSteamFrame}
                      alt="Рамка профиля Steam"
                      onError={() => setSteamFrameError(true)}
                      className="pointer-events-none select-none absolute -inset-[11%] w-[122%] h-[122%] max-w-none object-contain z-10 drop-shadow-[0_2px_10px_rgba(6,182,212,0.35)]"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                      {content?.steam?.steamNick || 'Gamer_Legend'}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold">
                      Уровень Steam: {content?.steam?.level ?? 42}
                    </span>
                    {content?.steam?.isRealData && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Реальный профиль Steam
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span>{content?.steam?.statusText || 'В сети: Готов раздавать в катках'}</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80 block">
                  Всего наиграно в Steam:
                </span>
                <span className="text-xl font-black text-cyan-300">
                  {(content?.steam?.totalHours ?? 4850).toLocaleString('ru-RU')}{' '}
                  <span className="text-xs font-normal text-slate-400">часов</span>
                </span>
              </div>
            </div>

            {/* Топ игр в Steam */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Игры и активность профиля Steam:
                </h4>
                <button
                  type="button"
                  onClick={() => setIsQuickEditing(true)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Изменить список игр / часы
                </button>
              </div>

              <div className="space-y-3">
                {[
                  ...(content?.steam?.favoriteGames || [
                    { name: 'Counter-Strike 2', hours: 2600, genre: 'Тактический шутер' },
                    { name: 'Dota 2', hours: 1450, genre: 'MOBA' },
                    { name: 'Grand Theft Auto V', hours: 580, genre: 'Экшен' },
                    { name: 'Cyberpunk 2077', hours: 220, genre: 'RPG' },
                  ]),
                ]
                  .sort((a, b) => (b.hours || 0) - (a.hours || 0))
                  .map((game, idx, sortedList) => {
                    const maxHours = Math.max(...sortedList.map((g) => g.hours || 0), 1);
                    const percent =
                      game.hours > 0
                        ? Math.max(8, Math.min(100, Math.round((game.hours / maxHours) * 100)))
                        : 0;
                    const gGenre = game.genre || '';
                    const isActivity = gGenre.toLowerCase().includes('активность');
                    const isBadge = gGenre.toLowerCase().includes('значок');

                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-amber-400 shrink-0">#{idx + 1}</span>
                            <span className="font-bold text-slate-100 truncate">{game.name}</span>
                            {gGenre && (
                              <span className="text-[10px] text-slate-500 hidden sm:inline truncate">({gGenre})</span>
                            )}
                          </div>
                          <span
                            className={`font-bold tabular-nums shrink-0 ${
                              game.hours > 0 ? 'text-cyan-400' : 'text-slate-400 font-medium text-[11px]'
                            }`}
                          >
                            {game.hours > 0
                              ? `${game.hours.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч.`
                              : isActivity
                                ? 'Часы скрыты в Steam / < 0.1 ч.'
                                : isBadge
                                  ? 'По значку в профиле'
                                  : 'Часы не указаны в Steam'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          {percent > 0 ? (
                            <div
                              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          ) : (
                            <div className="bg-slate-700/60 h-full rounded-full w-full" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Мемный блок игровых цитат внизу */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="italic text-slate-300">
              «Еще один победный бой — и точно спать!» (Сказано в 03:45 ночи)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 shrink-0">
            Каждая игра привязана к собственному никнейму 🛡️
          </span>
        </div>
      </div>

      {/* ========================================================
          МОДАЛКА: РАЗДЕЛЬНЫЙ ПОИСК ПО НИКНЕЙМАМ ДЛЯ ВСЕХ 3 ИГР
          ======================================================== */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Загрузка реальной статистики (3 отдельных аккаунта)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Укажите разные ники для Мира Танков, Tanks Blitz и Steam — каждая игра обновляется отдельно
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* 1. МИР ТАНКОВ */}
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2.5">
              <label className="block text-xs font-bold text-amber-400">
                1. Никнейм в «Мире Танков» (Lesta: tanki.su + KTTC):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tankiQuery}
                  onChange={(e) => setTankiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchTanki()}
                  placeholder="Ник в Мире Танков..."
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => handleSearchTanki()}
                  disabled={loadingTanki}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {loadingTanki ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Найти в Мире Танков</span>
                </button>
              </div>
              {tankiFeedback && (
                <p className={`text-xs ${tankiFeedback.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tankiFeedback.text}
                </p>
              )}
            </div>

            {/* 2. TANKS BLITZ */}
            <div className="p-4 rounded-xl bg-slate-950 border border-orange-500/30 space-y-2.5">
              <label className="block text-xs font-bold text-orange-400">
                2. Никнейм в «Tanks Blitz» (Lesta Blitz API):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={blitzQuery}
                  onChange={(e) => setBlitzQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchBlitz()}
                  placeholder="Ник в Tanks Blitz..."
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-400"
                />
                <button
                  type="button"
                  onClick={() => handleSearchBlitz()}
                  disabled={loadingBlitz}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {loadingBlitz ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Найти в Blitz</span>
                </button>
              </div>
              {blitzFeedback && (
                <p className={`text-xs ${blitzFeedback.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {blitzFeedback.text}
                </p>
              )}
            </div>

            {/* 3. STEAM */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2.5">
              <label className="block text-xs font-bold text-cyan-400">
                3. Никнейм или ссылка на профиль «Steam»:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={steamQuery}
                  onChange={(e) => setSteamQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSteam()}
                  placeholder="Ник в Steam или ссылка https://steamcommunity.com/..."
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => handleSearchSteam()}
                  disabled={loadingSteam}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {loadingSteam ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Найти в Steam</span>
                </button>
              </div>
              {steamFeedback && (
                <p className={`text-xs ${steamFeedback.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {steamFeedback.text}
                </p>
              )}
            </div>

            {/* Быстрые пресеты */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">
                Или примените готовый шаблон цифр (ники останутся раздельными):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {GAMING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <h5 className="text-xs font-bold text-white group-hover:text-amber-300">{preset.title}</h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {preset.tanki.winrate}% побед · WN8 {preset.tanki.ratingWN8}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ИНЛАЙН-РЕДАКТОР ЦИФР ПРЯМО В БЛОКЕ (ВСЕ 3 ИГРЫ ОТДЕЛЬНО)
          ======================================================== */}
      {isQuickEditing && (
        <div className="mt-4 p-5 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">
                Ручная корректировка показателей (каждая игра отдельно)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleSaveQuickEdit}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-md shadow-amber-500/20"
            >
              <span>Сохранить все изменения</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            {/* 1. Мир Танков */}
            <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/20 space-y-2.5">
              <span className="font-bold text-amber-400 block pb-1 border-b border-slate-800">
                1. Мир Танков (Lesta):
              </span>
              <div>
                <label className="text-[11px] text-slate-400">Никнейм в Мире Танков:</label>
                <input
                  type="text"
                  value={editableTanki.nickname}
                  onChange={(e) => setEditableTanki({ ...editableTanki, nickname: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">Винрейт (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editableTanki.winrate}
                    onChange={(e) => setEditableTanki({ ...editableTanki, winrate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">WN8 рейтинг:</label>
                  <input
                    type="number"
                    value={editableTanki.ratingWN8}
                    onChange={(e) =>
                      setEditableTanki({ ...editableTanki, ratingWN8: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">Бои:</label>
                  <input
                    type="number"
                    value={editableTanki.battles}
                    onChange={(e) => setEditableTanki({ ...editableTanki, battles: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Ср. урон:</label>
                  <input
                    type="number"
                    value={editableTanki.avgDamage}
                    onChange={(e) =>
                      setEditableTanki({ ...editableTanki, avgDamage: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Выжив. (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editableTanki.survivalRate ?? 39.5}
                    onChange={(e) =>
                      setEditableTanki({ ...editableTanki, survivalRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Любимые танки (через запятую):</label>
                <input
                  type="text"
                  value={editableTanki.favoriteTanks?.join(', ') || ''}
                  onChange={(e) =>
                    setEditableTanki({
                      ...editableTanki,
                      favoriteTanks: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Медали (через запятую):</label>
                <input
                  type="text"
                  value={editableTanki.medals?.join(', ') || ''}
                  onChange={(e) =>
                    setEditableTanki({
                      ...editableTanki,
                      medals: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Почетное звание:</label>
                <input
                  type="text"
                  value={editableTanki.funnyTitle || ''}
                  onChange={(e) => setEditableTanki({ ...editableTanki, funnyTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-amber-300">Аватарка / эмблема в Мире Танков (URL):</label>
                <input
                  type="text"
                  value={editableTanki.avatarUrl || ''}
                  onChange={(e) => setEditableTanki({ ...editableTanki, avatarUrl: e.target.value })}
                  placeholder="Автоматически (эмблема клана/медаль) или своя ссылка..."
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {TANK_AVATAR_PRESETS.slice(0, 5).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEditableTanki({ ...editableTanki, avatarUrl: preset.url })}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-[10px] text-slate-300"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Tanks Blitz */}
            <div className="p-4 rounded-xl bg-slate-900 border border-orange-500/20 space-y-2.5">
              <span className="font-bold text-orange-400 block pb-1 border-b border-slate-800">
                2. Tanks Blitz (Отдельный профиль):
              </span>
              <div>
                <label className="text-[11px] text-slate-400">Никнейм в Tanks Blitz:</label>
                <input
                  type="text"
                  value={editableBlitz.nickname}
                  onChange={(e) => setEditableBlitz({ ...editableBlitz, nickname: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">Винрейт Blitz (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editableBlitz.winrate}
                    onChange={(e) => setEditableBlitz({ ...editableBlitz, winrate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">WN8 рейтинг:</label>
                  <input
                    type="number"
                    value={editableBlitz.ratingWN8}
                    onChange={(e) =>
                      setEditableBlitz({ ...editableBlitz, ratingWN8: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">Бои Blitz:</label>
                  <input
                    type="number"
                    value={editableBlitz.battles}
                    onChange={(e) => setEditableBlitz({ ...editableBlitz, battles: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Ср. урон:</label>
                  <input
                    type="number"
                    value={editableBlitz.avgDamage}
                    onChange={(e) =>
                      setEditableBlitz({ ...editableBlitz, avgDamage: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Выжив. (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editableBlitz.survivalRate ?? 44.1}
                    onChange={(e) =>
                      setEditableBlitz({ ...editableBlitz, survivalRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Любимые танки Blitz (через запятую):</label>
                <input
                  type="text"
                  value={editableBlitz.favoriteTanks?.join(', ') || ''}
                  onChange={(e) =>
                    setEditableBlitz({
                      ...editableBlitz,
                      favoriteTanks: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Медали Blitz (через запятую):</label>
                <input
                  type="text"
                  value={editableBlitz.medals?.join(', ') || ''}
                  onChange={(e) =>
                    setEditableBlitz({
                      ...editableBlitz,
                      medals: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Стиль игры / звание Blitz:</label>
                <input
                  type="text"
                  value={editableBlitz.funnyTitle || ''}
                  onChange={(e) => setEditableBlitz({ ...editableBlitz, funnyTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-orange-300">Аватарка / эмблема в Tanks Blitz (URL):</label>
                <input
                  type="text"
                  value={editableBlitz.avatarUrl || ''}
                  onChange={(e) => setEditableBlitz({ ...editableBlitz, avatarUrl: e.target.value })}
                  placeholder="Автоматически (медаль/знак Мастер) или своя ссылка..."
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {TANK_AVATAR_PRESETS.slice(0, 5).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEditableBlitz({ ...editableBlitz, avatarUrl: preset.url })}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-orange-400/50 text-[10px] text-slate-300"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Steam */}
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/20 space-y-2.5">
              <span className="font-bold text-cyan-400 block pb-1 border-b border-slate-800">
                3. Steam (Отдельный профиль):
              </span>
              <div>
                <label className="text-[11px] text-slate-400">Никнейм в Steam:</label>
                <input
                  type="text"
                  value={editableSteam.steamNick}
                  onChange={(e) => setEditableSteam({ ...editableSteam, steamNick: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">Уровень Steam:</label>
                  <input
                    type="number"
                    value={editableSteam.level}
                    onChange={(e) => setEditableSteam({ ...editableSteam, level: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Часов всего:</label>
                  <input
                    type="number"
                    value={editableSteam.totalHours}
                    onChange={(e) =>
                      setEditableSteam({ ...editableSteam, totalHours: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Статус профиля:</label>
                <input
                  type="text"
                  value={editableSteam.statusText || ''}
                  onChange={(e) => setEditableSteam({ ...editableSteam, statusText: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Ссылка на аватарку Steam (URL):</label>
                <input
                  type="text"
                  value={editableSteam.avatarUrl || ''}
                  onChange={(e) => setEditableSteam({ ...editableSteam, avatarUrl: e.target.value })}
                  placeholder="Автоматически из Steam или своя ссылка..."
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Рамка аватарки Steam (URL):</label>
                <input
                  type="text"
                  value={editableSteam.avatarFrameUrl || ''}
                  onChange={(e) => setEditableSteam({ ...editableSteam, avatarFrameUrl: e.target.value })}
                  placeholder="Рамка из магазина очков Steam (или оставьте пустым)..."
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] text-slate-400 block">Любимые игры и часы:</label>
                {(editableSteam.favoriteGames || []).map((g, gIdx) => (
                  <div key={gIdx} className="flex gap-1.5">
                    <input
                      type="text"
                      value={g.name}
                      onChange={(e) => {
                        const next = [...(editableSteam.favoriteGames || [])];
                        next[gIdx] = { ...next[gIdx], name: e.target.value };
                        setEditableSteam({ ...editableSteam, favoriteGames: next });
                      }}
                      placeholder="Название игры"
                      className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-[11px]"
                    />
                    <input
                      type="number"
                      value={g.hours}
                      onChange={(e) => {
                        const next = [...(editableSteam.favoriteGames || [])];
                        next[gIdx] = { ...next[gIdx], hours: parseInt(e.target.value, 10) || 0 };
                        setEditableSteam({ ...editableSteam, favoriteGames: next });
                      }}
                      placeholder="Часы"
                      className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-[11px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
