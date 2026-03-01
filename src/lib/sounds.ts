const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ac.destination);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + duration);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    // Audio not supported
  }
}

/** Short rising tone — success */
export function playSuccess() {
  beep(880, 0.12, 'sine', 0.25);
  setTimeout(() => beep(1320, 0.15, 'sine', 0.2), 80);
}

/** Short low buzz — error */
export function playError() {
  beep(200, 0.2, 'square', 0.15);
  setTimeout(() => beep(150, 0.25, 'square', 0.12), 120);
}
