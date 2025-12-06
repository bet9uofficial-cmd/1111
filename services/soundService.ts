
export const AUDIO_URLS = {
  open: 'https://cdn.pixabay.com/audio/2022/03/24/audio_33db86e409.mp3', // Paper slide/Whoosh
  coin: 'https://cdn.pixabay.com/audio/2021/08/09/audio_88447e769f.mp3', // Coins dropping
  fanfare: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3', // Success/Fanfare
};

const playSound = (url: string, volume = 0.5) => {
  try {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch((e) => {
      console.warn('Audio playback failed (likely due to autoplay policy):', e);
    });
  } catch (e) {
    console.error('Failed to initialize audio:', e);
  }
};

export const playOpenSound = () => playSound(AUDIO_URLS.open, 0.4);
export const playCoinSound = () => playSound(AUDIO_URLS.coin, 0.6);
export const playFanfareSound = () => playSound(AUDIO_URLS.fanfare, 0.5);
