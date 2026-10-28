/**
 * Типы данных для модульного сайта-поздравления «Пазл впечатлений».
 * Вся структура спроектирована так, чтобы можно было легко добавлять
 * новые блоки любого типа и моментально экспортировать в файл или JSON.
 */

export type PuzzleBlockType = 
  | 'letter'        // Интерактивный конверт с раскрывающимся письмом
  | 'car_bass'      // Поздравление для тачки, качественного недорогого бензина и мощного сабвуфера
  | 'gaming'        // Игры & статистика: Steam, Мир Танков, Tanks Blitz
  | 'memory'        // Карточка воспоминания / локального мема со спойлером
  | 'achievement'   // Забавная ачивка или звание
  | 'trivia'        // Шуточный вопрос с реакциями на ответы
  | 'quote'         // Легендарная фразочка или цитата
  | 'finale';       // Финальное напутствие и запуск мега-салюта

export interface CarBassSpec {
  label: string;
  value: string;
  iconName: string;
}

export interface CarBassContent {
  carHeadline: string;
  wishes: string[];
  specs: CarBassSpec[];
  bassButtonText?: string;
  bassTrackNote?: string;
  imageUrl?: string;
  imageCaption?: string;
  audioUrl?: string; // Ссылка или DataURL на аудиозапись
  trackName?: string; // Название аудиодорожки
}

export interface TankStats {
  nickname: string;
  accountId?: string;
  server: string;
  avatarUrl?: string;       // Основная аватарка / эмблема профиля (клан, медаль, танк или свой URL)
  badgeUrl?: string;        // Знак отличия / медаль в углу аватарки (например, Знак «Мастер» или Колобанов)
  clanEmblemUrl?: string;   // Эмблема клана Lesta (195x195)
  topTankImageUrl?: string; // Изображение главного танка ангара
  tankImages?: string[];    // Иконки для всех 4 любимых танков ангара
  battles: number;
  winrate: number;          // Процент побед, например 58.4
  avgDamage: number;        // Средний урон, например 2480
  ratingWN8: number;        // WN8, например 2450
  personalRating?: number;  // Личный рейтинг Lesta
  ratingTitle: string;      // Например: "Бирюза · Отличный боец"
  favoriteTanks: string[];  // Например: ["ИС-7", "Bat.-Châtillon 25 t", "Объект 140"]
  medals: string[];         // Например: ["Колобанов", "Воин", "Мастер", "Основной калибр"]
  survivalRate?: number;    // Процент выживаемости, например 39.5
  funnyTitle?: string;      // Мемное звание
  sourceUrl?: string;       // Прямая ссылка на реальный профиль игрока
  kttcUrl?: string;         // Ссылка на профиль KTTC (для Мира Танков)
  isRealData?: boolean;     // Флаг, что данные загружены с реального аккаунта
}

export interface SteamGame {
  name: string;
  hours: number;
  genre?: string;
}

export interface SteamStats {
  steamNick: string;
  steamIdOrUrl?: string;
  avatarUrl?: string;
  avatarFrameUrl?: string;
  level: number;
  totalHours: number;
  ownedGamesCount?: number;
  badgesCount?: number;
  favoriteGames: SteamGame[];
  statusText?: string;
  sourceUrl?: string;
  isRealData?: boolean;
}

export interface GamingContent {
  headline: string;
  subtitleNote?: string;
  tanki: TankStats;
  blitz: TankStats;
  steam: SteamStats;
  funnyQuotes: string[];
}

export interface LetterContent {
  stampText?: string;
  salutation: string;
  message: string[];
  signature: string;
  postScriptum?: string;
}

export interface MemoryContent {
  dateOrPlace?: string;
  summary: string;
  secretDetail: string; // Раскрывается по клику
  imageUrl?: string;
  imageCaption?: string;
  tag?: string;
}

export interface AchievementItem {
  id: string;
  iconName: string; // Имя иконки Lucide (Trophy, Flame, Award, Shield, Sparkles, etc.)
  title: string;
  badge: string;
  description: string;
}

export interface AchievementContent {
  subtitle?: string;
  items: AchievementItem[];
}

export interface TriviaOption {
  text: string;
  isCorrect: boolean;
  comment: string; // Смешной комментарий при выборе этого варианта
}

export interface TriviaContent {
  question: string;
  contextHint?: string;
  options: TriviaOption[];
  rewardMessage: string;
}

export interface QuoteContent {
  quote: string;
  context: string;
  yearOrPlace?: string;
}

export interface FinaleContent {
  heading: string;
  wishes: string[];
  callToAction: string;
  authorNote: string;
}

export interface PuzzleBlock {
  id: string;
  type: PuzzleBlockType;
  title: string;
  subtitle?: string;
  order: number;
  hidden?: boolean; // Флаг скрытия блока на странице
  revealedByDefault?: boolean;
  data: LetterContent | CarBassContent | GamingContent | MemoryContent | AchievementContent | TriviaContent | QuoteContent | FinaleContent | any;
}

export interface FriendProfile {
  name: string;
  nickname: string;
  occasion: string; // например: "С Днём Рождения!"
  dateText: string;  // например: "26 октября" или "Новый уровень разблокирован"
  friendshipDuration: string; // например: "7 лет вместе через огонь и воду"
  avatarEmoji?: string;
  avatarUrl?: string;
}

export interface RetroGameControlItem {
  playerLabel: string;
  keys: string;
  actionNote?: string;
}

export interface RetroGameMemoryItem {
  id: string;
  title: string;
  tag?: string;
  story: string;
  highlightQuote?: string;
}

export interface RetroGameItem {
  id: string;
  title: string;
  subtitle: string;
  embedUrl: string;
  proxyUrl?: string;
  playersInfo: string;
  eraInfo: string;
  description: string;
  controls: RetroGameControlItem[];
  memories: RetroGameMemoryItem[];
}

export interface GreetingConfig {
  friend: FriendProfile;
  blocks: PuzzleBlock[];
  retroGames?: RetroGameItem[];
  settings: {
    theme: 'dark' | 'warm' | 'party';
    enableConfetti: boolean;
  };
}

