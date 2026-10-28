import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Кэш полной энциклопедии техники Tanks Blitz (732 машины, включая коллекционные и ивентовые, например 30209 -> МС-11)
interface BlitzVehicleInfo {
  name: string;
  tier: number;
  nation: string;
  techName?: string;
  imageUrl?: string;
}

let blitzEncyclopediaCache: Record<string, BlitzVehicleInfo> | null = null;
let blitzEncyclopediaFetchedAt = 0;

async function getBlitzEncyclopedia(): Promise<Record<string, BlitzVehicleInfo>> {
  const now = Date.now();
  if (blitzEncyclopediaCache && Object.keys(blitzEncyclopediaCache).length > 500 && now - blitzEncyclopediaFetchedAt < 1000 * 60 * 60) {
    return blitzEncyclopediaCache;
  }

  const merged: Record<string, BlitzVehicleInfo> = {};

  // 1. Загружаем базовую энциклопедию API (523 танка с официальными иконками Lesta CDN)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      'https://blitz-commander.by/api/wotb/encyclopedia/vehicles/?fields=name,tier,nation,images',
      {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const json = (await res.json()) as {
        data?: Record<
          string,
          { name: string; tier: number; nation: string; images?: { preview?: string; normal?: string } }
        >;
      };
      if (json?.data) {
        for (const [id, v] of Object.entries(json.data)) {
          const rawImg = v.images?.normal || v.images?.preview || '';
          const httpsImg = rawImg ? rawImg.replace(/^http:\/\//i, 'https://') : '';
          merged[id] = {
            name: v.name,
            tier: v.tier,
            nation: v.nation,
            imageUrl: httpsImg ? toProxiedSteamAvatar(httpsImg) : undefined,
          };
        }
      }
    }
  } catch {
    // ignore encyclopedia API error
  }

  // 2. Загружаем полный датасет танков (732 танка, включая все коллекционные/ивентовые, такие как 30209 МС-11)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    let version = '26.10.0';
    try {
      const vRes = await fetch('https://blitz-commander.by/data/versions.json', {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      if (vRes.ok) {
        const vList = (await vRes.json()) as string[];
        if (Array.isArray(vList) && vList[0]) version = vList[0];
      }
    } catch {
      // fallback to 26.10.0
    }

    const tanksRes = await fetch(`https://blitz-commander.by/data/${version}/tanks.json`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (tanksRes.ok) {
      const tanksList = (await tanksRes.json()) as Array<{
        tankId: number;
        techName: string;
        name: string;
        nation: string;
        tier: number;
      }>;
      if (Array.isArray(tanksList)) {
        for (const t of tanksList) {
          const id = String(t.tankId);
          const webpUrl = t.techName
            ? toProxiedSteamAvatar(`https://blitz-commander.by/img/tanks/${t.techName}.webp`)
            : '';
          const existing = merged[id];
          merged[id] = {
            name: t.name || existing?.name || `Танк #${id}`,
            tier: t.tier || existing?.tier || 8,
            nation: t.nation || existing?.nation || 'ussr',
            techName: t.techName,
            // Предпочитаем сочный 3D WebP рендер с blitz-commander, либо иконку из Lesta CDN
            imageUrl: webpUrl || existing?.imageUrl,
          };
        }
      }
    }
  } catch {
    // ignore full dataset fetch error
  }

  if (Object.keys(merged).length > 0) {
    blitzEncyclopediaCache = merged;
    blitzEncyclopediaFetchedAt = now;
    return merged;
  }

  return blitzEncyclopediaCache || {};
}

// Вспомогательная функция оценки WN8 и титула по реальным показателям
function getWN8Title(wn8: number): string {
  if (wn8 >= 2900) return 'Фиолетовый · Уникум';
  if (wn8 >= 2100) return 'Бирюза · Отличный боец';
  if (wn8 >= 1600) return 'Зелёный · Хороший игрок';
  if (wn8 >= 1200) return 'Синий · Крепкий танкист';
  return 'Боец рандома';
}

function estimateWN8FromStats(winrate: number, avgDamage: number, avgTier = 8, globalRating = 0): number {
  if (globalRating > 0) {
    // Личный рейтинг Lesta хорошо коррелирует с WN8, комбинируем с уроном и винрейтом
    const dmgFactor = avgDamage / Math.max(800, avgTier * 210);
    const wrFactor = Math.max(0.4, (winrate - 42) / 14);
    const baseWn8 = Math.round(dmgFactor * 1450 + wrFactor * 650);
    return Math.max(300, Math.min(4800, baseWn8));
  }
  const tierExpectedDmg = Math.max(700, avgTier * 200);
  const dmgRatio = avgDamage / tierExpectedDmg;
  const wrBonus = Math.max(0, (winrate - 46) * 55);
  return Math.max(300, Math.min(4800, Math.round(dmgRatio * 1350 + wrBonus)));
}

// Словарь медалей Tanks Blitz на русском
const BLITZ_MEDAL_NAMES: Record<string, string> = {
  medalKolobanov: 'Медаль Колобанова',
  medalRaseiniai: 'Герой Расейняя',
  medalRadleyWalters: 'Медаль Рэдли-Уолтерса',
  medalLafayettePool: 'Медаль Пула',
  warrior: 'Воин',
  mainGun: 'Основной калибр',
  markOfMastery: 'Знак классности «Мастер»',
  steelwall: 'Стальная стена',
  titleSniper: 'Снайпер',
  sniper: 'Снайпер',
  supporter: 'Поддержка',
  scout: 'Разведчик',
  invader: 'Захватчик',
  defender: 'Защитник',
  kamikaze: 'Камикадзе',
  raider: 'Рейдер',
  huntsman: 'Егерь',
  ironMan: 'Невозмутимый',
  sturdy: 'Спартанец',
  armorPiercer: 'Бронебойщик',
  medalKay: 'Медаль Кея',
  medalCarius: 'Медаль Кариуса',
  medalKnispel: 'Медаль Книспеля',
  medalPoppel: 'Медаль Поппеля',
  medalAbrams: 'Медаль Абрамса',
  medalLeClerc: 'Медаль Леклерка',
  medalLavrinenko: 'Медаль Лавриненко',
};

// Отображение кодов медалей Tanks Blitz на иконки CDN Lesta
const BLITZ_MEDAL_TO_LESTA_ICON: Record<string, string> = {
  medalKolobanov: 'medalKolobanov',
  medalRaseiniai: 'heroesOfRassenay',
  heroesOfRassenay: 'heroesOfRassenay',
  medalRadleyWalters: 'medalRadleyWalters',
  medalLafayettePool: 'medalLafayettePool',
  warrior: 'warrior',
  mainGun: 'mainGun',
  markOfMastery: 'markOfMastery4',
  steelwall: 'steelwall',
  titleSniper: 'sniper',
  sniper: 'sniper',
  supporter: 'supporter',
  scout: 'scout',
  invader: 'invader',
  defender: 'defender',
  kamikaze: 'kamikaze',
  armorPiercer: 'armorPiercer',
  ironMan: 'ironMan',
  sturdy: 'sturdy',
};

function toProxiedSteamAvatar(rawUrl: string): string {
  let clean = (rawUrl || '').trim();
  if (!clean) return '';
  if (clean.startsWith('//')) clean = `https:${clean}`;
  if (clean.startsWith('/api/steam-avatar')) return clean;
  if (
    /^https?:\/\/([a-z0-9-]+\.)*(steamstatic\.com|akamaihd\.net|steamcommunity\.com|tanki\.su|lesta\.ru|tanksblitz\.ru|blitz-commander\.by)\//i.test(
      clean
    )
  ) {
    return `/api/steam-avatar?url=${encodeURIComponent(clean)}`;
  }
  return clean;
}

function buildLestaClanEmblemUrl(clanUrlOrId?: string | number): string {
  if (!clanUrlOrId) return '';
  const str = String(clanUrlOrId);
  const idMatch = str.match(/\/clans\/wot\/(\d+)/i) || str.match(/^(\d+)$/);
  if (!idMatch) return '';
  const clanId = idMatch[1];
  const suffix = clanId.slice(-3).padStart(3, '0');
  return toProxiedSteamAvatar(
    `https://lesta.ru/clans/media/clans/emblems/cl_${suffix}/${clanId}/emblem_195x195.png`
  );
}

function getLestaMedalBigUrl(medalCode: string): string {
  const mapped = BLITZ_MEDAL_TO_LESTA_ICON[medalCode] || medalCode;
  return toProxiedSteamAvatar(`https://dav-static.tanki.su/ptlru/mt/current/achievement/big/${mapped}.png`);
}

function getLestaTankRenderByName(tankName: string): string {
  const cleanTitle = (tankName || '').split('(')[0].trim().toLowerCase();

  // Сначала проверяем загруженный кэш из 732 танков Blitz по точному или частичному совпадению
  if (blitzEncyclopediaCache && cleanTitle) {
    const allVehicles = Object.values(blitzEncyclopediaCache);
    const exact = allVehicles.find((v) => v.name.toLowerCase() === cleanTitle);
    if (exact?.imageUrl) return exact.imageUrl;
    const partial = allVehicles.find(
      (v) => v.name.toLowerCase().includes(cleanTitle) || cleanTitle.includes(v.name.toLowerCase())
    );
    if (partial?.imageUrl) return partial.imageUrl;
  }

  const lower = (tankName || '').toLowerCase();
  if (lower.includes('30209') || lower.includes('мс-11') || lower.includes('ms-11')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/MS-11.webp');
  }
  if (lower.includes('ис-7') || lower.includes('is-7')) {
    return toProxiedSteamAvatar('https://dav-static.tanki.su/ptlru/mt/current/shop/vehicles/180x135/R45_IS-7.png');
  }
  if (lower.includes('140')) {
    return toProxiedSteamAvatar('https://dav-static.tanki.su/ptlru/mt/current/shop/vehicles/180x135/R97_Object_140.png');
  }
  if (lower.includes('progetto')) {
    return toProxiedSteamAvatar(
      'https://dav-static.tanki.su/ptlru/mt/current/shop/vehicles/180x135/It13_Progetto_M35_mod_46.png'
    );
  }
  if (lower.includes('bat') || lower.includes('châtillon') || lower.includes('chatillon')) {
    return toProxiedSteamAvatar(
      'https://dav-static.tanki.su/ptlru/mt/current/shop/vehicles/180x135/F18_Bat_Chatillon25t.png'
    );
  }
  if (lower.includes('super conqueror')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/GB91_Super_Conqueror.webp');
  }
  if (lower.includes('kranvagn')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/S16_Kranvagn.webp');
  }
  if (lower.includes('т-54') || lower.includes('t-54')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/T-54.webp');
  }
  if (lower.includes('4005') || lower.includes('бабаха')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/GB83_4005.webp');
  }
  if (lower.includes('кв-2') || lower.includes('kv-2')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/KV2.webp');
  }
  if (lower.includes('maus') || lower.includes('маус')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/Maus.webp');
  }
  if (lower.includes('e 100') || lower.includes('е 100')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/E-100.webp');
  }
  if (lower.includes('dracula') || lower.includes('дракула')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/AMX_dracula.webp');
  }
  if (lower.includes('helsing') || lower.includes('хелсинг')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/Van_Helsing.webp');
  }
  if (lower.includes('су-152') || lower.includes('su-152')) {
    return toProxiedSteamAvatar('https://blitz-commander.by/img/tanks/SU-152.webp');
  }
  return toProxiedSteamAvatar('https://dav-static.tanki.su/ptlru/mt/current/shop/vehicles/180x135/R45_IS-7.png');
}

// Приоритетные боевые медали для Мира Танков
const PRIORITY_TANKI_MEDALS = [
  'medalKolobanov',
  'warrior',
  'mainGun',
  'medalRadleyWalters',
  'medalLafayettePool',
  'heroesOfRassenay',
  'steelwall',
  'supporter',
  'sniper',
  'sniper2',
  'invader',
  'defender',
  'scout',
  'evileye',
  'medalOrlik',
  'medalOskin',
  'medalHalonen',
  'medalBurda',
  'medalBillotte',
  'medalDeLanglade',
  'medalTamadaYoshio',
  'medalBrothersInArms',
  'medalCrucialContribution',
  'fighter',
  'duelist',
  'kamikaze',
];

/**
 * ============================================================================
 * 1. МИР ТАНКОВ (LESTA GAMES: tanki.su + kttc.ru)
 * ============================================================================
 */
app.get('/api/stats/tanki', async (req, res) => {
  const nick = String(req.query.nick || '').trim();
  const requestedAccountId = String(req.query.accountId || '').trim();

  if (!nick && !requestedAccountId) {
    return res.status(400).json({ error: 'Введите никнейм игрока в «Мире Танков»' });
  }

  try {
    // 1. Поиск аккаунтов на официальном портале tanki.su
    const searchUrl = `https://tanki.su/ru/community/accounts/search/?name=${encodeURIComponent(nick)}&name_gt=`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
      },
    });

    if (!searchRes.ok) {
      return res.status(502).json({ error: 'Не удалось связаться с сервером tanki.su' });
    }

    const searchData = (await searchRes.json()) as {
      response?: Array<{
        account_id: string | number;
        account_name: string;
        account_battles: number;
        account_wins: number;
        account_exp: number;
        clan_tag?: string;
        clan_url?: string;
      }>;
    };

    const rawAccounts = searchData?.response || [];
    if (rawAccounts.length === 0) {
      return res.status(404).json({
        found: false,
        error: `Игрок «${nick}» не найден на сервере «Мир Танков» (Lesta). Проверьте точное написание ника.`,
      });
    }

    const candidates = rawAccounts.slice(0, 8).map((a) => ({
      accountId: String(a.account_id),
      nickname: a.account_name,
      battles: Number(a.account_battles || 0),
      winrate: Number(Number(a.account_wins || 0).toFixed(2)),
      clanTag: a.clan_tag || '',
      clanEmblemUrl: buildLestaClanEmblemUrl(a.clan_url),
    }));

    // Выбираем целевой аккаунт: по accountId, затем точное совпадение ника, затем с наибольшим числом боев
    let chosen =
      (requestedAccountId && candidates.find((c) => c.accountId === requestedAccountId)) ||
      candidates.find((c) => c.nickname.toLowerCase() === nick.toLowerCase()) ||
      [...candidates].sort((a, b) => b.battles - a.battles)[0] ||
      candidates[0];

    const spaId = Number(chosen.accountId);
    const exactNick = chosen.nickname;
    const clanEmblemUrl = chosen.clanEmblemUrl || '';

    // 2. Параллельно запрашиваем детальную сводку с tanki.su (mtup API) и WN8 с kttc.ru
    const [summaryRes, vehiclesRes, achievementsRes, kttcRes] = await Promise.allSettled([
      fetch(`https://tanki.su/mtup/profile/summary/?spa_id=${spaId}&battle_type=random`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      }),
      fetch('https://tanki.su/mtup/profile/vehicles/list/', {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          battle_type: 'random',
          only_in_garage: false,
          spa_id: spaId,
          premium: [0, 1],
          collector_vehicle: [0, 1],
          nation: [],
          role: [],
          type: [],
          tier: [],
          language: 'ru',
        }),
      }),
      fetch(`https://tanki.su/mtup/profile/achievements/short/?spa_id=${spaId}&battle_type=random`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      }),
      (async () => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3800);
        try {
          const r = await fetch(`https://kttc.ru/wot/ru/user/${encodeURIComponent(exactNick)}/`, {
            headers: { 'User-Agent': USER_AGENT, 'X-Requested-With': 'XMLHttpRequest' },
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          return r.ok ? await r.text() : '';
        } catch {
          clearTimeout(timer);
          return '';
        }
      })(),
    ]);

    let battles = chosen.battles;
    let winrate = chosen.winrate;
    let avgDamage = 0;
    let globalRating = 0;
    let masteryCount = 0;
    let vehiclesCount = 0;

    if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
      const sumJson = (await summaryRes.value.json()) as {
        data?: {
          battles_count?: number;
          wins_ratio?: number;
          damage_per_battle_average?: number;
          global_rating?: number;
          mastery?: { mastery_count?: number; vehicles_count?: number };
        };
      };
      const d = sumJson?.data;
      if (d) {
        if (typeof d.battles_count === 'number' && d.battles_count > 0) battles = d.battles_count;
        if (typeof d.wins_ratio === 'number') winrate = Number(d.wins_ratio.toFixed(2));
        if (typeof d.damage_per_battle_average === 'number') avgDamage = Math.round(d.damage_per_battle_average);
        if (typeof d.global_rating === 'number') globalRating = d.global_rating;
        if (d.mastery) {
          masteryCount = d.mastery.mastery_count || 0;
          vehiclesCount = d.mastery.vehicles_count || 0;
        }
      }
    }

    // Разбираем список техники игрока
    let favoriteTanks: string[] = [];
    let tankImages: string[] = [];
    let topTankImageUrl = '';
    let survivalRate = 34.0;
    let weightedTierSum = 0;
    let totalVehBattles = 0;

    if (vehiclesRes.status === 'fulfilled' && vehiclesRes.value.ok) {
      const vehJson = (await vehiclesRes.value.json()) as {
        data?: { parameters?: string[]; data?: any[][] };
      };
      const params = vehJson?.data?.parameters || [];
      const rows = vehJson?.data?.data || [];
      const idxName = params.indexOf('name');
      const idxTier = params.indexOf('tier');
      const idxBattles = params.indexOf('battles_count');
      const idxWinsRatio = params.indexOf('wins_ratio');
      const idxSurvived = params.indexOf('survived_battles');
      const idxAvgDmg = params.indexOf('damage_per_battle_average');
      const idxSmallImg = params.indexOf('small_image');

      if (idxName !== -1 && idxBattles !== -1 && rows.length > 0) {
        let totalSurvived = 0;
        for (const r of rows) {
          const b = Number(r[idxBattles] || 0);
          const s = idxSurvived !== -1 ? Number(r[idxSurvived] || 0) : 0;
          const t = idxTier !== -1 ? Number(r[idxTier] || 8) : 8;
          totalVehBattles += b;
          totalSurvived += s;
          weightedTierSum += b * t;
        }
        if (totalVehBattles > 0 && totalSurvived > 0) {
          survivalRate = Number(((totalSurvived / totalVehBattles) * 100).toFixed(1));
        }

        const sorted = [...rows].sort((a, b) => Number(b[idxBattles] || 0) - Number(a[idxBattles] || 0));
        const top4 = sorted.slice(0, 4);
        tankImages = top4.map((r) => {
          const rawImg = idxSmallImg !== -1 && r[idxSmallImg] ? String(r[idxSmallImg]) : '';
          const name = String(r[idxName] || 'Танк');
          return rawImg ? toProxiedSteamAvatar(rawImg) : getLestaTankRenderByName(name);
        });
        topTankImageUrl = tankImages[0] || '';
        favoriteTanks = top4.map((r) => {
          const name = String(r[idxName] || 'Танк');
          const b = Number(r[idxBattles] || 0);
          const wr = idxWinsRatio !== -1 ? Math.round(Number(r[idxWinsRatio] || 0)) : 0;
          const dmg = idxAvgDmg !== -1 ? Math.round(Number(r[idxAvgDmg] || 0)) : 0;
          return b > 0 ? `${name} (${b.toLocaleString('ru-RU')} боёв · ${wr}% · ${dmg} ур.)` : name;
        });
      }
    }

    // Разбираем медали и достижения
    const medals: string[] = [];
    let badgeUrl =
      masteryCount > 0
        ? toProxiedSteamAvatar('https://dav-static.tanki.su/ptlru/mt/current/achievement/big/markOfMastery4.png')
        : '';

    if (masteryCount > 0) {
      medals.push(`Знак «Мастер» (${masteryCount}/${vehiclesCount} машин)`);
    }

    if (achievementsRes.status === 'fulfilled' && achievementsRes.value.ok) {
      const achJson = (await achievementsRes.value.json()) as {
        data?: { parameters?: string[]; data?: any[][] };
      };
      const params = achJson?.data?.parameters || [];
      const rows = achJson?.data?.data || [];
      const idxCode = params.indexOf('name');
      const idxTitle = params.indexOf('mark');
      const idxValue = params.indexOf('value');
      const idxDeprecated = params.indexOf('deprecated');
      const idxIconBig = params.indexOf('icon_big');

      if (idxCode !== -1 && idxTitle !== -1 && rows.length > 0) {
        // Сначала ищем самые почетные боевые медали
        const sortedRows = [...rows]
          .filter((r) => {
            const title = String(r[idxTitle] || '').trim();
            return title.length > 0 && (idxDeprecated === -1 || !r[idxDeprecated]);
          })
          .sort((a, b) => {
            const codeA = String(a[idxCode] || '');
            const codeB = String(b[idxCode] || '');
            const pA = PRIORITY_TANKI_MEDALS.indexOf(codeA);
            const pB = PRIORITY_TANKI_MEDALS.indexOf(codeB);
            if (pA !== -1 && pB !== -1) return pA - pB;
            if (pA !== -1) return -1;
            if (pB !== -1) return 1;
            return Number(b[idxValue] || 0) - Number(a[idxValue] || 0);
          });

        if (idxIconBig !== -1 && sortedRows[0]?.[idxIconBig]) {
          badgeUrl = toProxiedSteamAvatar(String(sortedRows[0][idxIconBig]));
        }

        for (const r of sortedRows.slice(0, 5)) {
          const rawTitle = String(r[idxTitle] || '').replace(/[«»]/g, '').trim();
          const val = Number(r[idxValue] || 0);
          medals.push(val > 1 ? `${rawTitle} (×${val.toLocaleString('ru-RU')})` : rawTitle);
        }
      }
    }

    if (!badgeUrl) {
      badgeUrl = toProxiedSteamAvatar('https://dav-static.tanki.su/ptlru/mt/current/achievement/big/warrior.png');
    }

    // Проверяем точный WN8 из KTTC, если доступен
    let ratingWN8 = 0;
    if (kttcRes.status === 'fulfilled' && kttcRes.value) {
      const kttcHtml = kttcRes.value;
      const wn8Match = kttcHtml.match(/"wn8"\s*:\s*"(\d+(?:\.\d+)?)"/);
      const survMatch = kttcHtml.match(/"survivedBattles"\s*:\s*"(\d+)"/);
      if (wn8Match && Number(wn8Match[1]) > 0) {
        ratingWN8 = Math.round(Number(wn8Match[1]));
      }
      if (survMatch && battles > 0 && survivalRate === 34.0) {
        survivalRate = Number(((Number(survMatch[1]) / battles) * 100).toFixed(1));
      }
    }

    if (!ratingWN8) {
      const avgTier = totalVehBattles > 0 ? weightedTierSum / totalVehBattles : 8;
      ratingWN8 = estimateWN8FromStats(winrate, avgDamage, avgTier, globalRating);
    }

    const ratingTitle =
      globalRating > 0
        ? `${getWN8Title(ratingWN8)} · Рейтинг Lesta: ${globalRating.toLocaleString('ru-RU')}`
        : getWN8Title(ratingWN8);

    const serverLabel = chosen.clanTag ? `RU · Lesta [${chosen.clanTag}]` : 'RU · Lesta Games';
    const sourceUrl = `https://tanki.su/ru/community/accounts/${spaId}-${encodeURIComponent(exactNick)}/`;
    const kttcUrl = `https://kttc.ru/wot/ru/user/${encodeURIComponent(exactNick)}/`;
    const avatarUrl = clanEmblemUrl || badgeUrl || topTankImageUrl;

    return res.json({
      found: true,
      isRealData: true,
      sourceName: 'tanki.su & kttc.ru (Lesta)',
      sourceUrl,
      kttcUrl,
      candidates,
      stats: {
        nickname: exactNick,
        accountId: String(spaId),
        server: serverLabel,
        avatarUrl,
        badgeUrl,
        clanEmblemUrl,
        topTankImageUrl,
        tankImages,
        battles,
        winrate,
        avgDamage,
        ratingWN8,
        personalRating: globalRating,
        ratingTitle,
        survivalRate,
        favoriteTanks: favoriteTanks.length > 0 ? favoriteTanks : ['Данные ангара обновляются'],
        medals: medals.length > 0 ? medals : ['Боевые награды в профиле'],
        sourceUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      found: false,
      error: err?.message || 'Ошибка при получении реальной статистики «Мир Танков»',
    });
  }
});

/**
 * ============================================================================
 * 2. TANKS BLITZ (LESTA GAMES via blitz-commander.by/api/wotb/)
 * ============================================================================
 */
app.get('/api/stats/blitz', async (req, res) => {
  const nick = String(req.query.nick || '').trim();
  const requestedAccountId = String(req.query.accountId || '').trim();

  if (!nick && !requestedAccountId) {
    return res.status(400).json({ error: 'Введите никнейм игрока в «Tanks Blitz»' });
  }

  try {
    let candidates: Array<{ accountId: string; nickname: string }> = [];
    let accountId = requestedAccountId;
    let exactNick = nick;

    if (nick) {
      const listUrl = `https://blitz-commander.by/api/wotb/account/list/?search=${encodeURIComponent(nick)}&limit=12`;
      const listRes = await fetch(listUrl, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (!listRes.ok) {
        return res.status(502).json({ error: 'Сервер статистики Tanks Blitz временно недоступен' });
      }
      const listJson = (await listRes.json()) as {
        status?: string;
        data?: Array<{ account_id: number; nickname: string }>;
      };
      const items = listJson?.data || [];
      if (items.length === 0 && !accountId) {
        return res.status(404).json({
          found: false,
          error: `Игрок «${nick}» не найден в Tanks Blitz (Lesta). Проверьте правильность никнейма.`,
        });
      }

      candidates = items.slice(0, 8).map((item) => ({
        accountId: String(item.account_id),
        nickname: item.nickname,
      }));

      const chosen =
        (requestedAccountId && candidates.find((c) => c.accountId === requestedAccountId)) ||
        candidates.find((c) => c.nickname.toLowerCase() === nick.toLowerCase()) ||
        candidates[0];

      if (chosen) {
        accountId = chosen.accountId;
        exactNick = chosen.nickname;
      }
    }

    // Параллельно загружаем профиль игрока, танки, медали, клан и справочник техники
    const [infoRes, tanksRes, achRes, clanRes, encyclopedia] = await Promise.all([
      fetch(`https://blitz-commander.by/api/wotb/account/info/?account_id=${accountId}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      }),
      fetch(`https://blitz-commander.by/api/wotb/tanks/stats/?account_id=${accountId}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      }),
      fetch(`https://blitz-commander.by/api/wotb/account/achievements/?account_id=${accountId}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      }),
      fetch(`https://blitz-commander.by/api/wotb/clans/accountinfo/?account_id=${accountId}&extra=clan`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      }),
      getBlitzEncyclopedia(),
    ]);

    const infoJson = (await infoRes.json()) as {
      data?: Record<
        string,
        {
          nickname?: string;
          statistics?: {
            all?: {
              battles: number;
              wins: number;
              damage_dealt: number;
              survived_battles: number;
              frags: number;
              max_xp: number;
            };
          };
        }
      >;
    };

    const playerInfo = infoJson?.data?.[accountId];
    if (!playerInfo || !playerInfo.statistics?.all) {
      return res.status(404).json({
        found: false,
        error: `Профиль игрока «${exactNick}» в Tanks Blitz не содержит открытой статистики.`,
      });
    }

    if (playerInfo.nickname) exactNick = playerInfo.nickname;
    const all = playerInfo.statistics.all;
    const battles = Number(all.battles || 0);
    const wins = Number(all.wins || 0);
    const damageDealt = Number(all.damage_dealt || 0);
    const survived = Number(all.survived_battles || 0);

    const winrate = battles > 0 ? Number(((wins / battles) * 100).toFixed(2)) : 0;
    const avgDamage = battles > 0 ? Math.round(damageDealt / battles) : 0;
    const survivalRate = battles > 0 ? Number(((survived / battles) * 100).toFixed(1)) : 0;

    // Разбираем любимую технику игрока в Tanks Blitz
    let favoriteTanks: string[] = [];
    let tankImages: string[] = [];
    let topTankImageUrl = '';
    let weightedTierSum = 0;
    let totalTankBattles = 0;
    let masteryTanksCount = 0;

    if (tanksRes.ok) {
      const tanksJson = (await tanksRes.json()) as {
        data?: Record<
          string,
          Array<{
            tank_id: number;
            mark_of_mastery?: number;
            all?: { battles: number; wins: number; damage_dealt: number };
          }>
        >;
      };
      const tankList = tanksJson?.data?.[accountId] || [];
      for (const t of tankList) {
        const b = Number(t.all?.battles || 0);
        const vehInfo = encyclopedia[String(t.tank_id)];
        const tier = vehInfo?.tier || 7;
        totalTankBattles += b;
        weightedTierSum += b * tier;
        if (t.mark_of_mastery === 4) masteryTanksCount++;
      }

      const sortedTanks = [...tankList].sort((a, b) => Number(b.all?.battles || 0) - Number(a.all?.battles || 0));
      const top4Tanks = sortedTanks.slice(0, 4);
      tankImages = top4Tanks.map((t) => {
        const vehInfo = encyclopedia[String(t.tank_id)];
        return vehInfo?.imageUrl || getLestaTankRenderByName(vehInfo?.name || String(t.tank_id));
      });
      topTankImageUrl = tankImages[0] || '';

      favoriteTanks = top4Tanks.map((t) => {
        const vehInfo = encyclopedia[String(t.tank_id)];
        const name = vehInfo?.name || (t.tank_id === 30209 ? 'МС-11' : `Танк #${t.tank_id}`);
        const b = Number(t.all?.battles || 0);
        const w = Number(t.all?.wins || 0);
        const d = Number(t.all?.damage_dealt || 0);
        const wr = b > 0 ? Math.round((w / b) * 100) : 0;
        const avgD = b > 0 ? Math.round(d / b) : 0;
        return b > 0 ? `${name} (${b.toLocaleString('ru-RU')} боёв · ${wr}% · ${avgD} ур.)` : name;
      });
    }

    // Разбираем медали Tanks Blitz и подбираем реальную эмблему высшей награды игрока
    const medals: string[] = [];
    const masteryBadgeUrl = toProxiedSteamAvatar(
      'https://dav-static.tanki.su/ptlru/mt/current/achievement/big/markOfMastery4.png'
    );
    let topHeroMedalUrl = '';

    if (masteryTanksCount > 0) {
      medals.push(`Знак «Мастер» (${masteryTanksCount} танков)`);
    }
    if (achRes.ok) {
      const achJson = (await achRes.json()) as {
        data?: Record<string, { achievements?: Record<string, number> }>;
      };
      const achMap = achJson?.data?.[accountId]?.achievements || {};
      const entries = Object.entries(achMap)
        .filter(([key, val]) => BLITZ_MEDAL_NAMES[key] && Number(val) > 0)
        .sort((a, b) => {
          const keysOrder = Object.keys(BLITZ_MEDAL_NAMES);
          return keysOrder.indexOf(a[0]) - keysOrder.indexOf(b[0]);
        });

      for (const [key] of entries) {
        if (BLITZ_MEDAL_TO_LESTA_ICON[key]) {
          topHeroMedalUrl = getLestaMedalBigUrl(key);
          break;
        }
      }

      for (const [key, count] of entries.slice(0, 5)) {
        const ruName = BLITZ_MEDAL_NAMES[key];
        medals.push(count > 1 ? `${ruName} (×${count.toLocaleString('ru-RU')})` : ruName);
      }
    }

    // Проверяем клан
    let clanTag = '';
    if (clanRes.ok) {
      const clanJson = (await clanRes.json()) as {
        data?: Record<string, { clan?: { tag?: string } } | null>;
      };
      clanTag = clanJson?.data?.[accountId]?.clan?.tag || '';
    }

    const avgTier = totalTankBattles > 0 ? weightedTierSum / totalTankBattles : 7.5;
    const ratingWN8 = estimateWN8FromStats(winrate, avgDamage, avgTier);
    const ratingTitle = `${getWN8Title(ratingWN8)} (Ср. уровень: ${avgTier.toFixed(1)})`;
    const serverLabel = clanTag ? `Tanks Blitz · Lesta [${clanTag}]` : 'Tanks Blitz · Lesta RU';
    const sourceUrl = `https://blitz-commander.by/ru/player/${accountId}`;

    const avatarUrl = topHeroMedalUrl || masteryBadgeUrl || topTankImageUrl;
    const badgeUrl = masteryTanksCount > 0 ? masteryBadgeUrl : topHeroMedalUrl;

    return res.json({
      found: true,
      isRealData: true,
      sourceName: 'blitz-commander.by (Lesta API)',
      sourceUrl,
      candidates,
      stats: {
        nickname: exactNick,
        accountId: String(accountId),
        server: serverLabel,
        avatarUrl,
        badgeUrl,
        topTankImageUrl,
        tankImages,
        battles,
        winrate,
        avgDamage,
        ratingWN8,
        ratingTitle,
        survivalRate,
        favoriteTanks: favoriteTanks.length > 0 ? favoriteTanks : ['Данные ангара Blitz'],
        medals: medals.length > 0 ? medals : ['Боевые награды Blitz'],
        sourceUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      found: false,
      error: err?.message || 'Ошибка при получении реальной статистики Tanks Blitz',
    });
  }
});

/**
 * ============================================================================
 * 3. STEAM (steamcommunity.com: поиск по нику / ID / ссылке + парсинг профиля)
 * ============================================================================
 */
function extractSteamAvatarFrameFromHtml(html: string): string {
  const frameBlockMatch = html.match(
    /<div class="profile_avatar_frame">([\s\S]{1,1500}?)<\/div>/i
  );
  if (!frameBlockMatch) return '';

  const block = frameBlockMatch[1];
  const srcMatch =
    block.match(/<img[^>]+(?:src|srcset)="([^"]+)"/i) ||
    block.match(/<source[^>]+srcset="([^"]+)"/i);

  if (srcMatch && srcMatch[1] && !srcMatch[1].includes('arrowDn9x5')) {
    const url = srcMatch[1].trim().split(/\s+/)[0];
    if (url.startsWith('http')) return url;
  }
  return '';
}

function extractSteamAvatarFromHtml(html: string, fallbackAvatarUrl = ''): string {
  // 1. Вырезаем блок playerAvatarAutoSizeInner и удаляем из него рамку profile_avatar_frame,
  // чтобы регулярка не захватывала пустую прозрачную рамку вместо самой аватарки!
  const innerBlockMatch = html.match(
    /<div class="playerAvatarAutoSizeInner">([\s\S]{1,3000}?)<div class="profile_header_centered_col">/i
  );
  if (innerBlockMatch) {
    const withoutFrame = innerBlockMatch[1]
      .replace(/<div class="profile_avatar_frame">[\s\S]*?<\/picture>\s*<\/div>/gi, '')
      .replace(/<div class="profile_avatar_frame">[\s\S]*?<\/div>/gi, '');
    // В современной верстке Steam у тега <img> внутри <picture> часто указан только srcset="..." без src="..."
    const imgMatch =
      withoutFrame.match(/<img[^>]+(?:srcset|src)="([^"]+\.(?:jpg|jpeg|png|gif|webp))"/i) ||
      withoutFrame.match(/<source[^>]+srcset="([^"]+\.(?:jpg|jpeg|png|gif|webp))"/i);
    if (imgMatch && imgMatch[1] && !imgMatch[1].includes('arrowDn9x5')) {
      const url = imgMatch[1].trim().split(/\s+/)[0];
      if (url.startsWith('http')) return url;
    }
  }

  // 2. Проверяем мета-теги image_src и og:image (всегда содержат прямую ссылку на _full.jpg аватарку)
  const metaMatch =
    html.match(/<link\s+rel="image_src"\s+href="([^"]+)"/i) ||
    html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
    html.match(/https:\/\/avatars\.(?:fastly|akamai|cloudflare)\.steamstatic\.com\/[a-f0-9]+_full\.jpg/i);

  if (metaMatch) {
    const url = (metaMatch[1] || metaMatch[0]).trim();
    if (url.startsWith('http')) return url;
  }

  // 3. Фолбэк на аватарку из поиска кандидатов (повышаем разрешение с _medium до _full)
  if (fallbackAvatarUrl) {
    return fallbackAvatarUrl.replace('_medium.jpg', '_full.jpg');
  }

  return '';
}

app.get('/api/steam-avatar', async (req, res) => {
  const rawUrl = String(req.query.url || '').trim();
  if (
    !rawUrl ||
    !/^https?:\/\/([a-z0-9-]+\.)*(steamstatic\.com|akamaihd\.net|steamcommunity\.com|tanki\.su|lesta\.ru|tanksblitz\.ru|blitz-commander\.by)\//i.test(
      rawUrl
    )
  ) {
    return res.status(400).send('Invalid game avatar URL');
  }

  try {
    const imgRes = await fetch(rawUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    if (!imgRes.ok) {
      return res.status(imgRes.status).send('Failed to fetch game avatar');
    }
    const contentType = imgRes.headers.get('content-type') || 'image/png';
    const arrayBuffer = await imgRes.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(arrayBuffer));
  } catch {
    return res.status(502).send('Error proxying game avatar');
  }
});

async function searchSteamCandidates(query: string): Promise<
  Array<{
    steamNick: string;
    profileUrl: string;
    avatarUrl: string;
    rawAvatarUrl?: string;
  }>
> {
  try {
    const initRes = await fetch('https://steamcommunity.com/search/users/', {
      headers: { 'User-Agent': USER_AGENT },
    });
    const setCookie = initRes.headers.get('set-cookie') || '';
    const sessionId = setCookie.match(/sessionid=([^;]+)/)?.[1];
    if (!sessionId) return [];

    const ajaxUrl = `https://steamcommunity.com/search/SearchCommunityAjax?text=${encodeURIComponent(
      query
    )}&filter=users&sessionid=${sessionId}&steamid_user=false&page=1`;

    const searchRes = await fetch(ajaxUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: `sessionid=${sessionId}`,
        Accept: 'application/json',
      },
    });

    if (!searchRes.ok) return [];
    const data = (await searchRes.json()) as { html?: string };
    const html = data?.html || '';

    const results: Array<{ steamNick: string; profileUrl: string; avatarUrl: string; rawAvatarUrl?: string }> = [];
    const rowRegex =
      /<div class="search_row"[\s\S]*?<img src="([^"]+)"[\s\S]*?<a class="searchPersonaName" href="([^"]+)">([^<]+)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null && results.length < 8) {
      const rawAv = match[1].trim();
      results.push({
        rawAvatarUrl: rawAv,
        avatarUrl: toProxiedSteamAvatar(rawAv),
        profileUrl: match[2].trim(),
        steamNick: match[3].trim(),
      });
    }
    return results;
  } catch {
    return [];
  }
}

app.get('/api/stats/steam', async (req, res) => {
  const rawQuery = String(req.query.query || '').trim();
  const directProfileUrl = String(req.query.profileUrl || '').trim();

  if (!rawQuery && !directProfileUrl) {
    return res.status(400).json({ error: 'Введите никнейм, SteamID или ссылку на профиль Steam' });
  }

  try {
    let targetUrl = '';
    let candidates: Array<{ steamNick: string; profileUrl: string; avatarUrl: string; rawAvatarUrl?: string }> = [];
    const isNicknameSearch =
      !directProfileUrl && !rawQuery.includes('steamcommunity.com/') && !/^\d{17}$/.test(rawQuery);

    if (directProfileUrl && directProfileUrl.startsWith('https://steamcommunity.com/')) {
      targetUrl = directProfileUrl.replace(/\/+$/, '');
      if (rawQuery) {
        candidates = await searchSteamCandidates(rawQuery);
      }
    } else if (rawQuery.includes('steamcommunity.com/')) {
      const m = rawQuery.match(/https?:\/\/steamcommunity\.com\/(id|profiles)\/([^/?#]+)/i);
      if (m) {
        targetUrl = `https://steamcommunity.com/${m[1]}/${m[2]}`;
      }
    } else if (/^\d{17}$/.test(rawQuery)) {
      targetUrl = `https://steamcommunity.com/profiles/${rawQuery}`;
    } else {
      // Ищем кандидатов по нику И проверяем прямой vanity URL
      candidates = await searchSteamCandidates(rawQuery);
      targetUrl = `https://steamcommunity.com/id/${encodeURIComponent(rawQuery)}`;
    }

    // Загружаем страницу профиля
    let profileRes = await fetch(`${targetUrl}?l=russian`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru-RU,ru;q=0.9' },
    });
    let html = await profileRes.text();

    // Если по прямому /id/<query> профиль не найден ИЛИ это заброшенный аккаунт-пустышка со стандартным знаком вопроса (fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb),
    // берем лучшего кандидата с реальной аватаркой из поиска по нику!
    const isNotFound =
      !html.includes('actual_persona_name') ||
      html.includes('Указанный профиль не может быть найден') ||
      html.includes('The specified profile could not be found');

    const initialLevelMatch = html.match(/class="friendPlayerLevelNum">(\d+)<\/span>/);
    const initialLevel = initialLevelMatch ? parseInt(initialLevelMatch[1], 10) : 0;
    const hasDefaultQuestionAvatar = html.includes('fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb');

    if (
      (isNotFound || (isNicknameSearch && hasDefaultQuestionAvatar && initialLevel <= 5)) &&
      candidates.length > 0
    ) {
      const bestCandidate =
        candidates.find(
          (c) =>
            c.rawAvatarUrl &&
            !c.rawAvatarUrl.includes('fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb') &&
            c.steamNick.toLowerCase() === rawQuery.toLowerCase()
        ) ||
        candidates.find(
          (c) => c.rawAvatarUrl && !c.rawAvatarUrl.includes('fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb')
        ) ||
        candidates[0];

      targetUrl = bestCandidate.profileUrl.replace(/\/+$/, '');
      profileRes = await fetch(`${targetUrl}?l=russian`, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru-RU,ru;q=0.9' },
      });
      html = await profileRes.text();
    }

    if (!html.includes('actual_persona_name')) {
      return res.status(404).json({
        found: false,
        error: `Профиль Steam «${rawQuery}» не найден. Попробуйте ввести точный никнейм или вставить ссылку на профиль Steam.`,
      });
    }

    const personaMatch = html.match(/class="actual_persona_name">([^<]+)<\/span>/);
    const steamNick = personaMatch ? personaMatch[1].trim() : rawQuery;

    const levelMatch = html.match(/class="friendPlayerLevelNum">(\d+)<\/span>/);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : 1;

    const matchedCandidate = candidates.find(
      (c) => c.profileUrl.replace(/\/+$/, '').toLowerCase() === targetUrl.toLowerCase()
    );
    const rawAvatarUrl = extractSteamAvatarFromHtml(html, matchedCandidate?.rawAvatarUrl || '');
    const avatarUrl = toProxiedSteamAvatar(rawAvatarUrl);

    const rawAvatarFrameUrl = extractSteamAvatarFrameFromHtml(html);
    const avatarFrameUrl = toProxiedSteamAvatar(rawAvatarFrameUrl);

    // Статус в сети
    const inGameMatch = html.match(/class="profile_in_game_name">([^<]+)<\/div>/);
    const stateHeaderMatch = html.match(/class="profile_in_game_header">([^<]+)<\/div>/);
    let rawStatus = 'Профиль Steam открыт';
    if (inGameMatch) {
      rawStatus = `В игре: ${inGameMatch[1].trim()}`;
    } else if (stateHeaderMatch) {
      rawStatus = stateHeaderMatch[1].trim();
    }

    // Счетчики профиля (Игры, Значки, Награды)
    const countMatches = [
      ...html.matchAll(
        /<span class="count_link_label">([^<]+)<\/span>&nbsp;\s*<span class="profile_count_link_total">\s*([^<]+)<\/span>/g
      ),
    ];
    const countsMap: Record<string, number> = {};
    for (const m of countMatches) {
      const label = m[1].trim();
      const val = parseInt(m[2].replace(/\s|\u00a0/g, ''), 10);
      if (!isNaN(val)) countsMap[label] = val;
    }

    const ownedGamesCount = countsMap['Игры'] || 0;
    const badgesCount = countsMap['Значки'] || 0;

    // Собираем игры и часы:
    // 1) Из витрины Любимая игра (favoritegame_showcase)
    const favoriteGames: Array<{ name: string; hours: number; genre?: string }> = [];
    const seenGames = new Set<string>();

    const favShowcaseMatch = html.match(
      /favoritegame_showcase[\s\S]{1,1800}?showcase_item_detail_title">\s*<a[^>]*>\s*([^<\n\r]+)\s*<\/a>[\s\S]{1,1200}?<div class="value">([\d\s.,\u00a0]+)<\/div>\s*<div class="label">Часов сыграно<\/div>/i
    );
    if (favShowcaseMatch) {
      const gName = favShowcaseMatch[1].trim();
      const gHours = parseFloat(favShowcaseMatch[2].replace(/\s|\u00a0|,/g, '')) || 0;
      if (gName && !seenGames.has(gName.toLowerCase())) {
        seenGames.add(gName.toLowerCase());
        const roundedHours = gHours >= 10 ? Math.round(gHours) : Number(gHours.toFixed(1));
        favoriteGames.push({ name: gName, hours: roundedHours, genre: 'Любимая игра витрины' });
      }
    }

    // 2) Из блока недавней активности (recent_game)
    // В Steam блок «Недавняя активность» отсортирован по дате последнего запуска (а не по часам).
    // Кроме того, если в игру сыграно < 0,5 ч., раньше Math.round округлял часы в 0,
    // а если сыграно < 6 мин. (или включена настройка «Скрывать общее время в игре»), Steam выводит только дату запуска без часов.
    const recentBlockRegex =
      /class="game_info_details">([\s\S]{1,900}?)class="game_name"><a[^>]*>([^<]+)<\/a>/gi;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = recentBlockRegex.exec(html)) !== null) {
      const detailsBlock = rMatch[1] || '';
      const gName = (rMatch[2] || '').trim();
      if (!gName || seenGames.has(gName.toLowerCase())) continue;

      const hrsMatch = detailsBlock.match(/([\d.,\s\u00a0]+)\s*(?:ч\.|hrs?)\s*(?:всего|on record)/i);
      const minsMatch = detailsBlock.match(/([\d.,\s\u00a0]+)\s*(?:мин\.|mins?)\s*(?:всего|on record)/i);

      let rawHrs = 0;
      if (hrsMatch) {
        rawHrs = parseFloat(hrsMatch[1].replace(/\s|\u00a0/g, '').replace(',', '.')) || 0;
      } else if (minsMatch) {
        const mins = parseFloat(minsMatch[1].replace(/\s|\u00a0/g, '').replace(',', '.')) || 0;
        rawHrs = mins > 0 ? Math.max(0.1, Number((mins / 60).toFixed(1))) : 0;
      }
      const cleanHours = rawHrs >= 10 ? Math.round(rawHrs) : Number(rawHrs.toFixed(1));

      const lastLaunchMatch = detailsBlock.match(/последний запуск\s+([^<\n\r\t]+)/i);
      const inGameNow = /В игре/i.test(detailsBlock);
      const activityNote = inGameNow
        ? 'сейчас в игре'
        : lastLaunchMatch
          ? `запуск ${lastLaunchMatch[1].trim()}`
          : '';

      seenGames.add(gName.toLowerCase());
      favoriteGames.push({
        name: gName,
        hours: cleanHours,
        genre:
          cleanHours > 0
            ? activityNote
              ? `Недавняя активность · ${activityNote}`
              : 'Недавняя активность в Steam'
            : activityNote
              ? `Недавняя активность · ${activityNote} (часы не указаны в Steam)`
              : 'Недавняя активность (часы скрыты в Steam)',
      });
    }

    // 3) Если игр меньше 4, проверяем страницу обзоров (/recommended/) и значков (/badges/)
    if (favoriteGames.length < 4) {
      const [recRes, badgesRes] = await Promise.allSettled([
        fetch(`${targetUrl}/recommended/?l=russian`, { headers: { 'User-Agent': USER_AGENT } }),
        fetch(`${targetUrl}/badges/?l=russian`, { headers: { 'User-Agent': USER_AGENT } }),
      ]);

      if (badgesRes.status === 'fulfilled' && badgesRes.value.ok) {
        const bHtml = await badgesRes.value.text();
        // Ищем игровые значки (у которых есть ссылка на /gamecards/<appid>)
        const gameCardBlocks = [
          ...bHtml.matchAll(/href="[^"]*\/gamecards\/(\d+)[^"]*"[\s\S]{1,600}?class="badge_title">\s*([^<\n\r&]+)/gi),
        ];
        const SystemBadgeWords = ['коллекция', 'распродажа', 'комитет', 'выслуга', 'вклад', 'покупатель', 'лидер', 'awards'];
        for (const gb of gameCardBlocks) {
          const title = gb[2].trim();
          const isSystem = SystemBadgeWords.some((w) => title.toLowerCase().includes(w));
          if (title && !isSystem && !seenGames.has(title.toLowerCase()) && favoriteGames.length < 4) {
            seenGames.add(title.toLowerCase());
            favoriteGames.push({ name: title, hours: 0, genre: 'Значок из библиотеки Steam' });
          }
        }
      }

      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const rHtml = await recRes.value.text();
        const revMatches = [...rHtml.matchAll(/class="hours">([\d.,\s\u00a0]+)\s*ч\.\s*всего/gi)];
        if (revMatches.length > 0 && favoriteGames.length === 0) {
          const hrs = parseFloat(revMatches[0][1].replace(/\s|\u00a0/g, '').replace(',', '.')) || 0;
          favoriteGames.push({ name: 'Counter-Strike 2 / Игры профиля', hours: Math.round(hrs), genre: 'По обзору в Steam' });
        }
      }
    }

    // Сортируем игры по убыванию наигранных часов (чтобы #1 всегда была самой популярной по часам,
    // а игры с 0 / скрытыми часами из недавних запусков или значков шли в конце списка, а не на #2 месте)
    favoriteGames.sort((a, b) => (b.hours || 0) - (a.hours || 0));

    const totalVisibleHours = Number(
      favoriteGames.reduce((acc, g) => acc + (g.hours || 0), 0).toFixed(1)
    );
    const statusParts = [rawStatus];
    if (ownedGamesCount > 0) statusParts.push(`Игр в библиотеке: ${ownedGamesCount}`);
    if (badgesCount > 0) statusParts.push(`Значков: ${badgesCount}`);

    return res.json({
      found: true,
      isRealData: true,
      sourceName: 'Steam Community',
      sourceUrl: targetUrl,
      candidates,
      hoursArePrivate: totalVisibleHours === 0,
      stats: {
        steamNick,
        steamIdOrUrl: targetUrl,
        avatarUrl,
        avatarFrameUrl,
        level,
        totalHours: totalVisibleHours,
        ownedGamesCount,
        badgesCount,
        statusText: statusParts.join(' · '),
        favoriteGames:
          favoriteGames.length > 0
            ? favoriteGames
            : [
                {
                  name: ownedGamesCount > 0 ? `Библиотека Steam (${ownedGamesCount} игр)` : 'Counter-Strike 2',
                  hours: 0,
                  genre: 'Часы скрыты настройками приватности Steam',
                },
              ],
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      found: false,
      error: err?.message || 'Ошибка при загрузке профиля Steam',
    });
  }
});

/**
 * ============================================================================
 * ПОСТОЯННОЕ ХРАНЕНИЕ ОРИГИНАЛЬНОГО МУЗЫКАЛЬНОГО ТРЕКА МАШИНЫ
 * ============================================================================
 */
const CAR_AUDIO_DIR = path.resolve(__dirname, 'public', 'assets', 'aistudio');
const CAR_AUDIO_META_PATH = path.join(CAR_AUDIO_DIR, 'original_bass_meta.json');
const DEFAULT_UPLOADED_TRACK_FILENAME = '____________5d3ff621.mp3';

app.get('/api/car-audio', (_req, res) => {
  try {
    if (fs.existsSync(CAR_AUDIO_META_PATH)) {
      const metaRaw = fs.readFileSync(CAR_AUDIO_META_PATH, 'utf-8');
      const meta = JSON.parse(metaRaw);
      if (meta && meta.fileName && fs.existsSync(path.join(CAR_AUDIO_DIR, meta.fileName))) {
        return res.json({
          exists: true,
          audioUrl: `/api/car-audio/stream?v=${meta.updatedAt || 1}`,
          trackName: meta.trackName || 'Тёмный дух',
        });
      }
    }
    if (fs.existsSync(path.join(CAR_AUDIO_DIR, DEFAULT_UPLOADED_TRACK_FILENAME))) {
      return res.json({
        exists: true,
        audioUrl: `/assets/aistudio/${DEFAULT_UPLOADED_TRACK_FILENAME}`,
        trackName: 'Тёмный дух',
      });
    }
    return res.json({ exists: false });
  } catch {
    return res.json({ exists: false });
  }
});

app.get('/api/car-audio/stream', (_req, res) => {
  try {
    if (fs.existsSync(CAR_AUDIO_META_PATH)) {
      const meta = JSON.parse(fs.readFileSync(CAR_AUDIO_META_PATH, 'utf-8'));
      const filePath = path.join(CAR_AUDIO_DIR, meta.fileName || DEFAULT_UPLOADED_TRACK_FILENAME);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', meta.mimeType || 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.sendFile(filePath);
      }
    }
    const defaultPath = path.join(CAR_AUDIO_DIR, DEFAULT_UPLOADED_TRACK_FILENAME);
    if (fs.existsSync(defaultPath)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.sendFile(defaultPath);
    }
    return res.status(404).end();
  } catch {
    return res.status(404).end();
  }
});

app.post('/api/car-audio', (req, res) => {
  try {
    const { audioDataUrl, trackName } = req.body || {};
    if (!audioDataUrl || typeof audioDataUrl !== 'string') {
      return res.status(400).json({ ok: false, error: 'Не переданы аудиоданные' });
    }

    if (!fs.existsSync(CAR_AUDIO_DIR)) {
      fs.mkdirSync(CAR_AUDIO_DIR, { recursive: true });
    }

    const match = audioDataUrl.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'mp3';
      const fileName = `original_bass_track.${ext}`;
      const filePath = path.join(CAR_AUDIO_DIR, fileName);

      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      const updatedAt = Date.now();
      const meta = {
        fileName,
        mimeType,
        trackName: trackName || 'Оригинальный трек',
        updatedAt,
      };
      fs.writeFileSync(CAR_AUDIO_META_PATH, JSON.stringify(meta, null, 2), 'utf-8');

      return res.json({
        ok: true,
        audioUrl: `/api/car-audio/stream?v=${updatedAt}`,
        trackName: meta.trackName,
      });
    }

    return res.status(400).json({ ok: false, error: 'Некорректный формат аудио' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Ошибка сохранения трека' });
  }
});

/**
 * ============================================================================
 * RETRO BROWSER GAMES MIRROR PROXY (Tank Trouble 2 & Custom Games)
 * ============================================================================
 * Проксирует все ассеты игры с g2.igroutka.ru на наш origin, убирая рекламные
 * баннеры (#more_g) и блокировщик (#game_lock), а также блокируя скролл страницы
 * при нажатии стрелок и пробела внутри игрового канваса.
 */
const TANK_TROUBLE_2_BASE = 'https://g2.igroutka.ru/games/72/tanki_labirinte_4/tank-trouble-2/';
const TANK_TROUBLE_LOCAL_DIR = path.join(__dirname, 'public', 'assets', 'games', 'tank-trouble-2');

const TANK_TROUBLE_CLEAN_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, minimal-ui">
  <base href="/api/retro-mirror/tank-trouble-2/">
  <title>Танки в лабиринте 4 (Tank Trouble 2)</title>
  <link rel="stylesheet" type="text/css" media="all" href="arcadegame.css">
  <style type="text/css">
    * { padding: 0; margin: 0; }
    html, body {
      background: #000;
      color: #fff;
      overflow: hidden;
      touch-action: none;
      -ms-touch-action: none;
    }
    canvas {
      touch-action-delay: none;
      touch-action: none;
      -ms-touch-action: none;
    }
  </style>
  <script>
    window.addEventListener('click', function() {
      window.focus();
    });
  </script>
</head>
<body>
  <div id="fb-root"></div>
  <div id="c2canvasdiv">
    <canvas id="c2canvas" width="965" height="644"></canvas>
  </div>
  <script>
    var constructNet_madeInC2 = true;
    var constructNet_scriptURLs = ["jquery-2.1.1.min.js", "firebase.js", "pathfind.js", "c2runtime.js"];
  </script>
  <script src="v837/arcade/playgame.js"></script>
</body>
</html>`;

app.get('/api/retro-mirror/tank-trouble-2*', async (req, res) => {
  try {
    const prefix = '/api/retro-mirror/tank-trouble-2';
    let subPath = decodeURIComponent(req.path.slice(prefix.length));
    if (!subPath || subPath === '/' || subPath === '/index.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(TANK_TROUBLE_CLEAN_HTML);
    }
    if (subPath.startsWith('/')) {
      subPath = subPath.slice(1);
    }

    // 1. Сначала проверяем локальный кэш на диске (все 97 спрайтов и скриптов лежат локально и отдаются за <1мс)
    const safeLocalPath = path.resolve(TANK_TROUBLE_LOCAL_DIR, subPath);
    if (safeLocalPath.startsWith(TANK_TROUBLE_LOCAL_DIR) && fs.existsSync(safeLocalPath) && fs.statSync(safeLocalPath).isFile()) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(safeLocalPath);
    }

    // 2. Если файла нет локально, скачиваем с источника и сохраняем на диск
    const targetUrl = `${TANK_TROUBLE_2_BASE}${encodeURI(subPath)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://igroutka.ru/',
        Accept: req.headers.accept || '*/*',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Upstream error: ${upstream.status}`);
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (safeLocalPath.startsWith(TANK_TROUBLE_LOCAL_DIR)) {
      try {
        fs.mkdirSync(path.dirname(safeLocalPath), { recursive: true });
        fs.writeFileSync(safeLocalPath, buf);
      } catch {
        // ignore cache write error
      }
    }
    return res.send(buf);
  } catch (err: any) {
    return res.status(502).send(`Retro mirror error: ${err?.message || 'unknown'}`);
  }
});

/**
 * Прокси для Newgrounds (uploads.ungrounded.net) — снимает CSP frame-ancestors
 * и подставляет Referer: https://www.newgrounds.com/ для Ruffle (.js / .wasm) и .swf файлов.
 */
const SWF_SCRIPT_CHUNK_BYTES = 524289; // Exact multiple of 3 bytes (~682 KB base64 per .js file)
let cachedSwfBase64Parts: string[] | null = null;

function getSwfBase64Parts(): string[] {
  if (cachedSwfBase64Parts) return cachedSwfBase64Parts;
  const swfPath = path.join(__dirname, 'public', 'assets', 'games', 'superfighters.swf');
  if (!fs.existsSync(swfPath)) return [];
  const swfBuf = fs.readFileSync(swfPath);
  const parts: string[] = [];
  for (let offset = 0; offset < swfBuf.length; offset += SWF_SCRIPT_CHUNK_BYTES) {
    parts.push(swfBuf.subarray(offset, Math.min(swfBuf.length, offset + SWF_SCRIPT_CHUNK_BYTES)).toString('base64'));
  }
  cachedSwfBase64Parts = parts;
  return parts;
}

const serveLocalRuffleFile = async (req: express.Request, res: express.Response) => {
  const filename = path.basename(req.params.filename || '');

  // Раздача 6 частей superfighters.swf в виде обычных JS-скриптов (/api/ruffle-v10/sf_swf_0.js ... sf_swf_5.js)
  // Точно такой же формат и размер (~680 КБ), как у ruffle.js, который гарантированно проходит через прокси за <0.5с без fetch()
  const swfPartMatch = filename.match(/^sf_swf_(\d+)\.js$/);
  if (swfPartMatch) {
    const partIdx = parseInt(swfPartMatch[1], 10);
    const parts = getSwfBase64Parts();
    if (partIdx >= 0 && partIdx < parts.length) {
      const jsBody = `window.__SF_SWF_PARTS__=window.__SF_SWF_PARTS__||[];window.__SF_SWF_PARTS__[${partIdx}]="${parts[partIdx]}";if(typeof window.__ON_SF_SWF_PART__==="function")window.__ON_SF_SWF_PART__(${partIdx});\n`;
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(jsBody);
    }
    return res.status(404).end();
  }

  const ruffleDir = path.join(__dirname, 'public', 'assets', 'ruffle');
  const rawPath = path.join(ruffleDir, filename);

  if (filename.endsWith('.wasm')) {
    res.setHeader('Content-Type', 'application/wasm');
  } else if (filename.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 200) {
    return res.sendFile(rawPath);
  }

  try {
    const upstream = await fetch(`https://uploads.ungrounded.net/ruffle_wrapper/lib/${filename}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://www.newgrounds.com/',
      },
    });
    if (upstream.ok) {
      const buf = Buffer.from(await upstream.arrayBuffer());
      fs.mkdirSync(ruffleDir, { recursive: true });
      fs.writeFileSync(rawPath, buf);
      return res.send(buf);
    }
  } catch {
    // ignore
  }
  return res.status(404).end();
};

app.get('/api/local-ruffle/:filename', serveLocalRuffleFile);
app.get('/api/ruffle-v8/:filename', serveLocalRuffleFile);
app.get('/api/ruffle-v9/:filename', serveLocalRuffleFile);
app.get('/api/ruffle-v10/:filename', serveLocalRuffleFile);
app.get('/ruffle_wrapper/lib/:filename', serveLocalRuffleFile);

/**
 * Прямая раздача локального SWF-файла Superfighters с корректным MIME-типом
 */
const serveLocalSuperfightersSwf = (_req: express.Request, res: express.Response) => {
  const swfFile = path.join(__dirname, 'public', 'assets', 'games', 'superfighters.swf');
  const stat = fs.statSync(swfFile);
  res.setHeader('Content-Type', 'application/x-shockwave-flash');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'X-Raw-Length, Content-Length');
  res.setHeader('X-Raw-Length', String(stat.size));
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.sendFile(swfFile);
};

app.get('/api/superfighters.swf', serveLocalSuperfightersSwf);
app.get('/api/ungrounded.net/575000/575163_Superfighters.swf', serveLocalSuperfightersSwf);

/**
 * Мгновенная локальная заглушка для Newgrounds API Gateway (ngads.com/gateway_v2.php),
 * чтобы Superfighters.swf не ждал ответа от внешнего сервера.
 */
app.all('/api/ngads-gateway*', (_req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.send(
    JSON.stringify({
      command_id: 'connectMovie',
      success: 1,
      movie_name: 'Superfighters',
      movie_version: '1.41',
      ad_status: 1,
    })
  );
});

/**
 * Чистый полноэкранный Ruffle-плеер для Superfighters.
 * Загружает SWF через 6 обычных <script src="/api/ruffle-v10/sf_swf_0.js..5.js"> тегов (без единого fetch() к серверу!)
 * и использует глобальный CDN Ruffle (jsdelivr / unpkg), чтобы WASM качался напрямую с Cloudflare мимо прокси.
 */
const serveSuperfightersPlayerHtml = (_req: express.Request, res: express.Response) => {
  const partsCount = getSwfBase64Parts().length || 6;

  const html = `<!DOCTYPE html>
<html lang="ru" style="width:100%;height:100%;margin:0;padding:0;background:#000;overflow:hidden;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Superfighters — Ruffle Flash Player</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #ruffle_content {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }
    ruffle-player {
      margin: 0 auto;
      display: block;
      width: 100%;
      height: 100%;
    }
    #sf_loader_overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #f8fafc;
      gap: 14px;
      padding: 24px;
      text-align: center;
    }
    #sf_loader_overlay.hidden {
      opacity: 0;
      pointer-events: none;
      display: none !important;
    }
    .sf-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #fbbf24;
      text-transform: uppercase;
    }
    .sf-status {
      font-size: 13px;
      color: #cbd5e1;
      font-variant-numeric: tabular-nums;
    }
    .sf-bar-wrap {
      width: 280px;
      max-width: 85vw;
      height: 8px;
      background: #1e293b;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .sf-bar-fill {
      height: 100%;
      width: 8%;
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
      transition: width 0.15s ease;
    }
  </style>
  <script>
    try {
      Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
    } catch (e) {}
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = {
      preferredRenderer: "webgl",
      autoplay: "on",
      unmuteOverlay: "visible",
      backgroundColor: "#000000",
      letterbox: "on",
      warnOnUnsupportedContent: false,
      contextMenu: "on",
      scale: "showAll",
      forceScale: true,
      quality: "high"
    };
  </script>
</head>
<body>
  <div id="sf_loader_overlay">
    <div class="sf-title">Superfighters</div>
    <div id="sf_status_text" class="sf-status">Загрузка игровых пакетов (0/${partsCount})...</div>
    <div class="sf-bar-wrap">
      <div id="sf_bar_fill" class="sf-bar-fill"></div>
    </div>
  </div>
  <div id="ruffle_content"></div>
  <script>
    (function() {
      var overlay = document.getElementById("sf_loader_overlay");
      var statusText = document.getElementById("sf_status_text");
      var barFill = document.getElementById("sf_bar_fill");
      var TOTAL_PARTS = ${partsCount};
      var loadedParts = 0;

      window.__ON_SF_SWF_PART__ = function() {
        loadedParts += 1;
        var pct = Math.min(90, Math.round((loadedParts / TOTAL_PARTS) * 85) + 5);
        if (barFill) barFill.style.width = pct + "%";
        if (statusText) {
          statusText.textContent = "Загрузка Superfighters: пакет " + loadedParts + " из " + TOTAL_PARTS + " (" + pct + "%)";
        }
      };

      function addScriptTag(src) {
        return new Promise(function(resolve, reject) {
          var s = document.createElement("script");
          s.src = src;
          s.async = false;
          s.onload = function() { resolve(); };
          s.onerror = function() { reject(new Error("Не удалось загрузить " + src)); };
          document.body.appendChild(s);
        });
      }

      function decodeBase64Parts(parts) {
        var joined = parts.join("");
        var binStr = window.atob(joined);
        var len = binStr.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        return bytes;
      }

      function forceHideSplash(player) {
        if (overlay) overlay.classList.add("hidden");
        try {
          var sr = player && player.shadowRoot;
          if (sr) {
            var sp = sr.getElementById("splash-screen");
            if (sp) sp.classList.add("hidden");
            var ct = sr.getElementById("container");
            if (ct) ct.classList.remove("hidden");
          }
        } catch (e) {}
      }

      async function boot() {
        try {
          var scriptPromises = [];
          for (var i = 0; i < TOTAL_PARTS; i++) {
            scriptPromises.push(addScriptTag("/api/ruffle-v10/sf_swf_" + i + ".js"));
          }
          await Promise.all(scriptPromises);

          if (statusText) statusText.textContent = "Подключение движка Ruffle CDN...";
          if (barFill) barFill.style.width = "95%";

          try {
            await addScriptTag("https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle/ruffle.js");
          } catch (e1) {
            await addScriptTag("https://unpkg.com/@ruffle-rs/ruffle/ruffle.js");
          }

          var swfBytes = decodeBase64Parts(window.__SF_SWF_PARTS__ || []);
          var ruffle = window.RufflePlayer.newest();
          var player = ruffle.createPlayer();
          var container = document.getElementById("ruffle_content");
          container.appendChild(player);

          player.style.width = "100%";
          player.style.height = "100%";

          player.addEventListener("loadedmetadata", function() { forceHideSplash(player); });
          player.addEventListener("loadeddata", function() { forceHideSplash(player); });

          var loadConfig = {
            data: swfBytes,
            swfFileName: "575163_Superfighters.swf",
            base: "https://uploads.ungrounded.net/575000/",
            urlRewriteRules: [
              [/^https?:\\/\\/(www\\.)?ngads\\.com\\/gateway_v2\\.php.*/i, window.location.origin + "/api/ngads-gateway"]
            ],
            parameters: {
              NewgroundsAPI_PublisherID: 1,
              NewgroundsAPI_SandboxID: "6ae0c67aca63f",
              NewgroundsAPI_SessionID: "",
              NewgroundsAPI_UserName: "<deleted>",
              NewgroundsAPI_UserID: 0,
              ng_username: "<deleted>",
              browsermode: "default",
              ngLoadedViaRuffle: 1
            },
            autoplay: "on",
            unmuteOverlay: "visible",
            backgroundColor: "#000000",
            allowScriptAccess: true,
            allowFullscreen: true,
            forceScale: true,
            scale: "showAll",
            letterbox: "on",
            warnOnUnsupportedContent: false
          };

          var p = typeof player.ruffle === "function" ? player.ruffle().load(loadConfig) : player.load(loadConfig);
          await p;
          forceHideSplash(player);
          window.focus();
        } catch (err) {
          if (statusText) {
            statusText.textContent = "Ошибка: " + (err && err.message ? err.message : String(err));
          }
        }
      }

      boot();
    })();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.send(html);
};

app.get('/api/retro-mirror/superfighters*', serveSuperfightersPlayerHtml);

/**
 * Прокси для Newgrounds (uploads.ungrounded.net) — перехватывает обращения к ruffleembed.html
 * и 575163_Superfighters.swf и отдаёт локальные мгновенные версии.
 */
app.get('/api/ng-proxy/*', async (req, res) => {
  try {
    const prefix = '/api/ng-proxy/';
    const subPath = req.originalUrl.slice(prefix.length);

    if (subPath.includes('ruffleembed.html')) {
      return serveSuperfightersPlayerHtml(req, res);
    }
    if (subPath.includes('575163_Superfighters.swf')) {
      return serveLocalSuperfightersSwf(req, res);
    }
    if (subPath.startsWith('ruffle_wrapper/lib/')) {
      req.params.filename = path.basename(subPath.split('?')[0]);
      return serveLocalRuffleFile(req, res);
    }

    const targetUrl = `https://uploads.ungrounded.net/${subPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://www.newgrounds.com/',
        Origin: 'https://www.newgrounds.com',
        Accept: req.headers.accept || '*/*',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Newgrounds upstream error: ${upstream.status}`);
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(502).send(`NG proxy error: ${err?.message || 'unknown'}`);
  }
});

/**
 * ============================================================================
 * VITE MIDDLEWARE / STATIC ASSETS
 * ============================================================================
 */
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: {
          server: httpServer,
        },
        // Cast to any to support Vite's server.ws option alongside hmr
        ...({
          ws: {
            server: httpServer,
          },
        } as Record<string, unknown>),
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
