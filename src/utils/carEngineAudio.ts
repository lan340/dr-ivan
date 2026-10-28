/**
 * Аудио-движок классического 4-цилиндрового мотора (VW Golf Mk2 1.8) на Web Audio API.
 * Включает:
 * - Звук стартера с компрессионными тактами при запуске
 * - Подхват с перегазовкой и выход на живой холостой ход (~880 об/мин)
 * - Реалистичный набор оборотов при нажатии/удержании газа («Погазовать»)
 * - Отсечку на максимальных оборотах (~6700–6900 об/мин)
 * - Прострелы и бубнёж басистого выхлопа при сбросе газа
 */

import { getAudioContext } from './audioBass';

export interface EngineTelemetry {
  isRunning: boolean;
  isCranking: boolean;
  rpm: number;
  isRevving: boolean;
  isRedline: boolean;
  exhaustPop: boolean;
}

type TelemetryListener = (state: EngineTelemetry) => void;

let isRunning = false;
let isCranking = false;
let isRevving = false;
let currentRpm = 0;
let targetRpm = 0;
let exhaustPopActive = false;

let rafId: number | null = null;
let crankTimeoutId: number | null = null;
let blipTimeoutId: number | null = null;
let popTimeoutId: number | null = null;

// Web Audio узлы работающего мотора
let masterGain: GainNode | null = null;
let firingOsc: OscillatorNode | null = null;
let subExhaustOsc: OscillatorNode | null = null;
let harmonicOsc: OscillatorNode | null = null;
let exhaustFilter: BiquadFilterNode | null = null;
let intakeNoiseNode: AudioBufferSourceNode | null = null;
let intakeFilter: BiquadFilterNode | null = null;
let intakeGain: GainNode | null = null;

const listeners = new Set<TelemetryListener>();

function notifyListeners() {
  const snapshot: EngineTelemetry = {
    isRunning,
    isCranking,
    rpm: Math.round(currentRpm),
    isRevving,
    isRedline: currentRpm >= 6350,
    exhaustPop: exhaustPopActive,
  };
  listeners.forEach((cb) => cb(snapshot));
}

export function subscribeEngineTelemetry(cb: TelemetryListener): () => void {
  listeners.add(cb);
  cb({
    isRunning,
    isCranking,
    rpm: Math.round(currentRpm),
    isRevving,
    isRedline: currentRpm >= 6350,
    exhaustPop: exhaustPopActive,
  });
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Создает буфер белого/розового шума для впуска и механического шелеста ГБЦ
 */
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.04 * white) / 1.04;
    lastOut = data[i];
    data[i] *= 2.5;
  }
  return buffer;
}

/**
 * Звук вращения стартера с 3 компрессионными тактами перед запуском мотора
 */
function playStarterCrankSound(ctx: AudioContext, durationSec = 0.68) {
  const now = ctx.currentTime;

  // Основной электромотор стартера
  const starterOsc = ctx.createOscillator();
  const gearOsc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const mainGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  starterOsc.type = 'sawtooth';
  starterOsc.frequency.setValueAtTime(155, now);

  gearOsc.type = 'triangle';
  gearOsc.frequency.setValueAtTime(510, now);

  // Пульсация компрессии в цилиндрах (около 6.5 сжатий в секунду)
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(6.2, now);
  lfoGain.gain.setValueAtTime(35, now);

  lfo.connect(lfoGain);
  lfoGain.connect(starterOsc.frequency);
  lfoGain.connect(gearOsc.frequency);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(720, now);

  mainGain.gain.setValueAtTime(0.01, now);
  mainGain.gain.linearRampToValueAtTime(0.24, now + 0.05);
  // Пульсации громкости под нагрузкой стартера
  mainGain.gain.setValueAtTime(0.24, now + 0.14);
  mainGain.gain.linearRampToValueAtTime(0.12, now + 0.22);
  mainGain.gain.linearRampToValueAtTime(0.26, now + 0.34);
  mainGain.gain.linearRampToValueAtTime(0.13, now + 0.44);
  mainGain.gain.linearRampToValueAtTime(0.28, now + 0.56);
  mainGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

  starterOsc.connect(filter);
  gearOsc.connect(filter);
  filter.connect(mainGain);
  mainGain.connect(ctx.destination);

  starterOsc.start(now);
  gearOsc.start(now);
  lfo.start(now);

  starterOsc.stop(now + durationSec);
  gearOsc.stop(now + durationSec);
  lfo.stop(now + durationSec);
}

/**
 * Прострел/хлопок в глушителе на сбросе высоких оборотов
 */
function playExhaustBurblePop(ctx: AudioContext, intensity = 1) {
  const now = ctx.currentTime;

  // Низкочастотный удар в банке глушителя
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  const startFreq = 115 + Math.random() * 45;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(32, now + 0.09);

  gain.gain.setValueAtTime(0.32 * intensity, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);

  // Визуальный индикатор отстрела
  exhaustPopActive = true;
  if (popTimeoutId) window.clearTimeout(popTimeoutId);
  popTimeoutId = window.setTimeout(() => {
    exhaustPopActive = false;
    notifyListeners();
  }, 130);
}

/**
 * Инициализация и запуск постоянных осцилляторов работающего двигателя
 */
function initRunningEngineNodes(ctx: AudioContext) {
  cleanupAudioNodes();

  const now = ctx.currentTime;

  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.01, now);
  masterGain.gain.linearRampToValueAtTime(0.34, now + 0.18);

  exhaustFilter = ctx.createBiquadFilter();
  exhaustFilter.type = 'lowpass';
  exhaustFilter.frequency.setValueAtTime(190, now);
  exhaustFilter.Q.setValueAtTime(3.2, now);

  // 1. Основная частота вспышек 4-цилиндрового мотора (2 вспышки за оборот коленвала)
  firingOsc = ctx.createOscillator();
  firingOsc.type = 'sawtooth';
  firingOsc.frequency.setValueAtTime(55, now);

  // 2. Саб-резонанс басистой банки глушителя (половинный тон)
  subExhaustOsc = ctx.createOscillator();
  subExhaustOsc.type = 'triangle';
  subExhaustOsc.frequency.setValueAtTime(27.5, now);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.65, now);

  // 3. Обертон блока цилиндров и выхлопного коллектора
  harmonicOsc = ctx.createOscillator();
  harmonicOsc.type = 'square';
  harmonicOsc.frequency.setValueAtTime(110, now);

  const harmGain = ctx.createGain();
  harmGain.gain.setValueAtTime(0.18, now);

  // 4. Шум впуска / дроссельной заслонки
  intakeNoiseNode = ctx.createBufferSource();
  intakeNoiseNode.buffer = createNoiseBuffer(ctx);
  intakeNoiseNode.loop = true;

  intakeFilter = ctx.createBiquadFilter();
  intakeFilter.type = 'bandpass';
  intakeFilter.frequency.setValueAtTime(350, now);
  intakeFilter.Q.setValueAtTime(1.8, now);

  intakeGain = ctx.createGain();
  intakeGain.gain.setValueAtTime(0.05, now);

  // Соединяем граф
  firingOsc.connect(exhaustFilter);
  subExhaustOsc.connect(subGain);
  subGain.connect(exhaustFilter);
  harmonicOsc.connect(harmGain);
  harmGain.connect(exhaustFilter);

  intakeNoiseNode.connect(intakeFilter);
  intakeFilter.connect(intakeGain);
  intakeGain.connect(masterGain);

  exhaustFilter.connect(masterGain);
  masterGain.connect(ctx.destination);

  firingOsc.start(now);
  subExhaustOsc.start(now);
  harmonicOsc.start(now);
  intakeNoiseNode.start(now);
}

function cleanupAudioNodes() {
  try {
    firingOsc?.stop();
    subExhaustOsc?.stop();
    harmonicOsc?.stop();
    intakeNoiseNode?.stop();
  } catch {
    // ignore already stopped
  }
  firingOsc?.disconnect();
  subExhaustOsc?.disconnect();
  harmonicOsc?.disconnect();
  intakeNoiseNode?.disconnect();
  exhaustFilter?.disconnect();
  masterGain?.disconnect();

  firingOsc = null;
  subExhaustOsc = null;
  harmonicOsc = null;
  intakeNoiseNode = null;
  exhaustFilter = null;
  intakeFilter = null;
  intakeGain = null;
  masterGain = null;
}

/**
 * Главный цикл физики оборотов (RPM) и модуляции звука в реальном времени
 */
function startEngineLoop() {
  if (rafId) cancelAnimationFrame(rafId);

  let lastTime = performance.now();
  let prevRpm = currentRpm;

  const tick = (nowMs: number) => {
    const dt = Math.min(0.05, (nowMs - lastTime) / 1000);
    lastTime = nowMs;

    if (!isRunning && !isCranking && currentRpm <= 10) {
      currentRpm = 0;
      notifyListeners();
      return;
    }

    if (isRunning) {
      if (isRevving) {
        targetRpm = 6800;
        // Быстрый и бодрый раскрут мотора при открытом дросселе
        const accelRate = currentRpm < 3800 ? 5200 : 4100;
        currentRpm += accelRate * dt;

        // Эффект жесткой отсечки на ~6750–6900 об/мин (Rev Limiter)
        if (currentRpm >= 6820) {
          currentRpm = 6480 + Math.random() * 140;
          try {
            playExhaustBurblePop(getAudioContext(), 0.75);
          } catch {
            // ignore
          }
        }
      } else {
        // Живой холостой ход ~880 об/мин с легким классическим покачиванием
        const idleWave = Math.sin(nowMs * 0.008) * 18 + Math.cos(nowMs * 0.019) * 12;
        const desiredIdle = Math.max(880 + idleWave, targetRpm);

        if (currentRpm > desiredIdle) {
          // Плавный сброс оборотов под действием маховика
          const dropRate = currentRpm > 3200 ? 3400 : 2100;
          currentRpm = Math.max(desiredIdle, currentRpm - dropRate * dt);

          // Случайные породистые прострелы выхлопа на сбросе с высоких оборотов
          if (prevRpm > 3100 && currentRpm < prevRpm && Math.random() < 0.14) {
            try {
              playExhaustBurblePop(getAudioContext(), 0.9);
            } catch {
              // ignore
            }
          }
        } else {
          currentRpm += (desiredIdle - currentRpm) * Math.min(1, dt * 6);
        }
      }
    } else if (!isCranking) {
      // Двигатель заглушен — быстрое падение оборотов до нуля
      currentRpm = Math.max(0, currentRpm - 3800 * dt);
    }

    prevRpm = currentRpm;

    // Обновляем параметры Web Audio узлов согласно текущим оборотам
    if (firingOsc && subExhaustOsc && harmonicOsc && exhaustFilter && masterGain) {
      const ctx = getAudioContext();
      const t = ctx.currentTime;

      // Частота вспышек в 4-цилиндровом 4-тактном двигателе: (RPM / 60) * 2
      // На 880 RPM -> ~29.3 Гц; на 6000 RPM -> 200 Гц
      const baseFiringHz = Math.max(16, (currentRpm / 60) * 2);
      // Легкая неровность работы карбюратора/распредвала на холостых
      const lopeJitter = currentRpm < 1200 ? Math.sin(nowMs * 0.035) * 1.4 : 0;
      const freq = baseFiringHz + lopeJitter;

      firingOsc.frequency.setTargetAtTime(freq, t, 0.015);
      subExhaustOsc.frequency.setTargetAtTime(freq * 0.5, t, 0.015);
      harmonicOsc.frequency.setTargetAtTime(freq * 2, t, 0.015);

      // Открытие фильтра выхлопа и впуска с ростом оборотов и нажатием педали газа
      const rpmRatio = Math.min(1, Math.max(0, (currentRpm - 800) / 6000));
      const filterCutoff = 155 + rpmRatio * 980 + (isRevving ? 240 : 0);
      exhaustFilter.frequency.setTargetAtTime(filterCutoff, t, 0.02);

      if (intakeFilter && intakeGain) {
        intakeFilter.frequency.setTargetAtTime(300 + rpmRatio * 1400, t, 0.02);
        intakeGain.gain.setTargetAtTime(0.04 + rpmRatio * 0.16 + (isRevving ? 0.08 : 0), t, 0.02);
      }

      const targetVol = 0.24 + rpmRatio * 0.22 + (isRevving ? 0.06 : 0);
      masterGain.gain.setTargetAtTime(targetVol, t, 0.03);
    }

    notifyListeners();
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}

/**
 * Завести или заглушить двигатель
 */
export function toggleCarEngine(): boolean {
  const ctx = getAudioContext();

  if (isRunning || isCranking) {
    stopCarEngine();
    return false;
  }

  // Фаза 1: Крутит стартер (~680 мс)
  isCranking = true;
  isRunning = false;
  currentRpm = 260;
  notifyListeners();
  playStarterCrankSound(ctx, 0.68);
  startEngineLoop();

  if (crankTimeoutId) window.clearTimeout(crankTimeoutId);
  crankTimeoutId = window.setTimeout(() => {
    // Фаза 2: Двигатель схватывает с сочной перегазовкой до 2100 об/мин!
    isCranking = false;
    isRunning = true;
    currentRpm = 2150;
    targetRpm = 880;
    initRunningEngineNodes(ctx);
    playExhaustBurblePop(ctx, 0.7);
    notifyListeners();
  }, 660);

  return true;
}

/**
 * Начать газовать (удержание педали газа)
 */
export function startRevvingEngine() {
  const ctx = getAudioContext();

  if (blipTimeoutId) {
    window.clearTimeout(blipTimeoutId);
    blipTimeoutId = null;
  }

  // Если мотор еще не был заведен — заводим его мгновенно с бодрого подхвата!
  if (!isRunning && !isCranking) {
    isRunning = true;
    currentRpm = 1400;
    targetRpm = 880;
    initRunningEngineNodes(ctx);
    startEngineLoop();
  }

  if (isRunning) {
    isRevving = true;
    notifyListeners();
  }
}

/**
 * Отпустить педаль газа
 */
export function stopRevvingEngine() {
  if (!isRevving) return;
  isRevving = false;
  targetRpm = 880;

  if (currentRpm > 2800) {
    try {
      playExhaustBurblePop(getAudioContext(), 1.0);
    } catch {
      // ignore
    }
  }
  notifyListeners();
}

/**
 * Короткая сочная перегазовка по одиночному клику («Врум-врум!»)
 */
export function blipThrottle() {
  const ctx = getAudioContext();

  if (!isRunning && !isCranking) {
    // Заводим мотор и сразу даем перегазовку
    toggleCarEngine();
    return;
  }

  if (!isRunning) return;

  isRevving = true;
  targetRpm = Math.min(6500, Math.max(3600, currentRpm + 2200));
  notifyListeners();

  if (blipTimeoutId) window.clearTimeout(blipTimeoutId);
  blipTimeoutId = window.setTimeout(() => {
    isRevving = false;
    targetRpm = 880;
    if (currentRpm > 2400) {
      try {
        playExhaustBurblePop(getAudioContext(), 0.95);
      } catch {
        // ignore
      }
    }
    notifyListeners();
  }, 380);
}

/**
 * Полная остановка двигателя
 */
export function stopCarEngine() {
  if (crankTimeoutId) {
    window.clearTimeout(crankTimeoutId);
    crankTimeoutId = null;
  }
  if (blipTimeoutId) {
    window.clearTimeout(blipTimeoutId);
    blipTimeoutId = null;
  }
  if (popTimeoutId) {
    window.clearTimeout(popTimeoutId);
    popTimeoutId = null;
  }

  isCranking = false;
  isRunning = false;
  isRevving = false;
  exhaustPopActive = false;
  targetRpm = 0;

  if (masterGain) {
    try {
      const ctx = getAudioContext();
      masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
      window.setTimeout(() => {
        cleanupAudioNodes();
      }, 220);
    } catch {
      cleanupAudioNodes();
    }
  } else {
    cleanupAudioNodes();
  }

  notifyListeners();
}
