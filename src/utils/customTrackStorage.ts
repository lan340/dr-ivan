/**
 * Модуль синхронизации и сохранения загруженного музыкального трека:
 * 1. Сохраняет аудиофайл на сервере (/api/car-audio), делая его постоянным оригинальным треком сайта.
 * 2. Дублирует трек в IndexedDB браузера, чтобы файлы любого размера (даже 15–30 МБ) не упирались в лимит localStorage (5 МБ).
 */

const DB_NAME = 'car_bass_audio_db';
const STORE_NAME = 'tracks';
const TRACK_KEY = 'original_car_track';

export const DEFAULT_ORIGINAL_TRACK_URL = '/assets/aistudio/____________5d3ff621.mp3';
export const DEFAULT_ORIGINAL_TRACK_NAME = 'Тёмный друн';

export interface StoredTrackInfo {
  audioUrl: string;
  trackName: string;
  isOriginalServerTrack?: boolean;
}

function openTrackDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTrackToIndexedDb(audioDataUrl: string, trackName: string): Promise<void> {
  try {
    const db = await openTrackDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ audioDataUrl, trackName, updatedAt: Date.now() }, TRACK_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore IndexedDB errors
  }
}

export async function getTrackFromIndexedDb(): Promise<{ audioDataUrl: string; trackName: string } | null> {
  try {
    const db = await openTrackDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(TRACK_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Сохраняет загруженный пользователем MP3/WAV на сервер как постоянный оригинальный трек
 * и резервирует его в IndexedDB
 */
export async function persistOriginalCarTrack(
  audioDataUrl: string,
  trackName: string
): Promise<StoredTrackInfo> {
  await saveTrackToIndexedDb(audioDataUrl, trackName);

  try {
    const res = await fetch('/api/car-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioDataUrl, trackName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data?.audioUrl) {
        return {
          audioUrl: data.audioUrl,
          trackName: data.trackName || trackName,
          isOriginalServerTrack: true,
        };
      }
    }
  } catch {
    // fallback to DataURL if server unreachable
  }

  return {
    audioUrl: audioDataUrl,
    trackName,
    isOriginalServerTrack: false,
  };
}

/**
 * Возвращает закрепленный оригинальный трек (/assets/aistudio/____________5d3ff621.mp3)
 * или обновленный пользователем серверный трек.
 */
export async function resolveOriginalCarTrack(
  currentAudioUrl?: string,
  currentTrackName?: string
): Promise<StoredTrackInfo> {
  // 1. Если в состоянии лежит base64 DataURL — отправляем его на сервер
  if (currentAudioUrl && currentAudioUrl.startsWith('data:audio/')) {
    return await persistOriginalCarTrack(
      currentAudioUrl,
      currentTrackName || DEFAULT_ORIGINAL_TRACK_NAME
    );
  }

  // 2. Проверяем серверный оригинальный трек
  try {
    const res = await fetch('/api/car-audio');
    if (res.ok) {
      const data = await res.json();
      if (data?.exists && data?.audioUrl) {
        return {
          audioUrl: data.audioUrl,
          trackName:
            !data.trackName || data.trackName === 'Тёмный дух'
              ? DEFAULT_ORIGINAL_TRACK_NAME
              : data.trackName,
          isOriginalServerTrack: true,
        };
      }
    }
  } catch {
    // ignore
  }

  // 3. По умолчанию возвращаем вшитый оригинальный трек из /assets/aistudio/____________5d3ff621.mp3
  return {
    audioUrl: DEFAULT_ORIGINAL_TRACK_URL,
    trackName: DEFAULT_ORIGINAL_TRACK_NAME,
    isOriginalServerTrack: true,
  };
}
