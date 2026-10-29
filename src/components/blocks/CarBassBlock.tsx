import React, { useState, useRef, useEffect } from 'react';
import {
  Car,
  Fuel,
  Volume2,
  Disc,
  Gauge,
  Zap,
  Sparkles,
  CheckCircle2,
  Camera,
  Upload,
  Link,
  Music,
  Pause,
  Play,
  KeyRound,
  Flame,
} from 'lucide-react';
import { CarBassContent, PuzzleBlock } from '../../types/greeting';
import { MinimalistCarArt } from '../MinimalistCarArt';
import { fireStars, fireConfetti } from '../../utils/confetti';
import { toggleBassAudio, stopBassAudio } from '../../utils/audioBass';
import {
  EngineTelemetry,
  subscribeEngineTelemetry,
  toggleCarEngine,
  startRevvingEngine,
  stopRevvingEngine,
  blipThrottle,
  stopCarEngine,
} from '../../utils/carEngineAudio';
import {
  DEFAULT_ORIGINAL_TRACK_NAME,
  DEFAULT_ORIGINAL_TRACK_URL,
  persistOriginalCarTrack,
  resolveOriginalCarTrack,
} from '../../utils/customTrackStorage';

interface CarBassBlockProps {
  block: PuzzleBlock;
  onUnlock?: () => void;
  isUnlocked?: boolean;
  onUpdateData?: (newData: any) => void;
}

export const CarBassBlock: React.FC<CarBassBlockProps> = ({
  block,
  onUnlock,
  isUnlocked,
  onUpdateData,
}) => {
  const content = block.data as CarBassContent;
  const [isBassActive, setIsBassActive] = useState(false);
  const [displayMode, setDisplayMode] = useState<'art' | 'photo'>('art');
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [isAudioInputOpen, setIsAudioInputOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState(
    content.imageUrl || '/assets/aistudio/____________c5af8e8e.png'
  );
  const [inputAudioUrl, setInputAudioUrl] = useState(
    content.audioUrl || DEFAULT_ORIGINAL_TRACK_URL
  );
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string>(
    content.audioUrl || DEFAULT_ORIGINAL_TRACK_URL
  );
  const sanitizeTrackName = (name?: string) => {
    if (!name || name === 'Тёмный дух') return DEFAULT_ORIGINAL_TRACK_NAME;
    return name;
  };

  const [resolvedTrackName, setResolvedTrackName] = useState<string>(
    sanitizeTrackName(content.trackName)
  );
  const [isOriginalSavedOnServer, setIsOriginalSavedOnServer] = useState(true);
  const [isSavingTrack, setIsSavingTrack] = useState(false);

  const [engine, setEngine] = useState<EngineTelemetry>({
    isRunning: false,
    isCranking: false,
    rpm: 0,
    isRevving: false,
    isRedline: false,
    exhaustPop: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  const photoSrc = content.imageUrl || '/assets/aistudio/____________c5af8e8e.png';

  // Подписка на телеметрию двигателя Golf Mk2
  useEffect(() => {
    const unsub = subscribeEngineTelemetry((state) => {
      setEngine(state);
    });
    return unsub;
  }, []);

  // Автоматическая синхронизация загруженной музыки с сервером как постоянного оригинального трека
  useEffect(() => {
    let cancelled = false;
    resolveOriginalCarTrack(content.audioUrl, sanitizeTrackName(content.trackName)).then((info) => {
      if (cancelled || !info) return;
      const cleanName = sanitizeTrackName(info.trackName);
      setResolvedAudioUrl(info.audioUrl);
      setResolvedTrackName(cleanName);
      setIsOriginalSavedOnServer(Boolean(info.isOriginalServerTrack));

      if (
        onUpdateData &&
        (content.audioUrl !== info.audioUrl || content.trackName !== cleanName)
      ) {
        onUpdateData({
          audioUrl: info.audioUrl,
          trackName: cleanName,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Остановка звука и мотора при демонтировании компонента
  useEffect(() => {
    return () => {
      stopBassAudio();
      stopCarEngine();
    };
  }, []);

  const activeAudioUrl = resolvedAudioUrl || content.audioUrl || DEFAULT_ORIGINAL_TRACK_URL;
  const activeTrackName = sanitizeTrackName(resolvedTrackName || content.trackName);

  const handleToggleBass = () => {
    const next = toggleBassAudio(activeAudioUrl, setIsBassActive);
    setIsBassActive(next);

    if (next) {
      fireStars(0.5, 0.5);
      fireConfetti(0.5, 0.6);
      if (onUnlock && !isUnlocked) {
        onUnlock();
      }
    }
  };

  const handleToggleEngine = () => {
    const started = toggleCarEngine();
    if (started && onUnlock && !isUnlocked) {
      onUnlock();
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateData) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          onUpdateData({ imageUrl: result });
          setDisplayMode('photo');
          fireStars(0.5, 0.5);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setIsSavingTrack(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        const saved = await persistOriginalCarTrack(result, cleanName);
        setResolvedAudioUrl(saved.audioUrl);
        setResolvedTrackName(saved.trackName);
        setIsOriginalSavedOnServer(Boolean(saved.isOriginalServerTrack));
        setIsSavingTrack(false);

        if (onUpdateData) {
          onUpdateData({
            audioUrl: saved.audioUrl,
            trackName: saved.trackName,
          });
        }

        fireStars(0.5, 0.5);
        stopBassAudio();
        setIsBassActive(false);
      } else {
        setIsSavingTrack(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhotoUrl = () => {
    if (onUpdateData) {
      onUpdateData({ imageUrl: inputUrl.trim() });
      setIsUrlInputOpen(false);
      setDisplayMode('photo');
      fireStars(0.5, 0.5);
    }
  };

  const handleSaveAudioUrl = () => {
    const trimmed = inputAudioUrl.trim();
    if (!trimmed) return;
    setResolvedAudioUrl(trimmed);
    setResolvedTrackName('Оригинальный трек');
    if (onUpdateData) {
      onUpdateData({
        audioUrl: trimmed,
        trackName: 'Оригинальный трек',
      });
    }
    setIsAudioInputOpen(false);
    stopBassAudio();
    setIsBassActive(false);
    fireStars(0.5, 0.5);
  };

  // Процент заполнения шкалы тахометра (до 7000 об/мин)
  const rpmPercent = Math.min(100, Math.max(0, (engine.rpm / 7000) * 100));

  return (
    <div id={block.id} className="relative w-full max-w-4xl mx-auto my-14 scroll-mt-24">
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-stone-900 to-amber-950/40 border rounded-3xl p-6 sm:p-10 shadow-2xl transition-all duration-500 ${
          isBassActive || engine.isRevving
            ? 'border-amber-400 shadow-amber-500/20 ring-1 ring-amber-400/50'
            : engine.isRunning
            ? 'border-emerald-500/40 shadow-emerald-500/10'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {/* Скрытый инпут для фото */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Скрытый инпут для аудио (MP3/WAV) */}
        <input
          type="file"
          ref={audioFileInputRef}
          onChange={handleAudioFileChange}
          accept="audio/*"
          className="hidden"
        />

        {/* Фоновые пульсирующие волны баса */}
        <div
          className={`absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
            isBassActive ? 'bg-amber-500/30 scale-125 animate-pulse' : 'bg-amber-500/10'
          }`}
        />

        {/* Верхняя плашка блока */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl border transition-transform duration-300 ${
                isBassActive
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 scale-110'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              <Car className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block">
                {block.subtitle || 'Автомобильный драйв & саунд'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{block.title}</h2>
            </div>
          </div>

          {/* Переключатель: Минималистичный арт / Реальное фото */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setDisplayMode('art')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                displayMode === 'art'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Минимализм</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('photo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                displayMode === 'photo'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Фото тачки</span>
            </button>
          </div>
        </div>

        {/* Визуальная сцена: Минималистичный векторный арт ИЛИ реальная фотография */}
        <div className="mb-6">
          {displayMode === 'art' ? (
            <MinimalistCarArt isBassActive={isBassActive} />
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-slate-950 shadow-2xl group">
              <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-slate-950">
                <img
                  src={photoSrc}
                  alt={content.imageCaption || 'Любимая тачка именинника'}
                  className={`w-full h-full object-cover object-center transition-transform duration-700 ${
                    isBassActive ? 'scale-105' : 'group-hover:scale-102'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Кнопки быстрой замены фото */}
                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-950/85 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Загрузить фото</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
                    className="p-1.5 bg-slate-950/85 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/80 backdrop-blur-md transition-all"
                    title="Вставить ссылку на картинку"
                  >
                    <Link className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Подпись на фото */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-950/85 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    {content.imageCaption || 'Легендарный аппарат именинника'}
                  </span>
                </div>
              </div>

              {isUrlInputOpen && (
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Вставьте прямую ссылку на фото..."
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleSavePhotoUrl}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ПУЛЬТ ЗАПУСКА ДВИГАТЕЛЯ И ПЕДАЛЬ ГАЗА («ЗАВЕСТИ МОТОР» + «ПОГАЗОВАТЬ») */}
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-slate-950/85 border border-slate-800/90 shadow-inner">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Левая часть: Статус мотора и тахометр */}
            <div className="flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      engine.isRunning
                        ? engine.isRedline
                          ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping'
                          : 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                        : engine.isCranking
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {engine.isCranking
                      ? 'Стартер крутит маховик (1.8 EA827)...'
                      : engine.isRunning
                      ? engine.isRedline
                        ? 'ОТСЕЧКА! Мотор ревет на пределе! 🔥'
                        : engine.isRevving
                        ? 'Дроссель открыт — сочный рык Golf Mk2!'
                        : 'Двигатель запущен · Ровный басистый холостой ход'
                      : 'Двигатель Golf Mk2 заглушен · Поверни ключ!'}
                  </span>
                </div>

                {/* Показания тахометра */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  {engine.exhaustPop && (
                    <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/50 text-orange-300 font-bold animate-bounce">
                      ПРОСТРЕЛ! 💥
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-md border font-bold ${
                      engine.isRedline
                        ? 'bg-red-500/20 border-red-500/60 text-red-300'
                        : engine.isRunning
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {engine.rpm} ОБ/МИН
                  </span>
                </div>
              </div>

              {/* Шкала тахометра 0 — 7000 RPM */}
              <div className="relative h-3 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    engine.isRedline
                      ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500'
                      : engine.isRevving
                      ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  }`}
                  style={{ width: `${rpmPercent}%` }}
                />
                {/* Разметка красной зоны (от 6000 до 7000 RPM) */}
                <div className="absolute top-0 bottom-0 right-0 w-[16%] bg-red-500/15 border-l border-red-500/40 pointer-events-none" />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
                <span>0</span>
                <span>1000</span>
                <span>2000</span>
                <span>3000</span>
                <span>4000</span>
                <span>5000</span>
                <span className="text-red-400 font-bold">6000</span>
                <span className="text-red-500 font-bold">7000 RPM</span>
              </div>
            </div>

            {/* Правая часть: Кнопки «Завести двигатель» и «Погазовать» */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleEngine}
                className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all shadow-lg active:scale-95 ${
                  engine.isRunning
                    ? 'bg-slate-800 hover:bg-red-950/60 border-emerald-500/50 hover:border-red-500/50 text-emerald-300 hover:text-red-300'
                    : engine.isCranking
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200 animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {engine.isCranking
                    ? 'Крутим стартер...'
                    : engine.isRunning
                    ? 'Заглушить двигатель'
                    : 'Завести двигатель 🔑'}
                </span>
              </button>

              <button
                type="button"
                onMouseDown={startRevvingEngine}
                onMouseUp={stopRevvingEngine}
                onMouseLeave={stopRevvingEngine}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startRevvingEngine();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopRevvingEngine();
                }}
                onClick={blipThrottle}
                className={`px-6 py-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all shadow-lg select-none active:scale-95 ${
                  engine.isRevving
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-300 shadow-orange-500/35 scale-105'
                    : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border-amber-500/50'
                }`}
                title="Нажми резко для перегазовки или удерживай педаль газа до отсечки!"
              >
                <Flame
                  className={`w-4 h-4 ${
                    engine.isRevving ? 'text-white animate-bounce' : 'text-orange-400'
                  }`}
                />
                <span>{engine.isRevving ? 'Газ в пол! 🔥' : 'Погазовать 💨'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Главный заголовок пожелания */}
        <div className="mb-6 p-5 rounded-2xl bg-slate-950/70 border border-amber-500/20 flex items-start gap-4">
          <Zap className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
          <p className="text-lg sm:text-xl font-bold text-amber-100 leading-snug">
            {content.carHeadline}
          </p>
        </div>

        {/* 3 главных автомобильных пожелания */}
        <div className="space-y-4 mb-8">
          {content.wishes.map((wish, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0 mt-0.5">
                0{idx + 1}
              </div>
              <p className="text-slate-200 text-base sm:text-lg leading-relaxed">{wish}</p>
            </div>
          ))}
        </div>

        {/* Карточки характеристик */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {content.specs.map((spec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs uppercase tracking-wider mb-2">
                <span>{spec.label}</span>
                {spec.iconName === 'fuel' && <Fuel className="w-4 h-4 text-emerald-400" />}
                {spec.iconName === 'bass' && <Volume2 className="w-4 h-4 text-amber-400" />}
                {spec.iconName === 'car' && <Gauge className="w-4 h-4 text-sky-400" />}
              </div>
              <p className="text-sm sm:text-base font-bold text-white">{spec.value}</p>
            </div>
          ))}
        </div>

        {/* ИНТЕРАКТИВНЫЙ ПУЛЬТ САБВУФЕРА С ОРИГИНАЛЬНЫМ ТРЕКОМ */}
        <div className="pt-6 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl border transition-all duration-300 ${
                  isBassActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 scale-110 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <Disc
                  className={`w-7 h-7 ${isBassActive ? 'animate-spin' : ''}`}
                  style={{ animationDuration: '2.5s' }}
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>
                    {isBassActive
                      ? 'Саундсистема валит на полную! 🔥'
                      : 'Сабвуфер готов к прокачке'}
                  </span>
                </p>
                <p className="text-xs text-amber-400/90 font-medium flex items-center flex-wrap gap-1.5 mt-0.5">
                  <Music className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Оригинальный трек:{' '}
                    <strong className="text-amber-200">
                      {isSavingTrack
                        ? 'Сохранение оригинала...'
                        : activeTrackName || 'Фирменный Sub-Bass Groove'}
                    </strong>
                  </span>
                  {(isOriginalSavedOnServer || activeAudioUrl) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Оригинал закреплен ✓
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Главная кнопка воспроизведения */}
            <button
              type="button"
              onClick={handleToggleBass}
              className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                isBassActive
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/30'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/25 hover:scale-105 active:scale-95'
              }`}
            >
              {isBassActive ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Остановить басы</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{content.bassButtonText || 'Врубить ахуенный басс 🔊'}</span>
                </>
              )}
            </button>
          </div>

          {/* Панель закрепления оригинального трека */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400">
              {isBassActive
                ? '⚡ Эквалайзер на арте синхронизирован с частотами оригинального трека'
                : 'Загруженный трек автоматически становится постоянным оригиналом на сайте'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                title="Загрузить MP3 и закрепить его как постоянный оригинал на сайте"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeAudioUrl ? 'Обновить оригинал (MP3)' : 'Загрузить оригинал (MP3)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAudioInputOpen(!isAudioInputOpen)}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                title="Вставить прямую ссылку на оригинальный аудиофайл"
              >
                <Link className="w-3.5 h-3.5 text-sky-400" />
                <span>Ссылка</span>
              </button>
            </div>
          </div>

          {/* Поле для ввода URL аудио */}
          {isAudioInputOpen && (
            <div className="pt-2 flex items-center gap-2 animate-in fade-in duration-200">
              <input
                type="url"
                value={inputAudioUrl}
                onChange={(e) => setInputAudioUrl(e.target.value)}
                placeholder="https://... прямая ссылка на mp3 файл"
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleSaveAudioUrl}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                Закрепить
              </button>
            </div>
          )}

          {/* Сообщение об активности басовой волны */}
          {isBassActive && (
            <div className="pt-1 flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Звук включен! Эквалайзер качает в такт оригинальному треку!</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
