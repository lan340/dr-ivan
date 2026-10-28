/**
 * Модуль воспроизведения звука и анализа частот для сабвуфера и эквалайзера.
 * Поддерживает:
 * 1. Воспроизведение пользовательских MP3 / аудиофайлов (загруженных или по ссылке).
 * 2. Встроенный синтезатор плотного 808-басового ритма (Web Audio API), работающий автономно без внешних серверов.
 * 3. Извлечение частот (FFT) в реальном времени для живой анимации эквалайзера.
 */

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let audioElement: HTMLAudioElement | null = null;
let audioSourceNode: MediaElementAudioSourceNode | null = null;
let synthIntervalId: any = null;
let isPlaying = false;
let customTrackUrl = '';

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getAnalyser(): AnalyserNode {
  const ctx = getAudioContext();
  if (!analyser) {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
  }
  return analyser;
}

/**
 * Синтезирует удар плотного глубокого 808-баса с легким саб-панчем
 */
function playSynthBassKick(ctx: AudioContext, an: AnalyserNode) {
  const now = ctx.currentTime;

  // Саб-осциллятор (глубокий низкий тон)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
  osc.frequency.exponentialRampToValueAtTime(26, now + 0.38);

  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.connect(gain);
  gain.connect(an);
  an.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.45);

  // Хэт/клик щелчок
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(450, now);
  clickOsc.frequency.exponentialRampToValueAtTime(60, now + 0.04);
  clickGain.gain.setValueAtTime(0.3, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  clickOsc.connect(clickGain);
  clickGain.connect(an);
  clickOsc.start(now);
  clickOsc.stop(now + 0.04);
}

/**
 * Запуск или остановка музыки
 */
export function toggleBassAudio(
  trackUrl?: string, 
  onStateChange?: (playing: boolean) => void
): boolean {
  const ctx = getAudioContext();
  const an = getAnalyser();

  if (isPlaying) {
    stopBassAudio();
    if (onStateChange) onStateChange(false);
    return false;
  }

  const effectiveTrackUrl =
    trackUrl && trackUrl.trim() !== ''
      ? trackUrl.trim()
      : '/assets/aistudio/____________5d3ff621.mp3';

  if (effectiveTrackUrl) {
    try {
      if (!audioElement) {
        audioElement = new Audio();
        audioElement.crossOrigin = 'anonymous';
        audioElement.loop = true;
      }

      if (customTrackUrl !== effectiveTrackUrl) {
        audioElement.src = effectiveTrackUrl;
        customTrackUrl = effectiveTrackUrl;
      }

      // Подключаем к Analyser один раз
      if (!audioSourceNode) {
        try {
          audioSourceNode = ctx.createMediaElementSource(audioElement);
          audioSourceNode.connect(an);
          an.connect(ctx.destination);
        } catch (e) {
          console.warn('MediaElementSource fallback', e);
        }
      }

      audioElement.play().then(() => {
        isPlaying = true;
        if (onStateChange) onStateChange(true);
      }).catch((err) => {
        console.warn('Audio play failed, fallback to synth', err);
        startSynthGroove(ctx, an);
        isPlaying = true;
        if (onStateChange) onStateChange(true);
      });

      return true;
    } catch (e) {
      console.warn('Error starting track', e);
    }
  }

  // Если трека нет, включаем встроенный плотный 808-бит
  startSynthGroove(ctx, an);
  isPlaying = true;
  if (onStateChange) onStateChange(true);
  return true;
}

function startSynthGroove(ctx: AudioContext, an: AnalyserNode) {
  if (synthIntervalId) clearInterval(synthIntervalId);
  let step = 0;

  playSynthBassKick(ctx, an);
  synthIntervalId = setInterval(() => {
    step = (step + 1) % 4;
    // Ритмический рисунок баса (бочка на 1 и 3, сдвоенный бас на 4)
    if (step === 0 || step === 2 || step === 3) {
      playSynthBassKick(ctx, an);
    }
  }, 280);
}

export function stopBassAudio() {
  if (audioElement) {
    audioElement.pause();
  }
  if (synthIntervalId) {
    clearInterval(synthIntervalId);
    synthIntervalId = null;
  }
  isPlaying = false;
}

export function isAudioPlaying(): boolean {
  return isPlaying;
}

/**
 * Получить текущие уровни частот (0..100) для полос эквалайзера
 */
export function getFrequencyData(bandsCount = 14): number[] {
  if (!isPlaying) {
    return new Array(bandsCount).fill(0);
  }

  if (analyser) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const result: number[] = [];
    const step = Math.max(1, Math.floor(dataArray.length / bandsCount));

    for (let i = 0; i < bandsCount; i++) {
      const idx = Math.min(i * step, dataArray.length - 1);
      const val = dataArray[idx]; // 0..255
      const percent = Math.min(100, Math.round((val / 255) * 100));
      // Слегка приподнимаем нижние частоты для мощного вида баса
      const boost = i < 4 ? 1.25 : 1.0;
      result.push(Math.min(100, Math.round(percent * boost)));
    }
    return result;
  }

  // Если аудио контекст недоступен, фолбэк-пульсация
  return Array.from({ length: bandsCount }, () => Math.floor(Math.random() * 60 + 30));
}
