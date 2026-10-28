import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Zap, Power, KeyRound, Flame, Gauge } from 'lucide-react';
import { getFrequencyData, getAudioContext } from '../utils/audioBass';
import {
  EngineTelemetry,
  subscribeEngineTelemetry,
  toggleCarEngine,
  startRevvingEngine,
  stopRevvingEngine,
  blipThrottle,
} from '../utils/carEngineAudio';

interface MinimalistCarArtProps {
  isBassActive?: boolean;
}

type HeadlightPhase = 'on' | 'turning-on' | 'off' | 'turning-off';

/**
 * Синтезирует реалистичный щелчок автомобильного реле / тумблера фар через Web Audio API
 */
function playRelaySound(turningOn: boolean, isHighBeam = false) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 1. Механический щелчок реле (короткий импульс)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    if (isHighBeam) {
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.025);
    } else if (turningOn) {
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.032);
    } else {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.028);
    }

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.036);

    // 2. Вторичный микро-щелчок контакта реле
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(turningOn ? 1200 : 680, now + 0.018);
    osc2.frequency.exponentialRampToValueAtTime(220, now + 0.045);

    gain2.gain.setValueAtTime(0.12, now + 0.018);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.018);
    osc2.stop(now + 0.05);
  } catch {
    // Игнорируем ошибки автоплей-политики браузера
  }
}

export const MinimalistCarArt: React.FC<MinimalistCarArtProps> = ({ isBassActive = false }) => {
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [phase, setPhase] = useState<HeadlightPhase>('on');
  const [ignitionFlicker, setIgnitionFlicker] = useState(false);
  const [highBeamFlash, setHighBeamFlash] = useState(false);
  const [freqBars, setFreqBars] = useState<number[]>(new Array(16).fill(0));
  const [engine, setEngine] = useState<EngineTelemetry>({
    isRunning: false,
    isCranking: false,
    rpm: 0,
    isRevving: false,
    isRedline: false,
    exhaustPop: false,
  });

  const phaseTimerRef = useRef<number | null>(null);
  const flickerTimerRef = useRef<number | null>(null);
  const flashTimersRef = useRef<number[]>([]);

  // Подписка на телеметрию двигателя (обороты, стартер, перегазовка, отстрелы)
  useEffect(() => {
    const unsub = subscribeEngineTelemetry((state) => {
      setEngine(state);
    });
    return unsub;
  }, []);

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) window.clearTimeout(phaseTimerRef.current);
      if (flickerTimerRef.current) window.clearTimeout(flickerTimerRef.current);
      flashTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Переключение ближнего света с реалистичной анимацией розжига и остывания нити накаливания
  const handleToggleHeadlights = useCallback(() => {
    if (phaseTimerRef.current) window.clearTimeout(phaseTimerRef.current);
    if (flickerTimerRef.current) window.clearTimeout(flickerTimerRef.current);

    if (!headlightsOn) {
      // ВКЛЮЧЕНИЕ ФАР: пусковая вспышка -> легкая просадка напряжения -> выход на полную мощность
      playRelaySound(true);
      setHeadlightsOn(true);
      setPhase('turning-on');
      setIgnitionFlicker(true);

      // Кратковременное притухание от скачка тока при холодном старте галогенок
      flickerTimerRef.current = window.setTimeout(() => {
        setIgnitionFlicker(false);
      }, 140);

      phaseTimerRef.current = window.setTimeout(() => {
        setPhase('on');
      }, 650);
    } else {
      // ВЫКЛЮЧЕНИЕ ФАР: отсечка луча -> тепловое оранжево-красное затухание спирали накаливания
      playRelaySound(false);
      setHeadlightsOn(false);
      setIgnitionFlicker(false);
      setPhase('turning-off');

      phaseTimerRef.current = window.setTimeout(() => {
        setPhase('off');
      }, 750);
    }
  }, [headlightsOn]);

  // Двойное моргание дальним светом ("Моргнуть дальним")
  const handleFlashHighBeam = useCallback(() => {
    flashTimersRef.current.forEach((id) => window.clearTimeout(id));
    flashTimersRef.current = [];

    playRelaySound(true, true);
    setHighBeamFlash(true);

    const t1 = window.setTimeout(() => {
      setHighBeamFlash(false);
      playRelaySound(false, true);
    }, 150);

    const t2 = window.setTimeout(() => {
      setHighBeamFlash(true);
      playRelaySound(true, true);
    }, 270);

    const t3 = window.setTimeout(() => {
      setHighBeamFlash(false);
      playRelaySound(false, true);
    }, 440);

    flashTimersRef.current = [t1, t2, t3];
  }, []);

  // Анимация эквалайзера в такт играющей музыке
  useEffect(() => {
    if (!isBassActive) {
      setFreqBars(new Array(16).fill(0));
      return;
    }

    let animId: number;
    const updateFrequencies = () => {
      const data = getFrequencyData(16);
      setFreqBars(data);
      animId = requestAnimationFrame(updateFrequencies);
    };

    animId = requestAnimationFrame(updateFrequencies);
    return () => cancelAnimationFrame(animId);
  }, [isBassActive]);

  // Вычисляем коэффициенты яркости и масштаба для плавных переходов
  const isLit = headlightsOn || highBeamFlash;
  const isCooling = phase === 'turning-off' && !highBeamFlash;
  const isIgniting = phase === 'turning-on';

  // При вращении стартера напряжение бортсети слегка проседает (фары притухают)
  const starterVoltageDip = engine.isCranking ? 0.62 : 1;

  // Интенсивность основного света (с учетом стартового мерцания, просадки стартера и дальнего света)
  const mainGlowOpacity =
    (highBeamFlash
      ? 1
      : headlightsOn
      ? ignitionFlicker
        ? 0.55
        : 1
      : 0) * starterVoltageDip;

  const haloScale =
    (highBeamFlash
      ? 1.38
      : headlightsOn
      ? ignitionFlicker
        ? 0.82
        : 1
      : 0.35) * (engine.isCranking ? 0.88 : 1);

  // Пульсация света фар в такт мощному басу
  const bassPulse = isBassActive && freqBars[1] > 65 ? 1.08 : 1;

  // Живая вибрация кузова и наклон от крутящего момента при перегазовке
  const rpmRatio = Math.min(1, Math.max(0, (engine.rpm - 800) / 6000));
  const jitterSeed = (engine.rpm % 7) - 3;
  const bodyVibY = engine.isCranking
    ? (Date.now() % 2 === 0 ? 1.4 : -1.4)
    : engine.isRunning
    ? jitterSeed * (0.18 + rpmRatio * 0.45)
    : 0;
  const bodyTorqueDeg = engine.isRevving
    ? -0.45 - rpmRatio * 0.85
    : engine.isCranking
    ? 0.35
    : 0;

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a1324] to-slate-950 border border-amber-500/30 flex items-center justify-center shadow-2xl select-none group">
      
      {/* Фоновое ночное свечение вокруг машины, реагирующее на фары и бас */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-2/3 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          highBeamFlash
            ? 'bg-amber-300/35 scale-125'
            : isBassActive
            ? 'bg-amber-500/25 scale-110'
            : headlightsOn
            ? 'bg-amber-500/15 scale-105'
            : 'bg-[#497aa3]/10 scale-95'
        }`}
      />

      {/* ЖИВОЙ ЭКВАЛАЙЗЕР — появляется ТОЛЬКО тогда, когда включена музыка */}
      {isBassActive && (
        <div className="absolute inset-x-0 bottom-4 flex items-end justify-between px-6 sm:px-14 h-36 opacity-35 pointer-events-none transition-opacity duration-500 animate-in fade-in">
          {freqBars.map((val, i) => (
            <div
              key={i}
              className="w-2 sm:w-2.5 bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-75 shadow-lg shadow-amber-500/20"
              style={{
                height: `${Math.max(6, val)}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Векторная иллюстрация классического хэтчбека (Golf Mk2) */}
      <svg
        viewBox="0 0 800 440"
        className={`w-full h-full max-h-full object-contain transition-transform duration-300 ${
          isBassActive ? 'scale-[1.02]' : ''
        }`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Кузов: точный глянцевый сине-стальной оттенок с фото (VW Steel / Medium Blue) */}
          <linearGradient id="bodyPaint" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6699c2" />
            <stop offset="45%" stopColor="#4879a1" />
            <stop offset="100%" stopColor="#2b5273" />
          </linearGradient>

          {/* Капот с глубоким глянцевым синим отливом как на фото */}
          <linearGradient id="hoodPaint" x1="0%" y1="0%" x2="100%" y2="18%">
            <stop offset="0%" stopColor="#386487" />
            <stop offset="25%" stopColor="#588ab3" />
            <stop offset="48%" stopColor="#7eb0d6" />
            <stop offset="68%" stopColor="#5385ad" />
            <stop offset="100%" stopColor="#325b7d" />
          </linearGradient>

          {/* Передний фартук под бампером */}
          <linearGradient id="valancePaint" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#284c6b" />
            <stop offset="50%" stopColor="#46769e" />
            <stop offset="100%" stopColor="#284c6b" />
          </linearGradient>

          {/* Лобовое стекло */}
          <linearGradient id="windshieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="55%" stopColor="#1e2f44" />
            <stop offset="100%" stopColor="#090e17" />
          </linearGradient>

          {/* Бампер и пластиковый обвес */}
          <linearGradient id="bumperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e2430" />
            <stop offset="45%" stopColor="#10141c" />
            <stop offset="100%" stopColor="#06080c" />
          </linearGradient>

          {/* Свечение основных галогеновых фар (включены) */}
          <radialGradient id="mainLampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="22%" stopColor="#fffbeb" stopOpacity="1" />
            <stop offset="52%" stopColor="#fde047" stopOpacity="0.92" />
            <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Тепловое послесвечение остывающей галогеновой спирали при выключении */}
          <radialGradient id="filamentAfterglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="65%" stopColor="#dc2626" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>

          {/* Стеклянная рифленая линза (выключенные фары) */}
          <radialGradient id="lampOffGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="55%" stopColor="#334155" />
            <stop offset="85%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          {/* Объемный луч света левой фары на дорогу */}
          <linearGradient id="leftBeamGrad" x1="50%" y1="0%" x2="35%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.42" />
            <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Объемный луч света правой фары на дорогу */}
          <linearGradient id="rightBeamGrad" x1="50%" y1="0%" x2="65%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.42" />
            <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* ClipPath для фирменных крышек Hella */}
          <clipPath id="hellaClipLeft">
            <circle cx="314" cy="266" r="18.5" />
          </clipPath>
          <clipPath id="hellaClipRight">
            <circle cx="486" cy="266" r="18.5" />
          </clipPath>
        </defs>

        {/* Глубокая тень под днищем автомобиля */}
        <ellipse cx="400" cy="382" rx="255" ry="18" fill="#020617" />
        <ellipse cx="400" cy="380" rx="220" ry="11" fill="#000000" />

        {/* ВЫХЛОПНОЙ ДЫМОК И ОТСТРЕЛ ГЛУШИТЕЛЯ (слева сзади под бампером) */}
        {(engine.isRunning || engine.isCranking) && (
          <g className="pointer-events-none">
            {/* Вспышка прострела выхлопа на сбросе газа / отсечке */}
            <ellipse
              cx="195"
              cy="376"
              rx={engine.exhaustPop ? 42 : 16}
              ry={engine.exhaustPop ? 14 : 6}
              fill="#f97316"
              style={{
                opacity: engine.exhaustPop ? 0.78 : 0,
                transition: 'opacity 70ms ease-out, rx 80ms ease-out',
              }}
            />
            {/* Клубы теплого выхлопа */}
            <circle
              cx={176 - rpmRatio * 18}
              cy={372 - rpmRatio * 6}
              r={10 + rpmRatio * 12}
              fill="#94a3b8"
              opacity={0.14 + rpmRatio * 0.18}
            />
            <circle
              cx={154 - rpmRatio * 28}
              cy={364 - rpmRatio * 10}
              r={15 + rpmRatio * 16}
              fill="#cbd5e1"
              opacity={0.09 + rpmRatio * 0.14}
            />
          </g>
        )}

        {/* РАССЕЯННОЕ ОСВЕЩЕНИЕ ДОРОГИ ОТ ФАР (плавный розжиг и затухание) */}
        <g
          style={{
            opacity:
              (highBeamFlash ? 1 : headlightsOn ? (ignitionFlicker ? 0.45 : 0.95) : 0) *
              starterVoltageDip,
            transform: `scale(${highBeamFlash ? 1.12 : headlightsOn ? 1 : 0.78})`,
            transformOrigin: '400px 385px',
            transition: headlightsOn
              ? 'opacity 480ms cubic-bezier(0.22, 1, 0.36, 1), transform 520ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'opacity 320ms ease-out, transform 380ms ease-out',
          }}
        >
          <ellipse cx="236" cy="390" rx="125" ry="28" fill="#fbbf24" opacity="0.18" />
          <ellipse cx="564" cy="390" rx="125" ry="28" fill="#fbbf24" opacity="0.18" />
          <ellipse cx="400" cy="396" rx="260" ry="20" fill="#f59e0b" opacity="0.12" />
          {/* Яркие блики на асфальте прямо под ПТФ и фарами */}
          <ellipse cx="246" cy="386" rx="68" ry="14" fill="#fef08a" opacity="0.22" />
          <ellipse cx="554" cy="386" rx="68" ry="14" fill="#fef08a" opacity="0.22" />
        </g>

        {/* ПЕРЕДНИЕ КОЛЕСА (Вид спереди — широкие шины с серебристой полкой диска) */}
        {/* Левое колесо */}
        <g>
          <rect x="184" y="295" width="60" height="86" rx="9" fill="#0b0f17" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="199" y1="305" x2="199" y2="376" stroke="#161e2e" strokeWidth="2.5" />
          <line x1="214" y1="305" x2="214" y2="376" stroke="#161e2e" strokeWidth="2.5" />
          <line x1="229" y1="305" x2="229" y2="376" stroke="#161e2e" strokeWidth="2.5" />
          <path d="M 186,310 L 186,367" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
        </g>

        {/* Правое колесо */}
        <g>
          <rect x="556" y="295" width="60" height="86" rx="9" fill="#0b0f17" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="571" y1="305" x2="571" y2="376" stroke="#161e2e" strokeWidth="2.5" />
          <line x1="586" y1="305" x2="586" y2="376" stroke="#161e2e" strokeWidth="2.5" />
          <line x1="601" y1="305" x2="601" y2="376" stroke="#161e2e" strokeWidth="2.5" />
          <path d="M 614,310 L 614,367" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
        </g>

        {/* КУЗОВ НА ПОДВЕСКЕ (вибрирует на холостых и качается от крутящего момента при перегазовке) */}
        <g
          style={{
            transform: `translateY(${bodyVibY}px) rotate(${bodyTorqueDeg}deg)`,
            transformOrigin: '400px 320px',
            transition: engine.isRunning ? 'transform 55ms linear' : 'transform 250ms ease-out',
          }}
        >
        {/* ВЕРХНЯЯ ЧАСТЬ КУЗОВА (Крыша и стойки) */}
        <path
          d="M 236,184 L 274,98 Q 400,88 526,98 L 564,184 Z"
          fill="url(#bodyPaint)"
          stroke="#5c8eb8"
          strokeWidth="1.5"
        />

        {/* Боковые зеркала заднего вида */}
        <path d="M 238,174 L 204,168 L 200,183 L 234,185 Z" fill="#111621" stroke="#334155" strokeWidth="1.2" />
        <path d="M 562,174 L 596,168 L 600,183 L 566,185 Z" fill="#111621" stroke="#334155" strokeWidth="1.2" />

        {/* Проем лобового стекла с уплотнителем */}
        <path
          d="M 252,180 L 284,107 Q 400,99 516,107 L 548,180 Z"
          fill="url(#windshieldGrad)"
          stroke="#0f172a"
          strokeWidth="3.5"
        />

        {/* Силуэты сидений и зеркала заднего вида в салоне */}
        <rect x="312" y="138" width="42" height="32" rx="8" fill="#131c2b" />
        <rect x="446" y="138" width="42" height="32" rx="8" fill="#131c2b" />
        <rect x="382" y="114" width="36" height="9" rx="3" fill="#1e293b" />
        <line x1="400" y1="104" x2="400" y2="114" stroke="#1e293b" strokeWidth="3" />

        {/* Мягкая подсветка приборной панели в салоне, когда включены фары */}
        <ellipse
          cx="458"
          cy="174"
          rx="26"
          ry="5"
          fill="#10b981"
          style={{
            opacity: isLit ? 0.22 : 0,
            transition: 'opacity 500ms ease-in-out',
          }}
        />

        {/* Блики на лобовом стекле */}
        <polygon points="292,108 335,106 292,178 260,178" fill="#93c5fd" opacity="0.1" />
        <polygon points="348,106 364,106 322,178 306,178" fill="#ffffff" opacity="0.06" />

        {/* Дворники стеклоочистителя */}
        <path d="M 275,180 Q 335,172 385,179" stroke="#090d14" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 395,180 Q 455,172 515,179" stroke="#090d14" strokeWidth="3.5" strokeLinecap="round" />

        {/* КАПОТ И ПЕРЕДНИЕ КРЫЛЬЯ */}
        <path
          d="M 236,182 L 564,182 L 604,234 L 196,234 Z"
          fill="url(#hoodPaint)"
          stroke="#5b8db5"
          strokeWidth="1.5"
        />

        {/* Глянцевый блик на капоте */}
        <polygon points="270,184 375,184 350,232 238,232" fill="#a5d0f2" opacity="0.16" />

        {/* Штампованные линии капота Golf Mk2 */}
        <line x1="258" y1="183" x2="232" y2="233" stroke="#264966" strokeWidth="2" opacity="0.75" />
        <line x1="542" y1="183" x2="568" y2="233" stroke="#264966" strokeWidth="2" opacity="0.75" />
        <line x1="261" y1="183" x2="235" y2="233" stroke="#93c5fd" strokeWidth="1" opacity="0.4" />
        <line x1="539" y1="183" x2="565" y2="233" stroke="#93c5fd" strokeWidth="1" opacity="0.4" />

        {/* Боковые щеки передних крыльев вокруг решетки */}
        <path d="M 196,234 L 214,234 L 214,296 L 184,296 L 188,252 Z" fill="url(#bodyPaint)" />
        <path d="M 604,234 L 586,234 L 586,296 L 616,296 L 612,252 Z" fill="url(#bodyPaint)" />

        {/* Черные матовые расширители колесных арок */}
        <path d="M 183,298 Q 184,264 196,244" stroke="#0d111a" strokeWidth="8.5" strokeLinecap="round" />
        <path d="M 617,298 Q 616,264 604,244" stroke="#0d111a" strokeWidth="8.5" strokeLinecap="round" />

        {/* ЧЕРНАЯ РЕШЕТКА РАДИАТОРА */}
        <rect x="210" y="234" width="380" height="60" rx="5" fill="#080b11" stroke="#1e293b" strokeWidth="2" />

        {/* Горизонтальные ламели решетки */}
        <line x1="214" y1="245" x2="586" y2="245" stroke="#161f2e" strokeWidth="2.5" />
        <line x1="214" y1="255" x2="586" y2="255" stroke="#161f2e" strokeWidth="2.5" />
        <line x1="214" y1="265" x2="586" y2="265" stroke="#161f2e" strokeWidth="2.5" />
        <line x1="214" y1="275" x2="586" y2="275" stroke="#161f2e" strokeWidth="2.5" />
        <line x1="214" y1="285" x2="586" y2="285" stroke="#161f2e" strokeWidth="2.5" />

        {/* Ресничка под решеткой радиатора в цвет кузова */}
        <rect x="206" y="293" width="388" height="7" rx="2" fill="url(#bodyPaint)" />

        {/* МАССИВНЫЙ ЧЕРНЫЙ БАМПЕР (Без номера) */}
        <rect x="176" y="299" width="448" height="40" rx="8" fill="url(#bumperGrad)" stroke="#1e293b" strokeWidth="1.5" />
        <line
          x1="186"
          y1="304"
          x2="614"
          y2="304"
          stroke={isLit ? '#fbbf24' : '#334155'}
          strokeWidth="1.5"
          style={{
            opacity: isLit ? 0.55 : 0.7,
            transition: 'stroke 400ms ease, opacity 400ms ease',
          }}
        />
        <rect x="305" y="311" width="190" height="16" rx="3" fill="#070a0f" stroke="#171e2b" strokeWidth="1" />

        {/* Нижний фартук кузова и спортивная губа */}
        <path
          d="M 194,339 L 606,339 L 596,356 L 204,356 Z"
          fill="url(#valancePaint)"
        />
        <path
          d="M 200,352 L 600,352 L 590,368 L 210,368 Z"
          fill="#070a0f"
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* ПТФ В НИЖНЕЙ ЧАСТИ БАМПЕРА (с плавным розжигом и послесвечением) */}
        {/* Левая ПТФ */}
        <g
          onClick={handleToggleHeadlights}
          className="cursor-pointer"
        >
          <rect x="234" y="340" width="42" height="12" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          {/* Базовое темное стекло ПТФ */}
          <rect x="236" y="342" width="38" height="8" rx="1" fill="#334155" opacity="0.5" />
          {/* Оранжевое послесвечение спирали при выключении */}
          <rect
            x="238"
            y="343"
            width="34"
            height="6"
            rx="1"
            fill="#f97316"
            style={{
              opacity: isCooling ? 0.55 : 0,
              transition: isCooling ? 'opacity 650ms ease-out' : 'opacity 100ms linear',
            }}
          />
          {/* Яркий свет ПТФ */}
          <rect
            x="236"
            y="342"
            width="38"
            height="8"
            rx="1"
            fill="#fef9c3"
            style={{
              opacity: isLit ? (ignitionFlicker ? 0.5 : 0.95) : 0,
              transition: isLit ? 'opacity 320ms ease-out' : 'opacity 220ms ease-in',
            }}
          />
          {/* Ореол вокруг левой ПТФ */}
          <ellipse
            cx="255"
            cy="346"
            rx="28"
            ry="10"
            fill="url(#mainLampGlow)"
            style={{
              opacity: isLit ? 0.45 : 0,
              transform: `scale(${isLit ? 1 : 0.5})`,
              transformOrigin: '255px 346px',
              transition: 'opacity 380ms ease, transform 380ms ease',
            }}
          />
        </g>

        {/* Правая ПТФ */}
        <g
          onClick={handleToggleHeadlights}
          className="cursor-pointer"
        >
          <rect x="524" y="340" width="42" height="12" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          {/* Базовое темное стекло ПТФ */}
          <rect x="526" y="342" width="38" height="8" rx="1" fill="#334155" opacity="0.5" />
          {/* Оранжевое послесвечение спирали при выключении */}
          <rect
            x="528"
            y="343"
            width="34"
            height="6"
            rx="1"
            fill="#f97316"
            style={{
              opacity: isCooling ? 0.55 : 0,
              transition: isCooling ? 'opacity 650ms ease-out' : 'opacity 100ms linear',
            }}
          />
          {/* Яркий свет ПТФ */}
          <rect
            x="526"
            y="342"
            width="38"
            height="8"
            rx="1"
            fill="#fef9c3"
            style={{
              opacity: isLit ? (ignitionFlicker ? 0.5 : 0.95) : 0,
              transition: isLit ? 'opacity 320ms ease-out' : 'opacity 220ms ease-in',
            }}
          />
          {/* Ореол вокруг правой ПТФ */}
          <ellipse
            cx="545"
            cy="346"
            rx="28"
            ry="10"
            fill="url(#mainLampGlow)"
            style={{
              opacity: isLit ? 0.45 : 0,
              transform: `scale(${isLit ? 1 : 0.5})`,
              transformOrigin: '545px 346px',
              transition: 'opacity 380ms ease, transform 380ms ease',
            }}
          />
        </g>

        {/* ОБЪЕМНЫЕ КОНУСЫ СВЕТА ОТ ОСНОВНЫХ ФАР (Volumetric Light Beams) */}
        <g
          className="pointer-events-none"
          style={{
            opacity: highBeamFlash ? 0.95 : headlightsOn ? (ignitionFlicker ? 0.35 : 0.75) : 0,
            transform: `scaleY(${highBeamFlash ? 1.08 : headlightsOn ? 1 : 0.3})`,
            transformOrigin: '400px 264px',
            transition: headlightsOn
              ? 'opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 460ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'opacity 260ms ease-in, transform 300ms ease-in',
          }}
        >
          {/* Левый световой конус */}
          <polygon points="228,272 264,272 325,415 110,415" fill="url(#leftBeamGrad)" />
          {/* Правый световой конус */}
          <polygon points="536,272 572,272 690,415 475,415" fill="url(#rightBeamGrad)" />
        </g>

        {/* ВНЕШНИЕ ОСНОВНЫЕ ФАРЫ (Многослойная анимация включения и затухания) */}
        {/* ==================== ЛЕВАЯ ОСНОВНАЯ ФАРА ==================== */}
        <g
          onClick={handleToggleHeadlights}
          className="cursor-pointer"
        >
          <title>{headlightsOn ? 'Нажмите, чтобы выключить фары' : 'Нажмите, чтобы включить фары'}</title>
          {/* Корпус и хромированный ободок фары */}
          <circle cx="246" cy="264" r="25" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />

          {/* Слой 1: Выключенная рифленая стеклянная линза (всегда в DOM) */}
          <circle cx="246" cy="264" r="21" fill="url(#lampOffGrad)" />
          {/* Рифление классического рассеивателя фары Golf Mk2 */}
          <line x1="234" y1="246" x2="234" y2="282" stroke="#94a3b8" strokeWidth="0.6" opacity="0.25" />
          <line x1="242" y1="244" x2="242" y2="284" stroke="#94a3b8" strokeWidth="0.6" opacity="0.25" />
          <line x1="250" y1="244" x2="250" y2="284" stroke="#94a3b8" strokeWidth="0.6" opacity="0.25" />
          <line x1="258" y1="246" x2="258" y2="282" stroke="#94a3b8" strokeWidth="0.6" opacity="0.25" />
          <circle cx="246" cy="264" r="5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" opacity="0.65" />

          {/* Слой 2: Тепловое оранжево-красное затухание спирали накаливания при выключении */}
          <circle
            cx="246"
            cy="264"
            r="17"
            fill="url(#filamentAfterglow)"
            style={{
              opacity: isCooling ? 0.9 : 0,
              transform: `scale(${isCooling ? 0.45 : 1.05})`,
              transformOrigin: '246px 264px',
              transition: isCooling
                ? 'opacity 720ms cubic-bezier(0.4, 0, 0.2, 1), transform 720ms cubic-bezier(0.4, 0, 0.2, 1)'
                : 'none',
            }}
          />

          {/* Слой 3: Активное свечение галогенового отражателя */}
          <circle
            cx="246"
            cy="264"
            r="21.5"
            fill="url(#mainLampGlow)"
            style={{
              opacity: mainGlowOpacity,
              transform: `scale(${isLit ? 1 : 0.45})`,
              transformOrigin: '246px 264px',
              transition: isLit
                ? 'opacity 260ms ease-out, transform 340ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'opacity 320ms ease-in, transform 420ms ease-in',
            }}
          />

          {/* Блик на верхней кромке линзы */}
          <line x1="230" y1="264" x2="262" y2="264" stroke="#ffffff" strokeWidth="0.7" opacity="0.35" />
          <path d="M 234,252 A 16,16 0 0 1 258,252" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.55" />

          {/* Слой 4: Внешний мягкий ореол (Halo) вокруг фары */}
          <circle
            cx="246"
            cy="264"
            r="42"
            fill="url(#mainLampGlow)"
            className="pointer-events-none"
            style={{
              opacity: highBeamFlash ? 0.9 : headlightsOn ? (ignitionFlicker ? 0.3 : 0.65) : 0,
              transform: `scale(${haloScale * bassPulse})`,
              transformOrigin: '246px 264px',
              transition: isLit
                ? 'opacity 380ms ease-out, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
                : 'opacity 300ms ease-in, transform 320ms ease-in',
            }}
          />

          {/* Слой 5: Горизонтальные и диагональные лучи-блики (Anamorphic Lens Flare) */}
          <g
            className="pointer-events-none"
            style={{
              opacity: highBeamFlash ? 1 : headlightsOn ? (ignitionFlicker ? 0.35 : 0.85) : 0,
              transform: `scaleX(${highBeamFlash ? 1.45 : isIgniting ? 1.15 : headlightsOn ? 1 : 0.15}) scaleY(${
                highBeamFlash ? 1.3 : headlightsOn ? 1 : 0.2
              })`,
              transformOrigin: '246px 264px',
              transition: isLit
                ? 'opacity 320ms ease-out, transform 460ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'opacity 220ms ease-in, transform 260ms ease-in',
            }}
          >
            {/* Длинный горизонтальный анаморфный луч */}
            <ellipse cx="246" cy="264" rx="54" ry="2.2" fill="#fef08a" opacity="0.75" />
            <ellipse cx="246" cy="264" rx="28" ry="4" fill="#ffffff" opacity="0.85" />
            {/* Диагональные лучи звезды */}
            <line x1="222" y1="248" x2="270" y2="280" stroke="#fef08a" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
            <line x1="222" y1="280" x2="270" y2="248" stroke="#fef08a" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
          </g>
        </g>

        {/* ==================== ПРАВАЯ ОСНОВНАЯ ФАРА ==================== */}
        <g
          onClick={handleToggleHeadlights}
          className="cursor-pointer"
        >
          <title>{headlightsOn ? 'Нажмите, чтобы выключить фары' : 'Нажмите, чтобы включить фары'}</title>
          {/* Корпус и хромированный ободок фары */}
          <circle cx="554" cy="264" r="25" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />

          {/* Слой 1: Выключенная рифленая стеклянная линза (всегда в DOM) */}
          <circle cx="554" cy="264" r="21" fill="url(#lampOffGrad)" />
          {/* Рифление классического рассеивателя фары Golf Mk2 */}
          <line x1="542" y1="246" x2="542" y2="282" stroke="#94a3b8" strokeWidth="0.6" opacity="0.25" />
          <line x1="550" y1="244" x2="550" y2="284" stroke="#94a3b8" strokeWidth="0.6" opacity="0.25" />
          <line x1="558" y1="244" x2="558" y2="284" stroke="#94a3b8" strokeWidth="0.6" opacity="0.25" />
          <line x1="566" y1="246" x2="566" y2="282" stroke="#94a3b8" strokeWidth="0.6" opacity="0.25" />
          <circle cx="554" cy="264" r="5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" opacity="0.65" />

          {/* Слой 2: Тепловое оранжево-красное затухание спирали накаливания при выключении */}
          <circle
            cx="554"
            cy="264"
            r="17"
            fill="url(#filamentAfterglow)"
            style={{
              opacity: isCooling ? 0.9 : 0,
              transform: `scale(${isCooling ? 0.45 : 1.05})`,
              transformOrigin: '554px 264px',
              transition: isCooling
                ? 'opacity 720ms cubic-bezier(0.4, 0, 0.2, 1), transform 720ms cubic-bezier(0.4, 0, 0.2, 1)'
                : 'none',
            }}
          />

          {/* Слой 3: Активное свечение галогенового отражателя */}
          <circle
            cx="554"
            cy="264"
            r="21.5"
            fill="url(#mainLampGlow)"
            style={{
              opacity: mainGlowOpacity,
              transform: `scale(${isLit ? 1 : 0.45})`,
              transformOrigin: '554px 264px',
              transition: isLit
                ? 'opacity 260ms ease-out, transform 340ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'opacity 320ms ease-in, transform 420ms ease-in',
            }}
          />

          {/* Блик на верхней кромке линзы */}
          <line x1="538" y1="264" x2="570" y2="264" stroke="#ffffff" strokeWidth="0.7" opacity="0.35" />
          <path d="M 542,252 A 16,16 0 0 1 566,252" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.55" />

          {/* Слой 4: Внешний мягкий ореол (Halo) вокруг фары */}
          <circle
            cx="554"
            cy="264"
            r="42"
            fill="url(#mainLampGlow)"
            className="pointer-events-none"
            style={{
              opacity: highBeamFlash ? 0.9 : headlightsOn ? (ignitionFlicker ? 0.3 : 0.65) : 0,
              transform: `scale(${haloScale * bassPulse})`,
              transformOrigin: '554px 264px',
              transition: isLit
                ? 'opacity 380ms ease-out, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
                : 'opacity 300ms ease-in, transform 320ms ease-in',
            }}
          />

          {/* Слой 5: Горизонтальные и диагональные лучи-блики (Anamorphic Lens Flare) */}
          <g
            className="pointer-events-none"
            style={{
              opacity: highBeamFlash ? 1 : headlightsOn ? (ignitionFlicker ? 0.35 : 0.85) : 0,
              transform: `scaleX(${highBeamFlash ? 1.45 : isIgniting ? 1.15 : headlightsOn ? 1 : 0.15}) scaleY(${
                highBeamFlash ? 1.3 : headlightsOn ? 1 : 0.2
              })`,
              transformOrigin: '554px 264px',
              transition: isLit
                ? 'opacity 320ms ease-out, transform 460ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'opacity 220ms ease-in, transform 260ms ease-in',
            }}
          >
            {/* Длинный горизонтальный анаморфный луч */}
            <ellipse cx="554" cy="264" rx="54" ry="2.2" fill="#fef08a" opacity="0.75" />
            <ellipse cx="554" cy="264" rx="28" ry="4" fill="#ffffff" opacity="0.85" />
            {/* Диагональные лучи звезды */}
            <line x1="530" y1="248" x2="578" y2="280" stroke="#fef08a" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
            <line x1="530" y1="280" x2="578" y2="248" stroke="#fef08a" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
          </g>
        </g>

        {/* ФИРМЕННЫЕ КРЫШКИ ДОП. ФАР HELLA (при моргании дальним пробивается яркий контурный свет) */}
        {/* Левая крышка Hella */}
        <g onClick={handleFlashHighBeam} className="cursor-pointer">
          <title>Нажмите, чтобы моргнуть дальним светом</title>
          <circle cx="314" cy="266" r="21" fill="#0a0e17" stroke="#1e293b" strokeWidth="2" />
          <g clipPath="url(#hellaClipLeft)">
            <circle cx="314" cy="266" r="18.5" fill="#f1f5f9" />
            <rect x="294" y="246" width="40" height="12.5" fill="#0f172a" />
            <rect x="294" y="272.5" width="40" height="14" fill="#0f172a" />
            <text
              x="314"
              y="269"
              fill="#0f172a"
              fontSize="10.5"
              fontWeight="900"
              fontStyle="italic"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
              letterSpacing="0.3"
            >
              Hella
            </text>
            <ellipse cx="320" cy="278" rx="5.5" ry="2.8" fill="#0f172a" stroke="#f1f5f9" strokeWidth="1" />
          </g>
          <circle cx="314" cy="266" r="18.5" stroke={highBeamFlash ? '#fde047' : '#f1f5f9'} strokeWidth="2" />
          <path d="M 301,254 A 16,16 0 0 1 327,254" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
          {/* Вспышка дальнего света вокруг доп. фары Hella */}
          <circle
            cx="314"
            cy="266"
            r="28"
            fill="url(#mainLampGlow)"
            className="pointer-events-none"
            style={{
              opacity: highBeamFlash ? 0.85 : 0,
              transform: `scale(${highBeamFlash ? 1.2 : 0.6})`,
              transformOrigin: '314px 266px',
              transition: 'opacity 120ms ease, transform 150ms ease',
            }}
          />
        </g>

        {/* Правая крышка Hella */}
        <g onClick={handleFlashHighBeam} className="cursor-pointer">
          <title>Нажмите, чтобы моргнуть дальним светом</title>
          <circle cx="486" cy="266" r="21" fill="#0a0e17" stroke="#1e293b" strokeWidth="2" />
          <g clipPath="url(#hellaClipRight)">
            <circle cx="486" cy="266" r="18.5" fill="#f1f5f9" />
            <rect x="466" y="246" width="40" height="12.5" fill="#0f172a" />
            <rect x="466" y="272.5" width="40" height="14" fill="#0f172a" />
            <text
              x="486"
              y="269"
              fill="#0f172a"
              fontSize="10.5"
              fontWeight="900"
              fontStyle="italic"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
              letterSpacing="0.3"
            >
              Hella
            </text>
            <ellipse cx="492" cy="278" rx="5.5" ry="2.8" fill="#0f172a" stroke="#f1f5f9" strokeWidth="1" />
          </g>
          <circle cx="486" cy="266" r="18.5" stroke={highBeamFlash ? '#fde047' : '#f1f5f9'} strokeWidth="2" />
          <path d="M 473,254 A 16,16 0 0 1 499,254" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
          {/* Вспышка дальнего света вокруг доп. фары Hella */}
          <circle
            cx="486"
            cy="266"
            r="28"
            fill="url(#mainLampGlow)"
            className="pointer-events-none"
            style={{
              opacity: highBeamFlash ? 0.85 : 0,
              transform: `scale(${highBeamFlash ? 1.2 : 0.6})`,
              transformOrigin: '486px 266px',
              transition: 'opacity 120ms ease, transform 150ms ease',
            }}
          />
        </g>
        </g>
      </svg>

      {/* Быстрые кнопки двигателя в левом верхнем углу иллюстрации */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={() => toggleCarEngine()}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-md backdrop-blur-sm active:scale-95 ${
            engine.isRunning
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/70 text-emerald-200 shadow-emerald-500/20'
              : engine.isCranking
              ? 'bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse'
              : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-emerald-300'
          }`}
          title="Завести или заглушить двигатель Golf Mk2 1.8"
        >
          <span
            className={`w-2 h-2 rounded-full transition-all ${
              engine.isRunning
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : engine.isCranking
                ? 'bg-amber-400 animate-ping'
                : 'bg-slate-600'
            }`}
          />
          <KeyRound className={`w-3 h-3 ${engine.isRunning ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>
            {engine.isCranking
              ? 'Стартер...'
              : engine.isRunning
              ? 'Заглушить'
              : 'Завести мотор'}
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
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-md backdrop-blur-sm active:scale-95 select-none ${
            engine.isRevving
              ? 'bg-orange-500/35 border-orange-400 text-orange-100 shadow-orange-500/30 scale-105'
              : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700/80 text-amber-300 hover:text-amber-200'
          }`}
          title="Нажмите или удерживайте, чтобы погазовать!"
        >
          <Flame className={`w-3.5 h-3.5 ${engine.isRevving ? 'text-orange-400 animate-bounce' : 'text-amber-400'}`} />
          <span>Погазовать 💨</span>
        </button>
      </div>

      {/* Панель управления светом фар (в правом верхнем углу иллюстрации) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        {/* Кнопка: Моргнуть дальним */}
        <button
          type="button"
          onClick={handleFlashHighBeam}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-md backdrop-blur-sm active:scale-95 ${
            highBeamFlash
              ? 'bg-sky-500/30 border-sky-400 text-sky-200 shadow-sky-500/30'
              : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-slate-300 hover:text-white'
          }`}
          title="Двойная вспышка дальним светом"
        >
          <Zap className={`w-3 h-3 transition-transform ${highBeamFlash ? 'text-sky-300 scale-125' : 'text-sky-400'}`} />
          <span className="hidden sm:inline">Моргнуть дальним</span>
        </button>

        {/* Главный тумблер включения / отключения фар */}
        <button
          type="button"
          onClick={handleToggleHeadlights}
          className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-300 shadow-md backdrop-blur-sm active:scale-95 ${
            headlightsOn
              ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/70 text-amber-200 shadow-amber-500/20'
              : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700/80 text-slate-400 hover:text-amber-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              headlightsOn
                ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24] scale-110'
                : isCooling
                ? 'bg-orange-500/70 shadow-[0_0_4px_#f97316]'
                : 'bg-slate-600'
            }`}
          />
          <Power className={`w-3 h-3 transition-colors duration-300 ${headlightsOn ? 'text-amber-400' : 'text-slate-500'}`} />
          <span>{headlightsOn ? 'Выключить фары' : 'Включить фары'}</span>
        </button>
      </div>

      {/* Индикатор состояния ламп внизу справа */}
      <div className="absolute bottom-3 right-4 hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400/80 font-mono">
        <Sparkles className={`w-3 h-3 transition-colors duration-500 ${isLit ? 'text-amber-400' : 'text-slate-600'}`} />
        <span>
          {highBeamFlash
            ? 'ДАЛЬНИЙ СВЕТ'
            : phase === 'turning-on'
            ? 'РОЗЖИГ ГАЛОГЕНА...'
            : phase === 'turning-off'
            ? 'ОСТЫВАНИЕ СПИРАЛИ...'
            : headlightsOn
            ? 'БЛИЖНИЙ + ПТФ ВКЛ'
            : 'ФАРЫ ВЫКЛ'}
        </span>
      </div>

      {/* Живой мини-тахометр и подпись в левом нижнем углу */}
      <div className="absolute bottom-3 left-4 flex items-center gap-3 text-[10px] sm:text-xs font-mono tracking-wider">
        {engine.isRunning || engine.isCranking ? (
          <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-slate-950/85 border border-slate-800 text-amber-300">
            <Gauge className={`w-3.5 h-3.5 ${engine.isRedline ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
            <span className={engine.isRedline ? 'text-red-400 font-bold' : 'text-emerald-300 font-bold'}>
              {engine.rpm} RPM
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-[10px] text-slate-300">
              {engine.isCranking
                ? 'СТАРТЕР'
                : engine.isRedline
                ? 'ОТСЕЧКА! 🔥'
                : engine.isRevving
                ? 'ГАЗ В ПОЛ'
                : 'ХОЛОСТОЙ ХОД'}
            </span>
          </div>
        ) : (
          <span className="text-slate-500">CLASSIC MK2 · 1.8 EA827 · HELLA RALLYE</span>
        )}
      </div>
    </div>
  );
};

