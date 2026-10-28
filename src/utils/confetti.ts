import confetti from 'canvas-confetti';

/**
 * Запуск праздничного конфетти
 */
export function fireConfetti(originX = 0.5, originY = 0.6) {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: originX, y: originY },
    colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#eab308'],
    disableForReducedMotion: true,
  });
}

export function fireCelebrationConfetti() {
  fireConfetti(0.5, 0.5);
}

/**
 * Запуск грандиозного салюта (фейерверки с двух сторон экрана)
 */
export function fireGrandFireworks() {
  const duration = 3.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Запуск с левого края
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#fbbf24', '#f43f5e', '#38bdf8', '#a855f7'],
    });

    // Запуск с правого края
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#34d399', '#f97316', '#e11d48', '#fbbf24'],
    });
  }, 250);
}

/**
 * Аккуратный взрыв звезд
 */
export function fireStars(originX = 0.5, originY = 0.5) {
  confetti({
    shapes: ['star'],
    particleCount: 40,
    spread: 55,
    origin: { x: originX, y: originY },
    colors: ['#fbbf24', '#fef08a', '#f59e0b'],
  });
}
