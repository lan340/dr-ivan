import { TankStats, SteamStats } from '../types/greeting';

/**
 * Утилиты для работы с реальной статистикой «Мир Танков» (Lesta), «Tanks Blitz» (Lesta) и Steam.
 * Поддерживает получение реальных показателей через серверные эндпоинты (/api/stats/tanki, /api/stats/blitz, /api/stats/steam),
 * расчет WN8 по цветам и готовые пресеты.
 */

export interface WN8Tier {
  min: number;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const getWN8Tier = (wn8: number): WN8Tier => {
  if (wn8 >= 2900) {
    return {
      min: 2900,
      label: 'Фиолетовый · Супер-статист (Unicum)',
      colorClass: 'text-purple-400',
      bgClass: 'bg-purple-950/60',
      borderClass: 'border-purple-500/50',
    };
  }
  if (wn8 >= 2100) {
    return {
      min: 2100,
      label: 'Бирюза · Отличный боец',
      colorClass: 'text-cyan-400',
      bgClass: 'bg-cyan-950/60',
      borderClass: 'border-cyan-500/50',
    };
  }
  if (wn8 >= 1600) {
    return {
      min: 1600,
      label: 'Зеленый · Хороший игрок',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/60',
      borderClass: 'border-emerald-500/50',
    };
  }
  if (wn8 >= 1200) {
    return {
      min: 1200,
      label: 'Синий / Средний боец',
      colorClass: 'text-sky-400',
      bgClass: 'bg-sky-950/60',
      borderClass: 'border-sky-500/50',
    };
  }
  return {
    min: 0,
    label: 'Боевой энтузиаст рандома',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-950/60',
    borderClass: 'border-amber-500/50',
  };
};

export interface TankiCandidate {
  accountId: string;
  nickname: string;
  battles?: number;
  winrate?: number;
  clanTag?: string;
  clanEmblemUrl?: string;
}

export interface SteamCandidate {
  steamNick: string;
  profileUrl: string;
  avatarUrl: string;
}

export interface RealTankiResponse {
  found: boolean;
  isRealData?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  kttcUrl?: string;
  candidates?: TankiCandidate[];
  stats?: TankStats;
  error?: string;
}

export interface RealSteamResponse {
  found: boolean;
  isRealData?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  hoursArePrivate?: boolean;
  candidates?: SteamCandidate[];
  stats?: SteamStats;
  error?: string;
}

/**
 * 1. Реальный запрос статистики «Мир Танков» (Lesta: tanki.su + kttc.ru)
 */
export async function fetchRealTankiStats(nickname: string, accountId?: string): Promise<RealTankiResponse> {
  const cleanNick = nickname.trim();
  if (!cleanNick && !accountId) {
    return { found: false, error: 'Введите никнейм игрока в «Мире Танков»' };
  }

  try {
    const params = new URLSearchParams();
    if (cleanNick) params.set('nick', cleanNick);
    if (accountId) params.set('accountId', accountId);

    const res = await fetch(`/api/stats/tanki?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.found) {
      return {
        found: false,
        error: data.error || `Игрок «${cleanNick}» не найден в «Мире Танков»`,
      };
    }
    return data as RealTankiResponse;
  } catch (err: any) {
    return {
      found: false,
      error: err?.message || 'Ошибка соединения при поиске игрока «Мир Танков»',
    };
  }
}

/**
 * 2. Реальный запрос статистики «Tanks Blitz» (Lesta: blitz-commander.by API)
 */
export async function fetchRealBlitzStats(nickname: string, accountId?: string): Promise<RealTankiResponse> {
  const cleanNick = nickname.trim();
  if (!cleanNick && !accountId) {
    return { found: false, error: 'Введите никнейм игрока в «Tanks Blitz»' };
  }

  try {
    const params = new URLSearchParams();
    if (cleanNick) params.set('nick', cleanNick);
    if (accountId) params.set('accountId', accountId);

    const res = await fetch(`/api/stats/blitz?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.found) {
      return {
        found: false,
        error: data.error || `Игрок «${cleanNick}» не найден в «Tanks Blitz»`,
      };
    }
    return data as RealTankiResponse;
  } catch (err: any) {
    return {
      found: false,
      error: err?.message || 'Ошибка соединения при поиске игрока «Tanks Blitz»',
    };
  }
}

/**
 * 3. Реальный запрос профиля «Steam» (по нику, SteamID или ссылке на профиль)
 */
export async function fetchRealSteamStats(query: string, profileUrl?: string): Promise<RealSteamResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery && !profileUrl) {
    return { found: false, error: 'Введите никнейм или ссылку на профиль Steam' };
  }

  try {
    const params = new URLSearchParams();
    if (cleanQuery) params.set('query', cleanQuery);
    if (profileUrl) params.set('profileUrl', profileUrl);

    const res = await fetch(`/api/stats/steam?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.found) {
      return {
        found: false,
        error: data.error || `Профиль Steam «${cleanQuery}» не найден`,
      };
    }
    return data as RealSteamResponse;
  } catch (err: any) {
    return {
      found: false,
      error: err?.message || 'Ошибка соединения при поиске профиля Steam',
    };
  }
}

/**
 * Нормализует ссылку на аватарку Steam:
 * - отсекает ошибочно сохраненные прозрачные рамки (community_assets/images/items/*.png) и иконки стрелок
 * - проксирует прямые ссылки steamstatic.com через /api/steam-avatar для обхода любых блокировок CDN
 */
export function resolveSteamAvatarUrl(rawUrl?: string): string {
  const clean = (rawUrl || '').trim();
  if (!clean) return '';

  // Если в кеше осталась прозрачная рамка профиля (.png из community_assets) или стрелка истории имен
  if (
    clean.includes('arrowDn9x5') ||
    (/community_assets\/images\/items\/\d+\/[a-f0-9]+\.png/i.test(clean))
  ) {
    return '';
  }

  if (clean.startsWith('/api/steam-avatar')) {
    return clean;
  }

  if (/^https:\/\/([a-z0-9-]+\.)*(steamstatic\.com|akamaihd\.net|steamcommunity\.com)\//i.test(clean)) {
    return `/api/steam-avatar?url=${encodeURIComponent(clean)}`;
  }

  return clean;
}

/**
 * Нормализует ссылку на декоративную рамку аватарки Steam:
 * проксирует прямые ссылки steamstatic.com / community_assets через /api/steam-avatar
 */
export function resolveSteamFrameUrl(rawUrl?: string): string {
  const clean = (rawUrl || '').trim();
  if (!clean || clean.includes('arrowDn9x5')) return '';

  if (clean.startsWith('/api/steam-avatar')) {
    return clean;
  }

  if (/^https:\/\/([a-z0-9-]+\.)*(steamstatic\.com|akamaihd\.net|steamcommunity\.com)\//i.test(clean)) {
    return `/api/steam-avatar?url=${encodeURIComponent(clean)}`;
  }

  return clean;
}

/**
 * Нормализует ссылку на аватарку / эмблему клана / медаль / иконку танка Lesta (Мир Танков & Tanks Blitz)
 */
export function resolveGameImageUrl(rawUrl?: string): string {
  let clean = (rawUrl || '').trim();
  if (!clean) return '';
  if (clean.startsWith('//')) clean = `https:${clean}`;
  if (clean.startsWith('/api/steam-avatar')) return clean;

  if (
    /^https?:\/\/([a-z0-9-]+\.)*(tanki\.su|lesta\.ru|tanksblitz\.ru|blitz-commander\.by|steamstatic\.com|akamaihd\.net|steamcommunity\.com)\//i.test(
      clean
    )
  ) {
    return `/api/steam-avatar?url=${encodeURIComponent(clean)}`;
  }
  return clean;
}

/**
 * Исправляет старые технические ID танков из кэша (например, «Танк #30209» -> «МС-11»)
 */
export function normalizeTankTitle(tankLabel: string): string {
  if (!tankLabel) return '';
  return tankLabel.replace(/Танк\s*#30209/gi, 'МС-11');
}

/**
 * Подбирает 3D-иконку для каждого из 4 любимых танков (по прямой ссылке из API или по названию танка)
 */
export function resolveTankImageByName(tankLabel?: string, explicitUrl?: string): string {
  const direct = resolveGameImageUrl(explicitUrl);
  if (direct) return direct;

  const lower = (tankLabel || '').toLowerCase();
  if (lower.includes('30209') || lower.includes('мс-11') || lower.includes('ms-11')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FMS-11.webp';
  }
  if (lower.includes('ис-7') || lower.includes('is-7')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR45_IS-7.png';
  }
  if (lower.includes('140')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR97_Object_140.png';
  }
  if (lower.includes('progetto')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FIt13_Progetto_M35_mod_46.png';
  }
  if (lower.includes('bat') || lower.includes('châtillon') || lower.includes('chatillon')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FF18_Bat_Chatillon25t.png';
  }
  if (lower.includes('super conqueror') || lower.includes('conqueror')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FGB91_Super_Conqueror.webp';
  }
  if (lower.includes('kranvagn')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FS16_Kranvagn.webp';
  }
  if (lower.includes('т-54') || lower.includes('t-54')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FT-54.webp';
  }
  if (lower.includes('4005') || lower.includes('бабаха')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FGB83_4005.webp';
  }
  if (lower.includes('кв-2') || lower.includes('kv-2')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FKV2.webp';
  }
  if (lower.includes('t49') || lower.includes('т49')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FT49.webp';
  }
  if (lower.includes('maus') || lower.includes('маус')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FMaus.webp';
  }
  if (lower.includes('e 100') || lower.includes('е 100')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FE-100.webp';
  }
  if (lower.includes('e 50') || lower.includes('е 50')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FE50_Ausf_M.webp';
  }
  if (lower.includes('dracula') || lower.includes('дракула')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FAMX_dracula.webp';
  }
  if (lower.includes('helsing') || lower.includes('хелсинг')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FVan_Helsing.webp';
  }
  if (lower.includes('су-152') || lower.includes('su-152')) {
    return '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FSU-152.webp';
  }
  return '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR45_IS-7.png';
}

/**
 * Официальные эмблемы, медали и техника Lesta для выбора аватарки в 1 клик
 */
export const TANK_AVATAR_PRESETS = [
  {
    id: 'mastery',
    label: 'Знак «Мастер»',
    url: '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmarkOfMastery4.png',
  },
  {
    id: 'kolobanov',
    label: 'Медаль Колобанова',
    url: '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmedalKolobanov.png',
  },
  {
    id: 'warrior',
    label: 'Медаль «Воин»',
    url: '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2Fwarrior.png',
  },
  {
    id: 'main_gun',
    label: 'Основной калибр',
    url: '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmainGun.png',
  },
  {
    id: 'raseiniai',
    label: 'Герои Расейняя',
    url: '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FheroesOfRassenay.png',
  },
  {
    id: 'pwnz_clan',
    label: 'Эмблема клана [PWNZ]',
    url: '/api/steam-avatar?url=https%3A%2F%2Flesta.ru%2Fclans%2Fmedia%2Fclans%2Femblems%2Fcl_618%2F409618%2Femblem_195x195.png',
  },
  {
    id: 'is7',
    label: 'Танк ИС-7',
    url: '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR45_IS-7.png',
  },
  {
    id: 'progetto',
    label: 'Progetto 46',
    url: '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FIt13_Progetto_M35_mod_46.png',
  },
];

/**
 * Пресеты для быстрой настройки под друга в 1 клик (если хочется задать шуточный или эталонный образ)
 */
export const GAMING_PRESETS = [
  {
    id: 'unicum',
    title: '🔥 Ультра-статист (Бирюза/Фиолет)',
    tanki: {
      avatarUrl:
        '/api/steam-avatar?url=https%3A%2F%2Flesta.ru%2Fclans%2Fmedia%2Fclans%2Femblems%2Fcl_618%2F409618%2Femblem_195x195.png',
      badgeUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmedalKolobanov.png',
      topTankImageUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR45_IS-7.png',
      winrate: 61.8,
      battles: 34200,
      avgDamage: 2750,
      ratingWN8: 2680,
      ratingTitle: 'Бирюза · Супер-статист',
      favoriteTanks: ['Объект 279 (р)', 'Bat.-Châtillon 25 t', 'Super Conqueror', 'ИС-7'],
      medals: ['Медаль Колобанова', 'Воин', 'Знак «Мастер»', 'Основной калибр'],
      funnyTitle: 'Главный кошмар вражеских статистов и повелитель кустов Прохоровки',
    },
    blitz: {
      avatarUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FheroesOfRassenay.png',
      badgeUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmarkOfMastery4.png',
      topTankImageUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FIt13_Progetto_M35_mod_46.png',
      winrate: 64.5,
      battles: 14800,
      avgDamage: 2310,
      ratingWN8: 2700,
      ratingTitle: 'Мастер взводных нагибов',
      favoriteTanks: ['Progetto 46', 'T-54', 'Kranvagn'],
      medals: ['Герой Расейняя', 'Воин', 'Снайпер'],
      funnyTitle: 'Умудряется тащить даже в самой проигрышной ситуации',
    },
    steam: {
      level: 42,
      totalHours: 5400,
      statusText: 'В игре: Counter-Strike 2 (Премьер-режим 20k+)',
      favoriteGames: [
        { name: 'Counter-Strike 2', hours: 2850, genre: 'Тактический шутер' },
        { name: 'Dota 2', hours: 1420, genre: 'MOBA' },
        { name: 'Cyberpunk 2077', hours: 210, genre: 'RPG' },
        { name: 'Rust', hours: 640, genre: 'Выживание' },
      ],
    },
  },
  {
    id: 'classic_pro',
    title: '🛡️ Танковый батя (Крепкий зелёный)',
    tanki: {
      avatarUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2Fwarrior.png',
      badgeUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmarkOfMastery4.png',
      topTankImageUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR45_IS-7.png',
      winrate: 56.4,
      battles: 24500,
      avgDamage: 2180,
      ratingWN8: 1950,
      ratingTitle: 'Зелёный · Надёжный танкист',
      favoriteTanks: ['ИС-7', 'Объект 140', 'Т-100 ЛТ', 'E 100'],
      medals: ['Воин', 'Основной калибр', 'Стальная стена', 'Поддержка'],
      funnyTitle: 'Всегда прикроет совзводного бортом и вытащит безнадёжный фланг',
    },
    blitz: {
      avatarUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmainGun.png',
      badgeUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2Fwarrior.png',
      topTankImageUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR97_Object_140.png',
      winrate: 58.2,
      battles: 9500,
      avgDamage: 1890,
      ratingWN8: 2050,
      ratingTitle: 'Опытный боец Blitz',
      favoriteTanks: ['ИС-7', 'Объект 140', 'E 50 Ausf. M'],
      medals: ['Воин', 'Основной калибр', 'Стальная стена'],
      funnyTitle: 'Решает исход боя за 3 минуты на передовой',
    },
    steam: {
      level: 28,
      totalHours: 3650,
      statusText: 'В сети: Собирает пати на вечерний заход',
      favoriteGames: [
        { name: 'Counter-Strike 2', hours: 1650, genre: 'Шутер' },
        { name: 'Dota 2', hours: 890, genre: 'MOBA' },
        { name: 'The Witcher 3: Wild Hunt', hours: 310, genre: 'RPG' },
        { name: 'War Thunder', hours: 510, genre: 'Авиация & Танки' },
      ],
    },
  },
  {
    id: 'soulful',
    title: '😎 Кайфарик рандома (Игра ради фана)',
    tanki: {
      avatarUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmainGun.png',
      badgeUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2Fsteelwall.png',
      topTankImageUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FF18_Bat_Chatillon25t.png',
      winrate: 53.2,
      battles: 18900,
      avgDamage: 1820,
      ratingWN8: 1750,
      ratingTitle: 'Зеленый крепыш · Душа взвода',
      favoriteTanks: ['FV4005 (Бабаха)', 'КВ-2 с фугасницей', 'T49', 'Maus'],
      medals: ['Бомбардир', 'Защитник', 'Коса Смерти'],
      funnyTitle: 'Стреляет на Бабахе только фугасами по 1700 урона и заливисто смеется',
    },
    blitz: {
      avatarUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmarkOfMastery4.png',
      badgeUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2Fsniper.png',
      topTankImageUrl:
        '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FIt13_Progetto_M35_mod_46.png',
      winrate: 54.8,
      battles: 6400,
      avgDamage: 1650,
      ratingWN8: 1820,
      ratingTitle: 'Фан-мастер Blitz',
      favoriteTanks: ['Dracula', 'Helsing', 'СУ-152'],
      medals: ['Воин', 'Счастливчик'],
      funnyTitle: 'Залетает во врагов на Дракуле со скоростью света',
    },
    steam: {
      level: 19,
      totalHours: 2400,
      statusText: 'Не беспокоить: Качает новый танк',
      favoriteGames: [
        { name: 'Counter-Strike 2', hours: 1100, genre: 'Шутер' },
        { name: 'Left 4 Dead 2', hours: 380, genre: 'Кооператив' },
        { name: 'Euro Truck Simulator 2', hours: 290, genre: 'Релакс' },
        { name: 'PUBG: BATTLEGROUNDS', hours: 420, genre: 'Battle Royale' },
      ],
    },
  },
];
