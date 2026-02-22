// Speech Engine for Defense Room Simulation
// Uses browser-native SpeechRecognition (STT) and speechSynthesis (TTS)

export type Language = "french" | "english" | "mixed";
export type JuryMember = "technical" | "academic" | "business";

// Language code mapping
const LANGUAGE_CODES: Record<Language, string> = {
  french: "fr-FR",
  english: "en-US",
  mixed: "fr-FR", // Default to French for mixed mode
};

// Voice profiles for jury members
const VOICE_PROFILES = {
  technical: {
    gender: "male",
    pitch: 0.9,
    rate: 0.9,
  },
  academic: {
    gender: "female",
    pitch: 1.1,
    rate: 1.0,
  },
  business: {
    gender: "male",
    pitch: 1.0,
    rate: 0.95,
  },
};

/**
 * Check if browser supports SpeechRecognition
 */
export function isSpeechRecognitionSupported(): boolean {
  return !!(
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
}

/**
 * Check if browser supports speechSynthesis
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Create and configure SpeechRecognition instance
 */
export function createSpeechRecognition(
  language: Language,
  onResult: (transcript: string, isFinal: boolean) => void,
  onEnd: () => void,
  onError: (error: string) => void
): any {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognitionAPI();

  recognition.lang = LANGUAGE_CODES[language];
  recognition.continuous = true; // Enable continuous mode to prevent stopping on pause
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  // Add detailed event logging
  recognition.onstart = () => {
    console.log("🎙️ Recognition started, waiting for audio...");
  };

  recognition.onaudiostart = () => {
    console.log("🔊 Audio capture started!");
  };

  recognition.onsoundstart = () => {
    console.log("🔉 Sound detected!");
  };

  recognition.onspeechstart = () => {
    console.log("🗣️ Speech detected!");
  };

  recognition.onresult = (event: any) => {
    console.log("📊 Results received, count:", event.results.length);
    
    // Accumulate full transcript from all segments
    let fullTranscript = "";
    let isFinal = false;
    
    for (let i = 0; i < event.results.length; i++) {
      fullTranscript += event.results[i][0].transcript;
      if (event.results[i].isFinal && i === event.results.length - 1) {
        isFinal = true;
      }
    }
    
    // In continuous mode, we treat the stream as "final" only when the user explicitly stops
    // But we pass the isFinal flag of the current chunk for internal distinctness if needed
    // For the UI, we just want to show the full text growing
    
    console.log(`📝 Transcript:`, fullTranscript);
    onResult(fullTranscript, isFinal);
  };

  recognition.onspeechend = () => {
    console.log("🤐 Speech ended (pause detected)");
    // In continuous mode, this doesn't mean recognition stops
  };

  recognition.onsoundend = () => {
    console.log("🔇 Sound ended");
  };

  recognition.onaudioend = () => {
    console.log("🔴 Audio capture ended");
  };

  recognition.onend = () => {
    console.log("⏹️ Recognition session ended");
    onEnd();
  };

  recognition.onerror = (event: any) => {
    console.error("❌ Recognition error:", event.error, event.message);
    onError(event.error || "Unknown error");
  };

  recognition.onnomatch = () => {
    console.warn("⚠️ No speech match - speech heard but not recognized");
  };

  return recognition;
}

/**
 * Select appropriate voice for jury member
 */
function selectVoice(
  juryMember: JuryMember,
  language: Language
): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const langCode = LANGUAGE_CODES[language];
  const profile = VOICE_PROFILES[juryMember];

  // Filter voices by language
  const languageVoices = voices.filter((voice) =>
    voice.lang.startsWith(langCode.split("-")[0])
  );

  if (languageVoices.length === 0) {
    // Fallback to any voice if no language match
    return voices[0] || null;
  }

  // Try to find voice matching gender preference
  const genderKeywords =
    profile.gender === "male"
      ? ["male", "man", "homme", "masculin"]
      : ["female", "woman", "femme", "féminin"];

  const genderVoice = languageVoices.find((voice) =>
    genderKeywords.some((keyword) =>
      voice.name.toLowerCase().includes(keyword)
    )
  );

  if (genderVoice) {
    return genderVoice;
  }

  // Fallback to first language voice
  return languageVoices[0];
}

/**
 * Speak text using browser TTS
 */
export function speakText(
  text: string,
  juryMember: JuryMember,
  language: Language
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error("Speech synthesis not supported"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const profile = VOICE_PROFILES[juryMember];

    utterance.lang = LANGUAGE_CODES[language];
    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;

    // Try to select appropriate voice
    const voice = selectVoice(juryMember, language);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (event) => {
      reject(new Error(event.error || "Speech synthesis error"));
    };

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Start speaking
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  return (
    isSpeechSynthesisSupported() && window.speechSynthesis.speaking
  );
}

/**
 * Stop current speech
 */
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Load voices (required for some browsers)
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Some browsers load voices asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}
