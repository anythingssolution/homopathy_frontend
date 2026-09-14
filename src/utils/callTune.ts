export type CallTuneMode = 'CHIME' | 'TEMPLATE' | 'CUSTOM';

export type CallTuneSetting = {
  branch_id?: number;
  mode: CallTuneMode;
  custom_text?: string | null;
};

export const CALL_TUNE_TEMPLATE = 'Token number {token} proceed to consult room.';
export const CALL_TUNE_CUSTOM_MAX = 200;

export const normalizeCallTuneMode = (value?: string | null): CallTuneMode => {
  const mode = String(value || 'CHIME').trim().toUpperCase();
  return mode === 'TEMPLATE' || mode === 'CUSTOM' ? mode : 'CHIME';
};

export const buildCallAnnouncement = (
  setting: Pick<CallTuneSetting, 'mode' | 'custom_text'>,
  tokenDisplay: string,
): string | null => {
  const token = String(tokenDisplay || '').trim();
  if (!token) return null;

  const mode = normalizeCallTuneMode(setting.mode);
  if (mode === 'CHIME') return null;

  if (mode === 'CUSTOM') {
    const template = String(setting.custom_text || '').trim();
    if (!template) return null;
    if (/\{token\}/i.test(template)) {
      return template.replace(/\{token\}/gi, token);
    }
    return template;
  }

  return `Token number ${token} proceed to consult room.`;
};

/** Existing live-queue-flow ring-ring. Kept identical so current TVs sound the same. */
export const playCallChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playBell = (startTime: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playBell(now, 830, 0.25);
    playBell(now + 0.28, 1050, 0.25);
    playBell(now + 0.7, 830, 0.25);
    playBell(now + 0.98, 1050, 0.25);
    playBell(now + 1.4, 830, 0.25);
    playBell(now + 1.68, 1050, 0.3);

    setTimeout(() => ctx.close().catch(() => {}), 3000);
  } catch (error) {
    console.warn('[callTune] Could not play chime', error);
  }
};

const speakAnnouncement = (text: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('Speech synthesis is not available'));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(event.error || new Error('Speech failed'));
    window.speechSynthesis.speak(utterance);
  });

export const playCallTune = async (
  setting: Pick<CallTuneSetting, 'mode' | 'custom_text'>,
  tokenDisplay?: string,
) => {
  const mode = normalizeCallTuneMode(setting.mode);
  const announcement = mode === 'CHIME' ? null : buildCallAnnouncement(setting, tokenDisplay || 'M-1');

  if (!announcement) {
    playCallChime();
    return;
  }

  try {
    await speakAnnouncement(announcement);
  } catch (error) {
    console.warn('[callTune] Speech failed, falling back to chime', error);
    playCallChime();
  }
};
