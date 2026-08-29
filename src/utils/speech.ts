// Cross-Browser Web Speech API Voice Synthesis Wrapper for Marathi (mr-IN) & English (en-IN)
// Supports Devanagari Phonetic Fallback (hi-IN) at 0.90x speed when native mr-IN voice is missing.

export class SpeechEngine {
  private static isSpeaking = false;
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  private static listeners: Set<(speaking: boolean) => void> = new Set();

  static subscribe(listener: (speaking: boolean) => void) {
    this.listeners.add(listener);
    listener(this.isSpeaking);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(speaking: boolean) {
    this.isSpeaking = speaking;
    this.listeners.forEach(fn => fn(speaking));
  }

  static getIsSpeaking() {
    return this.isSpeaking;
  }

  static stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.notify(false);
  }

  static sanitizeMarkdownText(text: string): string {
    return text
      .replace(/[#*`_\[\]()~>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static speak(text: string, lang: 'en' | 'mr' = 'en', onDone?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser environment.');
      onDone?.();
      return;
    }

    // Stop ongoing speech
    window.speechSynthesis.cancel();

    const cleanText = this.sanitizeMarkdownText(text);

    if (!cleanText) {
      onDone?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Get available voices from browser engine
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (lang === 'mr') {
      // 1. Primary target: Native Marathi (mr-IN or mr)
      const mrVoice = voices.find(
        v => v.lang === 'mr-IN' || v.lang === 'mr' || v.name.toLowerCase().includes('marathi')
      );

      if (mrVoice) {
        selectedVoice = mrVoice;
        utterance.lang = 'mr-IN';
        utterance.rate = 0.92;
      } else {
        // 2. Fallback target: Devanagari Phonetic Matching (hi-IN or hi) at 0.90x rate
        const hiVoice = voices.find(
          v => v.lang === 'hi-IN' || v.lang === 'hi' || v.name.toLowerCase().includes('hindi')
        );
        if (hiVoice) {
          selectedVoice = hiVoice;
          utterance.lang = 'hi-IN';
          utterance.rate = 0.90; // Fallback cadence for Marathi Devanagari text
        } else {
          utterance.lang = 'mr-IN';
          utterance.rate = 0.90;
        }
      }
    } else {
      // English voice selection
      const enVoice = voices.find(
        v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india') || v.lang.startsWith('en')
      );
      if (enVoice) {
        selectedVoice = enVoice;
        utterance.lang = enVoice.lang;
      } else {
        utterance.lang = 'en-IN';
      }
      utterance.rate = 0.95;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.notify(true);
    };

    utterance.onend = () => {
      this.notify(false);
      onDone?.();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      this.notify(false);
      onDone?.();
    };

    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
}
