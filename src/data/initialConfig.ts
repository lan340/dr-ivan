import { GreetingConfig } from '../types/greeting';

/**
 * =======================================================================
 * ГЛАВНЫЙ ФАЙЛ КОНФИГУРАЦИИ ПОЗДРАВЛЕНИЯ
 * =======================================================================
 * Все тексты, имена, даты, шутки и блоки можно менять прямо здесь!
 * Любое изменение мгновенно отображается на сайте.
 * 
 * Также на самом сайте есть кнопка «Режим редактирования»,
 * которая позволяет менять всё прямо в браузере и нажать «Экспорт».
 */

export const INITIAL_GREETING_CONFIG: GreetingConfig = {
  // Информация о друге
  friend: {
    name: 'Артём',
    nickname: 'Бро / Шеф / Легенда',
    occasion: 'С Днём Рождения, Легенда!',
    dateText: 'Особый день в календаре',
    friendshipDuration: 'Много лет совместных приключений и угара',
    avatarEmoji: '⚡',
  },

  // Блоки-кусочки пазла (можно менять порядок, удалять и добавлять новые)
  blocks: [
    {
      id: 'block-letter',
      type: 'letter',
      title: 'Персональное письмо имениннику',
      subtitle: 'Нажми на сургучную печать, чтобы вскрыть конверт',
      order: 1,
      data: {
        stampText: 'TOP SECRET',
        salutation: 'Здорово, дорогой друг!',
        message: [
          'Если ты читаешь это письмо, значит, еще один год в твоей биографии прожит не зря, а мир стал немного ярче (и громче).',
          'Этот сайт собран специально для тебя по кусочкам, как пазл из наших общих историй, мемов, побед и эпичных моментов.',
          'Листай вниз, открывай секретные спойлеры и помни: лучшие приключения у нас еще впереди!'
        ],
        signature: 'Твой верный бро & банда',
        postScriptum: 'P.S. Салют в самом конце обязательно нужно запустить на полную мощность!'
      }
    },
    {
      id: 'block-car-bass',
      type: 'car_bass',
      title: 'Тачка, полный бак & ахуенные басы',
      subtitle: 'Кусочек пазла #2 • Автомобильное напутствие от души',
      order: 2,
      data: {
        carHeadline: 'Чтобы твой верный четырехколесный аппарат дарил только кайф и чистый драйв!',
        wishes: [
          'Пусть твоя машина всегда радует тебя на 100%, заводится с полуоборота в любую погоду, не знает чеков на приборке и никогда не капризничает!',
          'Пусть на каждой заправке рядом всегда будет качественный, свежий и недорогой бензин, а стрелка уровня топлива всегда радует глаз!',
          'И самое главное: чтобы сабвуфер всегда радовал ахуенными, сочными и плотными басами, от которых дрожат стекла и мурашки бегут по коже под любимые треки!'
        ],
        specs: [
          { label: 'Тачка', value: 'Всегда радует и валит', iconName: 'car' },
          { label: 'Топливо', value: 'Качественный & недорогой бенз', iconName: 'fuel' },
          { label: 'Сабвуфер', value: 'Ахуенные сочные басы', iconName: 'bass' },
        ],
        bassButtonText: 'Врубить ахуенный басс 🔊',
        bassTrackNote: 'Прокачай сабвуфер на максимум — соседи по потоку оценят!',
        imageUrl: '/assets/aistudio/____________c5af8e8e.png',
        imageCaption: 'Та самая легендарная ласточка · Golf Mk2',
        audioUrl: '/assets/aistudio/____________5d3ff621.mp3',
        trackName: 'Тёмный дух'
      }
    },
    {
      id: 'block-gaming',
      type: 'gaming',
      title: 'Игры, танки & легендарная статистика',
      subtitle: 'Кусочек пазла #3 • Официальный профиль боевого товарища',
      order: 3,
      data: {
        headline: 'Боевая летопись: Мир Танков, Tanks Blitz и библиотека Steam',
        tanki: {
          nickname: 'LeBwa',
          server: 'RU · Lesta Games [PWNZ]',
          avatarUrl:
            '/api/steam-avatar?url=https%3A%2F%2Flesta.ru%2Fclans%2Fmedia%2Fclans%2Femblems%2Fcl_618%2F409618%2Femblem_195x195.png',
          badgeUrl:
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmedalKolobanov.png',
          clanEmblemUrl:
            '/api/steam-avatar?url=https%3A%2F%2Flesta.ru%2Fclans%2Fmedia%2Fclans%2Femblems%2Fcl_618%2F409618%2Femblem_195x195.png',
          topTankImageUrl:
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR45_IS-7.png',
          tankImages: [
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR45_IS-7.png',
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FF18_Bat_Chatillon25t.png',
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FR97_Object_140.png',
            '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FGB91_Super_Conqueror.webp',
          ],
          battles: 73837,
          winrate: 66.87,
          avgDamage: 2722,
          ratingWN8: 3810,
          personalRating: 13702,
          ratingTitle: 'Фиолетовый · Уникум · Рейтинг Lesta: 13 702',
          favoriteTanks: ['ИС-7', 'Bat.-Châtillon 25 t', 'Объект 140', 'Super Conqueror'],
          medals: ['Знак «Мастер» (271/445 машин)', 'Медаль Колобанова', 'Воин', 'Основной калибр'],
          survivalRate: 41.2,
          funnyTitle: 'Главный кошмар вражеских статистов и повелитель кустов Малиновки'
        },
        blitz: {
          nickname: 'Blitz_Legend_RU',
          server: 'Tanks Blitz · Lesta RU',
          avatarUrl:
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FheroesOfRassenay.png',
          badgeUrl:
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fachievement%2Fbig%2FmarkOfMastery4.png',
          topTankImageUrl:
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FIt13_Progetto_M35_mod_46.png',
          tankImages: [
            '/api/steam-avatar?url=https%3A%2F%2Fdav-static.tanki.su%2Fptlru%2Fmt%2Fcurrent%2Fshop%2Fvehicles%2F180x135%2FIt13_Progetto_M35_mod_46.png',
            '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FT-54.webp',
            '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FS16_Kranvagn.webp',
            '/api/steam-avatar?url=https%3A%2F%2Fblitz-commander.by%2Fimg%2Ftanks%2FIS-7.webp',
          ],
          battles: 12600,
          winrate: 62.4,
          avgDamage: 2150,
          ratingWN8: 2520,
          ratingTitle: 'Бирюза · Отличный боец',
          favoriteTanks: ['Progetto 46', 'T-54', 'Kranvagn', 'ИС-7'],
          medals: ['Герой Расейняя', 'Воин', 'Основной калибр', 'Снайпер'],
          survivalRate: 44.1,
          funnyTitle: 'Умудряется тащить даже стоя в очереди за кофе с телефона'
        },
        steam: {
          steamNick: 'm0NESY',
          avatarUrl:
            '/api/steam-avatar?url=https%3A%2F%2Favatars.fastly.steamstatic.com%2F690a7a2211c8a99f086caae1bbb608826f65eed0_full.jpg',
          avatarFrameUrl:
            '/api/steam-avatar?url=https%3A%2F%2Fshared.akamai.steamstatic.com%2Fcommunity_assets%2Fimages%2Fitems%2F917950%2F82ffa8b2cce18e7239d52f27bb5ba255084596e1.png',
          sourceUrl: 'https://steamcommunity.com/id/15522194321',
          level: 91,
          totalHours: 6199,
          statusText: 'В сети · Игр в библиотеке: 35 · Значков: 116',
          favoriteGames: [
            { name: 'Counter-Strike 2', hours: 3230, genre: 'Тактический шутер' },
            { name: 'NARAKA: BLADEPOINT', hours: 2969, genre: 'Экшен' },
            { name: 'Dota 2', hours: 1450, genre: 'MOBA' },
            { name: 'Grand Theft Auto V', hours: 580, genre: 'Экшен' }
          ]
        },
        funnyQuotes: [
          '«Не пробил в борт на кумулятивах — это просто картофельная магия»',
          '«Еще одну победную катку и точно спать (сказал в 03:45)»'
        ]
      }
    },
    {
      id: 'block-achievements',
      type: 'achievement',
      title: 'Зал славы: Разблокированные достижения',
      subtitle: 'Кусочек пазла #4 • Реальные заслуги твоего персонажа',
      order: 4,
      data: {
        subtitle: 'Официально подтверждено свидетелями',
        items: [
          {
            id: 'ach-2',
            iconName: 'Shield',
            badge: 'Ранг: Мастер',
            title: 'Железобетонная надежность',
            description: 'Если пообещал приехать или помочь — разобьется в лепешку, но сделает. Человек, на которого всегда можно положиться.'
          },
          {
            id: 'ach-4',
            iconName: 'Trophy',
            badge: 'Легендарный уровень',
            title: 'Мастер выживания и оптимизма',
            description: 'Прошел через миллион задач и дедлайнов, сохранив чувство юмора и блеск в глазах.'
          }
        ]
      }
    },
    {
      id: 'block-finale',
      type: 'finale',
      title: 'Главное пожелание и Кульминация',
      subtitle: 'Финальный кусочек пазла • Собери всё воедино',
      order: 5,
      data: {
        heading: 'Пусть каждый день будет победным!',
        wishes: [
          'Желаю тебе железного здоровья, грандиозных целей и кайфа от каждого шага к ним!',
          'Пусть рядом всегда будут свои люди, финансы только умножаются, а поводов для искреннего смеха будет море.',
          'Никогда не теряй свой фирменный задор и драйв. Ты крутой друг, и мы очень рады, что ты есть!'
        ],
        callToAction: 'Запустить праздничный супер-салют! 🎆',
        authorNote: 'С любовью и уважением, твой лучший друг ❤️'
      }
    }
  ],

  retroGames: [
    {
      id: 'tank-trouble-2',
      title: 'Танки в лабиринте 4 (Tank Trouble)',
      subtitle: 'Локальный мультиплеер до 3 игроков · Классика браузерных баталий',
      embedUrl: 'https://g2.igroutka.ru/games/72/tanki_labirinte_4/tank-trouble-2/',
      proxyUrl: '/api/retro-mirror/tank-trouble-2/index.html',
      playersInfo: '1–3 игрока на одной клавиатуре',
      eraInfo: 'Золотая эра браузерных игр',
      description:
        'Легендарные дуэли танчиков в рикошетном лабиринте, где один шальной снаряд от стены может снести и соперника, и тебя самого за долю секунды до победы.',
      controls: [
        {
          playerLabel: 'Игрок 1 (Красный танк)',
          keys: '↑ ↓ ← → + M (или Пробел)',
          actionNote: 'Движение стрелками · Огонь клавишей M',
        },
        {
          playerLabel: 'Игрок 2 (Синий танк)',
          keys: 'E S D F + Q',
          actionNote: 'Движение E/S/D/F · Огонь клавишей Q',
        },
        {
          playerLabel: 'Игрок 3 / Режим с мышью',
          keys: 'Мышь + Левый клик',
          actionNote: 'Наведение курсором · Выстрел ЛКМ',
        },
      ],
      memories: [
        {
          id: 'mem-tt2-1',
          title: 'Битвы локтями за одной клавиатурой',
          tag: 'Локальный мультиплеер · Эмоции на пределе',
          story:
            'Помнишь, как мы рубились в Танки в лабиринте за одним компом, когда каждый раунд превращался в дикий азарт, крики «Да как оно срикошетило?!» и охоту за коробками с лазером и самонаводящейся ракетой?',
          highlightQuote: '«Не стреляй в упор в стену — сейчас обоих накроет осколками!»',
        },
        {
          id: 'mem-tt2-2',
          title: 'Закон бумеранга и идеальной геометрии',
          tag: 'Физика рикошетов · Золотая классика',
          story:
            'Главное правило Tank Trouble: чем дольше ты высчитываешь гениальный угол от трёх стен, тем выше шанс, что твой собственный снаряд вернётся обратно ровно тебе в корму.',
          highlightQuote: '«Давай ещё одну партию до 5 побед — и точно реванш!»',
        },
      ],
    },
    {
      id: 'superfighters',
      title: 'Superfighters — Супербойцы',
      subtitle: 'Культовый Flash-экшен (Ruffle) · Битва на 1–2 игроков за одной клавиатурой',
      embedUrl:
        'https://uploads.ungrounded.net/ruffle_wrapper/ruffleembed.html?v=1.2.4&browsermode=default&props={%22ruffle%22%3A%22%2Fruffle_wrapper%2Flib%2Fruffle.js%3F1792643000%22%2C%22public_path%22%3A%22%2Fruffle_wrapper%2Flib%2F%22%2C%22swf%22%3A%22https%3A%2F%2Fuploads.ungrounded.net%2F575000%2F575163_Superfighters.swf%3F1312207207%22%2C%22vars%22%3A{%22NewgroundsAPI_PublisherID%22%3A1%2C%22NewgroundsAPI_SandboxID%22%3A%226ae0c67aca63f%22%2C%22NewgroundsAPI_SessionID%22%3A%22%22%2C%22NewgroundsAPI_UserName%22%3A%22%26lt%3Bdeleted%26gt%3B%22%2C%22NewgroundsAPI_UserID%22%3A0%2C%22ng_username%22%3A%22%26lt%3Bdeleted%26gt%3B%22}%2C%22width%22%3A800%2C%22height%22%3A600%2C%22icon%22%3A%22https%3A%2F%2Fpicon.ngfiles.com%2F575000%2Fflash_575163_card.png%3Ff1722968853%22%2C%22warnOnUnsupportedContent%22%3Afalse%2C%22external%22%3A%22%2Fruffle_wrapper%2Fexternal%2Fruffle-external-input.js%3F1793097753%22%2C%22externalSettings%22%3A{%22endpoint%22%3A%22https%3A%2F%2Fwww.newgrounds.com%2Fportal%2Fruffle-options%2F193477%22%2C%22types%22%3A[1]}}#',
      proxyUrl: '/api/retro-mirror/superfighters/index.html',
      playersInfo: '1–2 игрока на одной клавиатуре',
      eraInfo: 'Легенда Flash (Newgrounds, 2011)',
      description:
        'Безумный пиксельный боевик в духе классических экшенов 80-х: перекаты, прыжки в слоу-мо, перестрелки из-за ящиков, взрывающиеся бочки и эпичные дуэли вдвоём за одним ПК.',
      controls: [
        {
          playerLabel: 'Игрок 1 (Стрелки)',
          keys: '← → ↑ ↓ + N (Удар) · M (Огонь)',
          actionNote: 'Гранаты: «,» (Б) · Слоу-мо / Бонус: «.» (Ю)',
        },
        {
          playerLabel: 'Игрок 2 (На одной клавиатуре)',
          keys: 'W A S D + 1 (Удар) · 2 (Огонь)',
          actionNote: 'Гранаты: 3 · Бонус: 4 (настраивается в Setup)',
        },
        {
          playerLabel: 'Тактические приёмы',
          keys: 'Разбег + Вниз = Кувырок / Прыжок в укрытие',
          actionNote: 'Если загорелся — делай перекаты по полу!',
        },
      ],
      memories: [
        {
          id: 'mem-sf-1',
          title: 'Кинематографичные прыжки и взрывающиеся бочки',
          tag: 'Экшен на двоих · Чистый адреналин',
          story:
            'В Superfighters каждый раунд длился 20 секунд, но по накалу страстей превосходил любой голливудский блокбастер: прыжок со второго этажа с пулемётом, случайная пуля в красную бочку — и полкарты разносит вдребезги.',
          highlightQuote: '«Катись по полу, ты горишь! Не беги ко мне с гранатой!»',
        },
        {
          id: 'mem-sf-2',
          title: 'Охота за базукой и слоу-мо на последнем миллиметре ХП',
          tag: 'Легенда Flash · Newgrounds 2011',
          story:
            'Самый напряжённый момент — когда у обоих закончились патроны, сверху падает ящик с гранатомётом, и начинается рукопашная битва со стульями и трубами за право первым добежать до оружия.',
          highlightQuote: '«Кто выбил пистолет с одного удара в прыжке — тот и чемпион арены!»',
        },
      ],
    },
  ],

  settings: {
    theme: 'dark',
    enableConfetti: true,
  }
};

