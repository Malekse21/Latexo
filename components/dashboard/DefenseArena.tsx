"use client";

import { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/context/user-context";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertTriangle, X, Shield, Swords, Flame, Mic, Square, ArrowRight, Lock, Chrome } from "lucide-react";

import { TalkingAvatar } from "@/components/dashboard/TalkingAvatar";
import { VoiceWaveform } from "@/components/dashboard/VoiceWaveform";
import { MicrophoneButton } from "@/components/dashboard/MicrophoneButton";


// Helper: play a simple synthesized beep or click
const playSoundEffect = (type: 'pop' | 'click' | 'chime') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'pop') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'click') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'chime') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    }
  } catch (e) {
    console.error("Audio Context not supported or failed", e);
  }
};

type SimulationPhase = "config" | "loading" | "arena" | "closing" | "aftermath";
type Language = "french" | "english" | "mixed";
type Difficulty = "gentle" | "standard" | "hostile";
type ActiveSpeaker = "student" | "technical" | "academic" | "business" | null;

interface TranscriptMessage {
  speaker: "student" | "technical" | "academic" | "business";
  text: string;
  timestamp: number;
}

interface SimulationConfig {
  language: Language;
  duration: number; // in minutes
  difficulty: Difficulty;
}

const LOADING_MESSAGES = [
  "Reading 80 pages of research...",
  "Indexing technical stack...",
  "Briefing the Jury members...",
  "Identifying 4 methodological vulnerabilities...",
];

// These will be populated with t() inside the component
const DIFFICULTY_CARD_META = [
  {
    id: "gentle" as Difficulty,
    titleKey: "simulation.difficulty_gentle",
    descKey: "simulation.difficulty_gentle_desc",
    icon: Shield,
    color: "text-blue-500",
    bgAccent: "bg-blue-50",
    borderHover: "hover:border-blue-500"
  },
  {
    id: "standard" as Difficulty,
    titleKey: "simulation.difficulty_standard",
    descKey: "simulation.difficulty_standard_desc",
    icon: Swords,
    color: "text-gray-700",
    bgAccent: "bg-gray-50",
    borderHover: "hover:border-black"
  },
  {
    id: "hostile" as Difficulty,
    titleKey: "simulation.difficulty_hostile",
    descKey: "simulation.difficulty_hostile_desc",
    icon: Flame,
    color: "text-red-500",
    bgAccent: "bg-red-50",
    borderHover: "hover:border-red-500"
  },
];

// Distinct voice profiles for each jury member
const VOICE_PROFILES: Record<string, { pitch: number; rate: number }> = {
  technical: { pitch: 0.85, rate: 0.9 },   // Malek — deep, deliberate
  academic: { pitch: 1.4, rate: 1.1 },     // Souad — high-pitch female, faster, clear
  business: { pitch: 1.0, rate: 1.05 },    // Amir — mid-range, energetic
};

interface DefenseArenaProps {
  onSimulationComplete?: (simulationId: string) => void;
  reportId?: string;
  initialLanguage?: Language;
}

export function DefenseArena({ onSimulationComplete, reportId, initialLanguage }: DefenseArenaProps = {}) {
  const { profile, refreshProfile, language, t } = useUser();
  const [phase, setPhase] = useState<SimulationPhase>("config");
  const [config, setConfig] = useState<SimulationConfig>({
    language: initialLanguage || (language === "fr" ? "french" : "english"),
    duration: 15,
    difficulty: "standard",
  });
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const [loadingStep, setLoadingStep] = useState(0);
  
  // Arena state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<ActiveSpeaker>(null);
  const [transcript, setTranscript] = useState(t('common.loading'));
  
  // Transcript tracking for evaluation
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const closingPhaseRef = useRef<() => void>(() => {});
  const isClosingRef = useRef(false);
  const isEvaluatingRef = useRef(false);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Keep messagesRef always in sync with messages state (avoids stale closures)
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // Voice state (Native Browser APIs)
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [liveCaption, setLiveCaption] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [evaluationResults, setEvaluationResults] = useState<any>(null);

  // Fallback STT State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);


  // Loading phase enhancements
  const [loadingTickerIndex, setLoadingTickerIndex] = useState(0);
  const [reportName, setReportName] = useState<string | null>(null);
  // Closing phase enhancements
  const [deliberationStep, setDeliberationStep] = useState(0);
  
  // Config phase enhancements
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isChrome, setIsChrome] = useState(true);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveSimulations, setLiveSimulations] = useState(0);

  // Silence counter state
  const [lastJurySpeaker, setLastJurySpeaker] = useState<ActiveSpeaker>(null);
  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const [juryBubbleMessage, setJuryBubbleMessage] = useState<string | null>(null);
  const silenceThresholdsRef = useRef({ gentle: 0, gentleHide: 0, impatient: 0, impatientHide: 0 });

  // SFX & ambiance state
  const [sfxEvent, setSfxEvent] = useState<{ juror: ActiveSpeaker; emoji: string } | null>(null);
  const ambianceRef = useRef<HTMLAudioElement | null>(null);

  // Track the last jury speaker so we know who to show the bubble on
  useEffect(() => {
    if (activeSpeaker === 'technical' || activeSpeaker === 'academic' || activeSpeaker === 'business') {
      setLastJurySpeaker(activeSpeaker);
    }
  }, [activeSpeaker]);

  // Silence counter: ticks every second when it's the student's turn and they're idle
  useEffect(() => {
    const isStudentTurn = phase === 'arena' && !isRecording && !isAISpeaking && !isProcessingAudio && !isPaused;

    if (!isStudentTurn) {
      // Reset silence when someone is active
      setSilenceSeconds(0);
      setJuryBubbleMessage(null);
      // Randomize thresholds for the 4-event cycle:
      // gentleShow → gentleHide (2-3s visible) → gap (7s) → impatientShow → impatientHide (2-3s visible)
      const g = Math.floor(Math.random() * 3) + 3;             // show gentle at 3-5s
      const gDur = Math.floor(Math.random() * 2) + 2;          // visible for 2-3s
      const iShow = g + gDur + 7;                               // show impatient 7s after gentle hides
      const iDur = Math.floor(Math.random() * 2) + 2;          // visible for 2-3s
      silenceThresholdsRef.current = {
        gentle: g,
        gentleHide: g + gDur,
        impatient: iShow,
        impatientHide: iShow + iDur,
      };
      return;
    }

    const interval = setInterval(() => {
      setSilenceSeconds(prev => {
        const next = prev + 1;
        const { gentle, gentleHide, impatient, impatientHide } = silenceThresholdsRef.current;

        if (next === gentle) {
          const msgs = config.language === 'french'
            ? ["Prenez votre temps.", "Pas de pression.", "Réfléchissez bien."]
            : ["Take your time.", "No rush.", "Think it through."];
          setJuryBubbleMessage(msgs[Math.floor(Math.random() * msgs.length)]);
        } else if (next === gentleHide) {
          setJuryBubbleMessage(null);
        } else if (next === impatient) {
          const msgs = config.language === 'french'
            ? ["On n'a pas toute la journée.", "Le temps presse, allez-y.", "Il faudrait se décider."]
            : ["We don't have all day.", "Time is ticking.", "We're still waiting."];
          setJuryBubbleMessage(msgs[Math.floor(Math.random() * msgs.length)]);
        } else if (next === impatientHide) {
          setJuryBubbleMessage(null);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isRecording, isAISpeaking, isProcessingAudio, isPaused, config.language]);

  // Background ambiance loop — plays at very low volume during the arena phase
  useEffect(() => {
    if (phase === 'arena' && !isPaused) {
      if (!ambianceRef.current) {
        const audio = new Audio('/sounds/ambiance-background.mp3');
        audio.loop = true;
        audio.volume = 0.09;
        ambianceRef.current = audio;
      }
      ambianceRef.current.play().catch(() => {});
    } else {
      if (ambianceRef.current) {
        ambianceRef.current.pause();
      }
    }

    // Cleanup on unmount
    return () => {
      if (ambianceRef.current && phase !== 'arena') {
        ambianceRef.current.pause();
        ambianceRef.current = null;
      }
    };
  }, [phase, isPaused]);

  // Random SFX events — occasional cough, sneeze, or paper from a random juror
  useEffect(() => {
    if (phase !== 'arena' || isPaused) return;

    const SFX_POOL: { file: string; emoji: string }[] = [
      { file: '/sounds/cough.mp3', emoji: '😷' },
      { file: '/sounds/sneeze.mp3', emoji: '🤧' },
      { file: '/sounds/writing.mp3', emoji: '✍️' },
      { file: '/sounds/typing.mp3', emoji: '💻' },
      { file: '/sounds/chair.mp3', emoji: '🪑' },
    ];
    const JUROR_KEYS: ActiveSpeaker[] = ['technical', 'academic', 'business'];

    const interval = setInterval(() => {
      // ~20% chance every 10s
      if (Math.random() > 0.20) return;

      const sfx = SFX_POOL[Math.floor(Math.random() * SFX_POOL.length)];
      // Pick a random juror that is NOT currently the active speaker
      const available = JUROR_KEYS.filter(k => k !== activeSpeaker);
      const juror = available[Math.floor(Math.random() * available.length)];

      // Play the sound
      const audio = new Audio(sfx.file);
      audio.volume = 0.25;
      audio.play().catch(() => {});

      // Show the emoji bubble
      setSfxEvent({ juror, emoji: sfx.emoji });
      setTimeout(() => setSfxEvent(null), 2000);
    }, 10000);

    return () => clearInterval(interval);
  }, [phase, isPaused, activeSpeaker]);

  useEffect(() => {
    // Random number between 12 and 42 for a realistic "live simulations" count
    setLiveSimulations(Math.floor(Math.random() * 31) + 12);
  }, []);

  // Full state reset — returns everything to initial values so user can start a new simulation without reloading
  const resetSimulation = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognition) recognition.stop();
    isClosingRef.current = false;
    isEvaluatingRef.current = false;
    setPhase("config");
    setMessages([]);
    setTranscript(t('common.loading'));
    setLiveCaption('');
    setTimeRemaining(0);
    setIsRecording(false);
    setIsProcessing(false);
    setIsProcessingAudio(false);
    setIsAISpeaking(false);
    setIsEvaluating(false);
    setActiveSpeaker(null);
    setSessionStartTime(0);
    setInitialData(null);
    setEvaluationResults(null);
    setLoadingStep(0);
    setLoadingTickerIndex(0);
    setReportName(null);
    setDeliberationStep(0);
    setShowConfirmModal(false);
    setShowEndConfirmModal(false);
    setIsPaused(false);
    setLastJurySpeaker(null);
    setSilenceSeconds(0);
    setJuryBubbleMessage(null);
    setSfxEvent(null);
    if (ambianceRef.current) {
      ambianceRef.current.pause();
      ambianceRef.current = null;
    }
  };

  // Detect browser on mount
  useEffect(() => {
    const isChromium = !!(window as any).chrome;
    const isEdge = navigator.userAgent.indexOf("Edg") !== -1;
    setIsChrome(isChromium && !isEdge);
  }, []);

  // Handle Keyboard Spacebar for Mic Toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.code === "Space" &&
        phase === "arena" &&
        !isProcessingAudio &&
        !isAISpeaking &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault(); // Prevent page scroll
        handleMicClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, isRecording, isProcessingAudio, isAISpeaking, recognition, messages]);

  // Cycle loading messages — step 0=intro, 1/2/3=jury members, 4=ready to transition
  // Caps at step 3 (last jury card). Step 4 is set by a separate effect once initialData is ready.
  useEffect(() => {
    if (phase === "loading") {
      const interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev >= 3) {
            clearInterval(interval);
            return prev; // Stay at 3 — don't go to 4 yet
          }
          return prev + 1;
        });
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [phase]);

  // Only advance to step 4 (trigger arena transition) when initialData is ready AND all jury cards have been shown
  useEffect(() => {
    if (phase === "loading" && loadingStep === 3 && initialData) {
      // the last jury card is visible for at least 2.5s (matching the interval of previous jurors)
      const timer = setTimeout(() => setLoadingStep(4), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, loadingStep, initialData]);

  // Cycle loading ticker messages
  useEffect(() => {
    if (phase === "loading") {
      setLoadingTickerIndex(0);
      const interval = setInterval(() => {
        setLoadingTickerIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Fetch report name for personalized loading
  useEffect(() => {
    if (phase === "loading" && (reportId || profile?.active_report_id)) {
      const fetchName = async () => {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from('reports')
            .select('name')
            .eq('id', reportId || profile?.active_report_id)
            .single();
          if (data?.name) setReportName(data.name);
        } catch {}
      };
      fetchName();
    }
  }, [phase, reportId, profile?.active_report_id]);

  // Cycle deliberation messages during closing/evaluating
  useEffect(() => {
    if (phase === "closing" && isEvaluating) {
      setDeliberationStep(0);
      const interval = setInterval(() => {
        setDeliberationStep((prev) =>
          prev < DELIBERATION_MESSAGES.length - 1 ? prev + 1 : prev
        );
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [phase, isEvaluating]);

  // Countdown timer for arena (pauses when tab is hidden)
  useEffect(() => {
    if (phase === "arena" && timeRemaining > 0 && !isPaused) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            return 0; // Just set to 0, handle phase change below
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, timeRemaining, isPaused]);

  // Handle timer reaching zero (separate effect to avoid stale closures)
  // Uses closingPhaseRef so the effect always calls the LATEST version of handleClosingPhase
  useEffect(() => {
    if (phase === "arena" && timeRemaining === 0) {
      closingPhaseRef.current();
    }
  }, [timeRemaining, phase]);

  // Tab visibility: pause simulation when user switches tabs or minimizes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden — pause
        setIsPaused(true);
        if (window.speechSynthesis) window.speechSynthesis.pause();
      } else {
        // Tab is visible again — resume
        setIsPaused(false);
        if (window.speechSynthesis) window.speechSynthesis.resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Sync config language when initialLanguage prop changes
  useEffect(() => {
    if (initialLanguage) {
      setConfig(prev => ({
        ...prev,
        language: initialLanguage
      }));
    }
  }, [initialLanguage]);

  // Transition to Arena when ready (step 4 = all jury shown, safe to proceed)
  useEffect(() => {
    if (phase === "loading" && loadingStep === 4 && initialData) {
      const { firstJuryMessage, sessionFirstQuestion, sessionAgentId } = initialData;

      // Start Arena
      setTimeRemaining(config.duration * 60);
      setSessionStartTime(Date.now());
      setPhase("arena");

      // Determine the first dynamic question's speaker
      const AGENT_TO_SPEAKER: Record<number, "technical" | "academic" | "business"> = {
        0: "technical",
        1: "academic",
        2: "business",
      };
      const questionSpeaker = AGENT_TO_SPEAKER[sessionAgentId] || "technical";
      
      // Add the greeting message
      const greetingMessage: TranscriptMessage = {
        speaker: firstJuryMessage.speaker,
        text: firstJuryMessage.text,
        timestamp: 0,
      };
      setMessages([greetingMessage]);
      
      // Start speaking the greeting
      setActiveSpeaker(firstJuryMessage.speaker);
      setIsAISpeaking(true);
      typewriterEffect(firstJuryMessage.text, firstJuryMessage.speaker);
      
      // After greeting finishes, immediately follow with the first dynamic question
      speakWithProfile(firstJuryMessage.text, firstJuryMessage.speaker, () => {
        if (sessionFirstQuestion) {
          // Add the first dynamic question as a distinct message
          const questionMessage: TranscriptMessage = {
            speaker: questionSpeaker,
            text: sessionFirstQuestion,
            timestamp: Date.now() - (config.duration * 60 * 1000),
          };
          setMessages(prev => [...prev, questionMessage]);

          // Speak the first question
          setActiveSpeaker(questionSpeaker);
          setIsAISpeaking(true);
          typewriterEffect(sessionFirstQuestion, questionSpeaker);

          speakWithProfile(sessionFirstQuestion, questionSpeaker, () => {
            setIsAISpeaking(false);
            setActiveSpeaker(null);
          });
        } else {
          setIsAISpeaking(false);
          setActiveSpeaker(null);
        }
      });
      
      // Clear initial data to prevent re-triggering
      setInitialData(null);
    }
  }, [phase, loadingStep, initialData, config.duration, config.language]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = config.language === 'french' ? 'fr-FR' : 'en-US';
        
        recog.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setLiveCaption(prev => prev + ' ' + finalTranscript);
          } else {
            // Preview current sentence
            setTranscript(interimTranscript);
          }
        };

        recog.onend = () => {
          setIsRecording(false);
          setActiveSpeaker(null);
        };

        recog.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
          setActiveSpeaker(null);
        };
        
        setRecognition(recog);
      }
    }
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  




  const handleInitialize = async () => {
    if (!profile || profile.credits < 8) {
      alert("Insufficient credits to start a simulation.");
      return;
    }

    setIsProcessing(true);

    try {
      setPhase("loading");

      const finalReportId = reportId || profile?.active_report_id;
      
      if (!finalReportId) {
        throw new Error("No active report selected. Please upload or select a report first.");
      }

      console.log("🚀 Initializing Simulation for ID:", finalReportId);

      // Step 1: Generate skeleton + first jury greeting
      const response = await fetch("/api/simulation/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: finalReportId,
          selectedLanguage: config.language,
          difficulty: config.difficulty,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Initialize API Error:", errData);
        throw new Error(errData.error || `Simulation initialization failed (${response.status})`);
      }

      const data = await response.json();

      // Step 2: Create the live session (question bank, session state, credit deduction)
      const sessionRes = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: finalReportId,
          durationMinutes: config.duration,
          difficulty: config.difficulty,
        }),
      });

      if (!sessionRes.ok) {
        const errData = await sessionRes.json().catch(() => ({}));
        console.error("Session Start Error:", errData);
        throw new Error(errData.error || `Session creation failed (${sessionRes.status})`);
      }

      const sessionData = await sessionRes.json();
      console.log("✅ Live session created:", sessionData.sessionId);

      await refreshProfile();
      // Merge session data (firstQuestion, agentId) into initialData so the transition effect can use it
      setInitialData({
        ...data,
        sessionFirstQuestion: sessionData.firstQuestion,
        sessionAgentId: sessionData.agentId,
      });
    } catch (error) {
      console.error("Failed to initialize simulation:", error);
      alert("Failed to start simulation. Please try again.");
      setPhase("config");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper: speak text with jury-specific voice profile
  // Each juror gets a truly DISTINCT voice + language matching
  const speakWithProfile = (text: string, speaker: string, onDone?: () => void) => {
    let isDone = false;
    
    const finish = () => {
      if (!isDone) {
        isDone = true;
        if (onDone) onDone();
      }
    };

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const isFrench = config.language === 'french';
      utterance.lang = isFrench ? 'fr-FR' : 'en-US';

      // Load available voices
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        // Filter voices that match the selected language
        const langMatched = voices.filter(v => 
          v.lang.startsWith(isFrench ? 'fr' : 'en')
        );
        const pool = langMatched.length > 0 ? langMatched : voices;

        // Keywords to find female voices (for Souad)
        const femaleKeywords = ['female', 'woman', 'zira', 'fiona', 'hazel', 'susan', 'amélie', 'hortense', 'denise', 'virginie', 'marie', 'céline', 'caroline', 'google uk english female', 'samantha', 'karen', 'moira', 'tessa', 'victoria', 'sara'];
        // Keywords to find male voices
        const maleKeywords = ['male', 'man', 'david', 'mark', 'paul', 'thomas', 'daniel', 'james', 'george', 'google uk english male', 'alex', 'fred', 'tom', 'jacques', 'henri', 'nicolas', 'philippe'];
        
        const findVoice = (keywords: string[], exclude?: SpeechSynthesisVoice | null): SpeechSynthesisVoice | null => {
          for (const kw of keywords) {
            const match = pool.find(v => 
              v.name.toLowerCase().includes(kw) && v !== exclude
            );
            if (match) return match;
          }
          return null;
        };

        let selectedVoice: SpeechSynthesisVoice | null = null;

        if (speaker === "academic") {
          // Souad: female voice
          selectedVoice = findVoice(femaleKeywords);
          if (!selectedVoice) {
            // fallback: pick the last voice in pool (often different from default)
            selectedVoice = pool[pool.length - 1];
          }
        } else if (speaker === "technical") {
          // Malek: first male voice found
          selectedVoice = findVoice(maleKeywords);
          if (!selectedVoice) {
            selectedVoice = pool[0]; // first available
          }
        } else if (speaker === "business") {
          // Amir: second distinct male voice, different from Malek's
          const malekVoice = findVoice(maleKeywords);
          selectedVoice = findVoice(maleKeywords, malekVoice);
          if (!selectedVoice && pool.length > 1) {
            // Just pick a different voice from pool
            selectedVoice = pool[1] !== malekVoice ? pool[1] : pool[Math.min(2, pool.length - 1)];
          }
          if (!selectedVoice) {
            selectedVoice = pool[0];
          }
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      const profile = VOICE_PROFILES[speaker] || { pitch: 1.0, rate: 1.0 };
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;

      // Chrome Speech API bug workaround: Calculate rough duration + buffer
      // Average speaking rate is ~150 words per minute (2.5 words/sec). 
      // rate = 1 is baseline.
      const wordCount = text.split(/\s+/).length;
      const estimatedDurationMs = (wordCount / 2.5) * 1000 / utterance.rate;
      const safetyTimeoutMs = estimatedDurationMs + 5000; // Add 5 seconds buffer

      const safetyTimer = setTimeout(() => {
        console.warn("SpeechSynthesis onend failed to fire. Using safety fallback.");
        finish();
      }, safetyTimeoutMs);

      utterance.onend = () => {
        clearTimeout(safetyTimer);
        finish();
      };
      
      utterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e);
        clearTimeout(safetyTimer);
        finish();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback delay if no API
      const delay = text.split(/\s+/).length * 300;
      setTimeout(finish, delay);
    }
  };

  // Helper: play a simple synthesized beep for closing
  const playBeep = (frequency: number = 440, durationMs: number = 150) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + durationMs / 1000);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), durationMs);
    } catch (e) {
      console.error("Audio Context not supported or failed", e);
    }
  };

  // Closing phase: Static farewell remark, plays sounds, then evaluates
  const handleClosingPhase = async () => {
    // Guard against double-invocation from rapid timer ticks
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // Stop any recording
    if (recognition) recognition.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsRecording(false);
    setActiveSpeaker(null);

    setPhase("closing");
    setTranscript(''); // Clear stale transcript so old text doesn't show in closing view

    // Play an alert chime (two quick notes) to signify the end of the simulation
    playBeep(660, 150);
    setTimeout(() => playBeep(880, 200), 200);

    // Speak farewell (fire-and-forget — evaluation is NOT dependent on this callback)
    setTimeout(() => {
      const closingText = config.language === 'french'
        ? "Le temps est écoulé. Merci pour votre présentation, le jury va maintenant délibérer."
        : "Time is up. Thank you for your defense, the jury will now deliberate.";
      const closingSpeaker = "academic";

      // Display and speak the closing remark
      setActiveSpeaker(closingSpeaker as ActiveSpeaker);
      setIsAISpeaking(true);
      setTranscript(closingText);

      speakWithProfile(closingText, closingSpeaker, () => {
        setIsAISpeaking(false);
        setActiveSpeaker(null);
      });
    }, 600);

    // Fire evaluation after a fixed delay (enough for farewell to display)
    // This is decoupled from the speech callback to prevent silent failures
    setTimeout(() => runEvaluation(), 4000);
  };

  // Always keep closingPhaseRef pointing to the latest handleClosingPhase
  closingPhaseRef.current = handleClosingPhase;

  // Run the evaluation (called after closing remarks)
  const runEvaluation = async () => {
    // Guard against double-evaluation
    if (isEvaluatingRef.current) return;
    isEvaluatingRef.current = true;

    setIsEvaluating(true);
    try {
      const response = await fetch("/api/simulation/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: messagesRef.current,
          report_id: reportId || profile?.active_report_id,
          config: {
            difficulty: config.difficulty,
            language: config.language,
            durationMinutes: config.duration,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Evaluation API Error:", response.status, errorText);
        throw new Error(`Evaluation failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setEvaluationResults(data);
      setPhase("aftermath");
    } catch (error) {
      console.error("Failed to evaluate simulation:", error);
      alert(config.language === 'french'
        ? "\u00c9chec du traitement des r\u00e9sultats. Veuillez r\u00e9essayer."
        : "Failed to process simulation results. Please try again.");
      resetSimulation();
    } finally {
      setIsEvaluating(false);
    }
  };

  // Aftermath: trigger tab switch to AftermathDashboard via proper useEffect (not IIFE in JSX)
  useEffect(() => {
    if (phase === 'aftermath' && evaluationResults?.simulation_id && onSimulationComplete) {
      const timer = setTimeout(() => {
        onSimulationComplete(evaluationResults.simulation_id);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [phase, evaluationResults]);

  // Manual end session button — shows confirmation modal first
  const handleEndSession = () => {
    if (messages.length === 0) {
      alert(config.language === 'french' 
        ? "Aucune conversation enregistrée. Veuillez réessayer."
        : "No conversation recorded. Please try again.");
      resetSimulation();
      return;
    }
    setShowEndConfirmModal(true);
  };

  const confirmEndSession = () => {
    setShowEndConfirmModal(false);
    handleClosingPhase();
  };

  // Typewriter effect for jury responses (synchronized with speaking rate)
  const typewriterEffect = (text: string, speakerProfKey?: string) => {
    const words = text.split(' ');
    let displayed = '';
    let index = 0;
    
    // Calculate ms per word based on standard WPM (150 words per minute default) and the speaker's rate multiplier
    const profile = speakerProfKey && VOICE_PROFILES[speakerProfKey] ? VOICE_PROFILES[speakerProfKey] : { rate: 1.0 };
    // 150 WPM = 2.5 words per second = 1 word every 400ms.
    // However, Web Speech API 'rate' of 1.0 is generally faster (close to 200 WPM). 
    // We adjust it dynamically to match normal UI reading speed vs audio.
    const baseWPM = 180; 
    const wordsPerSecond = (baseWPM * profile.rate) / 60;
    const msPerWord = Math.floor(1000 / wordsPerSecond);
    
    const interval = setInterval(() => {
      if (index >= words.length) {
        clearInterval(interval);
        return;
      }
      displayed += (index > 0 ? ' ' : '') + words[index];
      setTranscript(displayed);
      index++;
    }, msPerWord); 
  };
  
  // Handle AI jury response
  const handleAIResponse = async (studentText: string) => {
    setIsProcessingAudio(true);
    
    try {
      // Call AI chat endpoint
      const response = await fetch('/api/simulation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_message: studentText,
          language: config.language,
          difficulty: config.difficulty,
          conversation_history: messages,
          report_id: reportId || profile?.active_report_id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI response failed');
      }
      
      const data = await response.json();
      const juryResponse = data.jury_response;
      const speaker = data.speaker as ActiveSpeaker;
      
      // Add jury message to history
      const juryMessage: TranscriptMessage = {
        speaker: speaker as any,
        text: juryResponse,
        timestamp: Date.now() - sessionStartTime,
      };
      setMessages((prev) => [...prev, juryMessage]);
      
      // Random thinking time (1.5s to 3.5s) for realism
      const thinkingDelay = Math.floor(Math.random() * 2000) + 1500;
      
      // We are processing audio, so thinking UI will show
      setIsProcessingAudio(true);
      setActiveSpeaker(speaker); // Set early so they show as "thinking"
      
      setTimeout(() => {
        setIsProcessingAudio(false);
        setIsAISpeaking(true);
        
        // Start typewriter effect for visual feedback, synced with speaker
        typewriterEffect(juryResponse, speaker as string);
        
        // Speak with voice profile
        speakWithProfile(juryResponse, speaker as string, () => {
          setIsAISpeaking(false);
          setActiveSpeaker(null);
          playSoundEffect('chime'); // Signal it's the user's turn
        });
      }, thinkingDelay);
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      alert('Failed to get jury response. Please try again.');
      setIsAISpeaking(false);
      setActiveSpeaker(null);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleMicClick = async () => {
    console.log("🎤 Mic clicked, isRecording:", isRecording);
    
    if (isRecording) {
      // Stop recording manually
      console.log("⏹️ Stopping recording...");
      playSoundEffect('click');
      setIsRecording(false);
      setActiveSpeaker(null);
      
      if (isChrome && recognition) {
        recognition.stop();
        // The actual submission will happen in a useEffect monitoring isRecording or similar,
        // but to keep it simple and immediate, we can just grab what we have.
        // To ensure we get the last bit, we'll wait a tiny bit for the final onresult.
        setTimeout(async () => {
          const text = liveCaption.trim();
          if (text.length > 0) {
            // Add student message to history
            const studentMessage: TranscriptMessage = {
              speaker: 'student',
              text: text,
              timestamp: Date.now() - sessionStartTime,
            };
            setMessages((prev) => [...prev, studentMessage]);
            setTranscript(`You: ${text}`);
            await handleAIResponse(text);
          } else {
            setTranscript("No speech detected. Please try again.");
          }
        }, 300);
      } else if (!isChrome && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        // The onstop handler will take care of processing
      }
    } else {
      // Start recording
      console.log("▶️ Starting recording...");
      
      try {
        playSoundEffect('pop');
        setTranscript('Listening...');
        setLiveCaption('');
        setIsRecording(true);
        setActiveSpeaker('student');

        // Set session start time on first recording
        if (messages.length === 0) {
          setSessionStartTime(Date.now());
        }

        if (isChrome && recognition) {
          recognition.lang = config.language === 'french' ? 'fr-FR' : 'en-US';
          recognition.start();
        } else if (!isChrome) {
          // Fallback: Use MediaRecorder
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            setTranscript('Transcribing audio...');
            setIsProcessingAudio(true);
            
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'record.webm');
            formData.append('language', config.language);

            try {
              const res = await fetch('/api/simulation/transcribe', {
                method: 'POST',
                body: formData,
              });
              
              if (!res.ok) throw new Error('Transcription failed');
              const data = await res.json();
              const text = data.text?.trim();

              if (text && text.length > 0) {
                const studentMessage: TranscriptMessage = {
                  speaker: 'student',
                  text: text,
                  timestamp: Date.now() - sessionStartTime,
                };
                setMessages((prev) => [...prev, studentMessage]);
                setTranscript(`You: ${text}`);
                await handleAIResponse(text);
              } else {
                 setTranscript("No speech detected. Please try again.");
              }
            } catch (error) {
              console.error("Transcription error:", error);
              alert("Failed to transcribe audio. Please try again.");
              setTranscript("Transcription failed.");
            } finally {
              setIsProcessingAudio(false);
              // Stop all audio tracks
              stream.getTracks().forEach(track => track.stop());
            }
          };

          mediaRecorder.start();
        } else {
            alert("Speech recognition is not supported in this browser.");
            setIsRecording(false);
            setActiveSpeaker(null);
        }
      } catch (error) {
        console.error("❌ Failed to start recording:", error);
        alert("Microphone access required or Recognition error.");
        setIsRecording(false);
        setActiveSpeaker(null);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const JURY_MEMBERS = [
    {
      name: "Malek",
      title: t('simulation.jury_title_technical'),
      subtitle: t('simulation.jury_subtitle_technical'),
      bgColor: "bg-cyan-100",
      imagePath: "/jury/technical-expert.png",
    },
    {
      name: "Souad",
      title: t('simulation.jury_title_academic'),
      subtitle: t('simulation.jury_subtitle_academic'),
      bgColor: "bg-purple-100",
      imagePath: "/jury/strict-academic.png",
    },
    {
      name: "Amir",
      title: t('simulation.jury_title_business'),
      subtitle: t('simulation.jury_subtitle_business'),
      bgColor: "bg-amber-100",
      imagePath: "/jury/business-strategist.png",
    },
  ];

  const DELIBERATION_MESSAGES = [
    t('simulation.deliberation_1'),
    t('simulation.deliberation_2'),
    t('simulation.deliberation_3'),
    t('simulation.deliberation_4'),
  ];

  const DIFFICULTY_CARDS = DIFFICULTY_CARD_META.map(card => ({
    ...card,
    title: t(card.titleKey),
    description: t(card.descKey),
  }));

  // Helper function to handle the actual initialization after confirmation
  const confirmAndInitialize = () => {
    setShowConfirmModal(false);
    handleInitialize();
  };

  return (
    <div className="w-full h-full relative">
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="fixed inset-0 bg-black/50 z-[9999] backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-md pointer-events-auto p-6 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-yellow-50 ring-1 ring-yellow-200 flex items-center justify-center mb-4 shadow-sm">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {t('simulation.start_simulation_confirm')}
                </h2>
                
                <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                  {t('simulation.credit_deduction_notice', { credits: '30' })}
                </p>

                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={confirmAndInitialize}
                    className="flex-1 py-3 px-4 bg-gray-900 rounded-xl text-white font-medium hover:bg-gray-800 shadow-sm transition-colors"
                  >
                    {t('simulation.confirm_start')}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* PHASE 1: Configuration Form */}
        {phase === "config" && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full p-6 flex items-center justify-center relative"
          >
            <div className="max-w-3xl w-full">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-2xl md:text-3xl font-semibold font-serif text-gray-900 tracking-tight">
                    {t('simulation.setup')}
                  </h2>
                  {liveSimulations > 0 && (
                    <div className="flex items-center shrink-0 gap-2 px-3 py-1.5 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] md:text-xs font-bold uppercase tracking-widest text-black">
                      <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                      {liveSimulations} {t('simulation.active_simulations')}
                    </div>
                  )}
                </div>
                <p className="text-gray-500 text-sm">{t('simulation.setup_subtitle')}</p>
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="flex flex-col h-full space-y-6">
                  {/* Language Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                      {t('simulation.report_language')}
                    </label>
                    <div className="flex gap-3">
                      {["french", "english"].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setConfig({ ...config, language: lang as Language })}
                          className={`flex-1 py-3 px-4 border rounded-xl transition-all text-sm font-medium shadow-sm ${
                            config.language === lang
                              ? "bg-gray-900 text-white border-gray-900 ring-1 ring-gray-900"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          {lang === 'french' ? t('simulation.lang_french') : t('simulation.lang_english')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Selection */}
                  <div className="flex flex-col flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                      {t('simulation.duration')}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[5, 15, 30].map((duration) => (
                        <button
                          key={duration}
                          onClick={() => setConfig({ ...config, duration })}
                          className={`py-3 px-2 border rounded-xl shadow-sm transition-all font-medium text-sm text-center ${
                            config.duration === duration
                              ? "bg-gray-900 text-white border-gray-900 ring-1 ring-gray-900"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          {duration === 60 ? "60 min" : `${duration} min`}
                        </button>
                      ))}
                    </div>
                    
                    <div className="mt-4 flex-1 flex items-center justify-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-200 shadow-sm text-gray-600">
                      <Chrome className="w-4 h-4 shrink-0 text-gray-900" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider">
                        {t('simulation.chrome_optimized')}
                      </span>
                    </div>
                  </div>


                </div>

                {/* Right Column - Difficulty */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                    {t('simulation.difficulty')}
                  </label>
                  <div className="space-y-3">
                    {DIFFICULTY_CARDS.map((diff) => {
                      const Icon = diff.icon;
                      const isSelected = config.difficulty === diff.id;
                      const highestScore = profile?.memory?.highest_score || 0;
                      const isHostileLocked = diff.id === 'hostile' && highestScore < 14;
                      
                      return (
                        <button
                          key={diff.id}
                          onClick={() => !isHostileLocked && setConfig({ ...config, difficulty: diff.id })}
                          disabled={isHostileLocked}
                          className={`w-full p-4 border rounded-2xl text-left transition-all flex items-start gap-4 ${
                            isHostileLocked
                              ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? `border-gray-900 ring-1 ring-gray-900 bg-gray-50/50 shadow-md ${diff.bgAccent}`
                                : `bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300`
                          }`}
                        >
                          <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white ring-1 ring-gray-200 shadow-sm ${isSelected && !isHostileLocked ? diff.color : 'text-gray-600'}`}>
                            {isHostileLocked ? <Lock className="w-5 h-5 text-gray-400" /> : <Icon className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className={`font-semibold text-sm mb-1 ${isHostileLocked ? 'text-gray-400' : isSelected ? diff.color : 'text-gray-900'}`}>
                              {diff.title}
                              {isHostileLocked && <span className="ml-2 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{t('simulation.score_unlock')}</span>}
                            </div>
                            <div className="text-xs text-gray-500 leading-relaxed">
                              {diff.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Initialize Button */}
              <div className="mt-8 pt-6">
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isProcessing || !profile || profile.credits < 30}
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-medium shadow-md hover:bg-gray-800 hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 group relative overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-3 relative z-10">
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t('common.loading')}</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-lg">{t('simulation.start_simulation')}</span>
                        <span className="flex items-center gap-1.5 bg-white/10 text-white px-3 py-1 text-xs font-semibold rounded-full shadow-inner group-hover:bg-white/20 transition-colors">
                          30
                          <NextImage 
                            src="/images/favicon.jpeg" 
                            alt="Latexo" 
                            width={14} 
                            height={14} 
                            className="rounded-full grayscale brightness-200"
                          />
                        </span>
                      </>
                    )}
                  </div>
                </button>

                <div className="mt-4 flex items-center justify-center text-xs font-mono text-gray-500 uppercase tracking-widest">
                  {profile && profile.credits >= 30 ? (
                    <div className="flex items-center gap-2">
                       <span>{t('simulation.estimated_balance')}</span>
                       <span className="text-black font-bold">{profile.credits - 30}</span>
                       <span>{t('simulation.credits_remaining')}</span>
                    </div>
                  ) : profile ? (
                    <p className="text-red-600 font-bold border-b border-red-600">
                      {t('simulation.insufficient_credits', { credits: profile.credits })}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PHASE 2: "Meet the Jury" Loading Screen */}
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center justify-center bg-white relative"
            style={{
              backgroundImage: "radial-gradient(#E5E5E5 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* Thesis filename — personalized banner */}
            {reportName && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2 border border-gray-300 bg-white/80 backdrop-blur-sm"
              >
                <span className="text-[10px] uppercase tracking-widest text-gray-400 mr-2">
                  {t('simulation.preparing_defense')}
                </span>
                <span className="text-xs font-bold text-gray-800 font-mono">{reportName}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {loadingStep === 0 && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-black text-white px-8 py-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]"
                >
                  <p className="text-xl font-bold font-mono uppercase tracking-wider">
                    {t('simulation.initializing')}
                  </p>
                </motion.div>
              )}

              {loadingStep > 0 && loadingStep <= 3 && (
                <motion.div
                  key={`jury-${loadingStep}`}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="flex flex-col items-center gap-6 max-w-2xl text-center"
                >
                  {/* Avatar Circle */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.1 }}
                    className={`w-48 h-48 rounded-full ${JURY_MEMBERS[loadingStep - 1].bgColor} border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden`}
                  >
                    <img
                      src={JURY_MEMBERS[loadingStep - 1].imagePath}
                      alt={JURY_MEMBERS[loadingStep - 1].name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-6xl font-bold text-black">${JURY_MEMBERS[loadingStep - 1].name[0]}</span>`;
                      }}
                    />
                  </motion.div>

                  {/* Title — typewriter character-by-character reveal */}
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold uppercase tracking-wider border-b-4 border-black pb-2 inline-block"
                  >
                    {(() => {
                      const title = loadingStep === 1
                        ? t('simulation.jury_title_technical')
                        : loadingStep === 2
                        ? t('simulation.jury_title_academic')
                        : t('simulation.jury_title_business');
                      return String(title).split('').map((char: string, i: number) => (
                        <motion.span
                          key={`${loadingStep}-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.03, duration: 0.15 }}
                        >
                          {char}
                        </motion.span>
                      ));
                    })()}
                  </motion.h2>

                  {/* Subtitle */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-700 text-lg max-w-xl"
                  >
                    {JURY_MEMBERS[loadingStep - 1].subtitle}
                  </motion.p>

                  {/* Progress Indicator */}
                  <div className="flex gap-2 mt-4">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`w-12 h-1 ${
                          step <= loadingStep ? "bg-black" : "bg-gray-300"
                        } transition-colors duration-300`}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Skip Intro button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={() => setLoadingStep(2)}
              className="absolute bottom-6 right-6 text-[10px] uppercase tracking-widest text-gray-400 hover:text-black border border-gray-300 hover:border-black px-3 py-1.5 transition-colors"
            >
              {t('simulation.skip_intro')}
            </motion.button>
          </motion.div>
        )}

        {/* PHASE 3: Live Arena */}
        {phase === "arena" && (
          <motion.div
            key="arena"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col relative"
          >
            {/* Paused Overlay */}
            <AnimatePresence>
              {isPaused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4"
                >
                  <div className="bg-white border-4 border-black px-8 py-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-2xl font-black font-mono uppercase tracking-wider">
                      {t('simulation.paused')}
                    </p>
                  </div>
                  <p className="text-white text-xs uppercase tracking-widest">
                    {t('simulation.paused_subtitle')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Top Bar - Centered Timer */}
            <div className="border-b border-black py-4 px-6 flex items-center justify-center">
              <div className="text-center">
                <motion.div 
                  className={`text-4xl font-mono font-bold ${
                    timeRemaining <= 60 
                      ? "text-red-500" 
                      : timeRemaining <= 180 
                        ? "text-orange-500" 
                        : "text-black"
                  }`}
                  animate={timeRemaining <= 60 ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                  transition={timeRemaining <= 60 ? { repeat: Infinity, duration: 1, ease: "easeInOut" } : {}}
                >
                  {formatTime(timeRemaining)}
                </motion.div>
                <div className="text-xs uppercase tracking-widest text-gray-600 mt-1">{t('simulation.time_remaining')}</div>
              </div>
            </div>

            {/* Center - Jury Panel with Talking Avatars */}
            <div className="flex-1 flex items-center justify-center gap-8 md:gap-16 p-8">
              {JURY_MEMBERS.map((member, index) => {
                const speakerKey: ActiveSpeaker = index === 0 ? 'technical' : index === 1 ? 'academic' : 'business';
                const isThisJurorSpeaking = activeSpeaker === speakerKey;
                const isAnyoneSpeaking = isAISpeaking || isRecording || isProcessingAudio;
                const showBubbleHere = juryBubbleMessage && lastJurySpeaker === speakerKey;
                const showSfxHere = sfxEvent && sfxEvent.juror === speakerKey;
                
                return (
                  <div key={member.name} className="relative flex flex-col items-center">
                    {/* SFX emoji bubble (independent of silence bubble) */}
                    <AnimatePresence>
                      {showSfxHere && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          className="absolute -top-20 left-1/2 -translate-x-1/2 z-20"
                        >
                          <div className="bg-white border-2 border-black rounded-full w-10 h-10 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-lg">
                            {sfxEvent!.emoji}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Silence nudge bubble */}
                    <AnimatePresence>
                      {showBubbleHere && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="absolute -top-14 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap"
                        >
                          <div className="bg-black text-white text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-md shadow-lg">
                            {juryBubbleMessage}
                          </div>
                          {/* Tail */}
                          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-black rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <TalkingAvatar
                      name={member.name}
                      imagePath={member.imagePath}
                      bgColor={member.bgColor}
                      isSpeaking={isThisJurorSpeaking && isAISpeaking}
                      isThinking={isThisJurorSpeaking && isProcessingAudio}
                      isInactive={isAnyoneSpeaking && !isThisJurorSpeaking}
                      size="large"
                    />
                  </div>
                );
              })}
            </div>

            {/* Bottom - Voice Interface */}
            <div className="border-t border-black p-6 flex flex-col items-center gap-6">
            
              {/* Turn Indicator / Status Banner */}
              <div className="h-6 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isProcessingAudio ? (
                    <motion.div
                      key="thinking"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs font-bold uppercase tracking-widest text-yellow-600 flex items-center gap-2"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('simulation.jury_thinking')}
                    </motion.div>
                  ) : isAISpeaking ? (
                     <motion.div
                      key="speaking"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs font-bold uppercase tracking-widest text-blue-600"
                    >
                      {t('simulation.juror_speaking')}
                    </motion.div>
                  ) : isRecording ? (
                     <motion.div
                      key="recording"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      {t('simulation.recording')}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="waiting"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs font-bold uppercase tracking-widest text-gray-500"
                    >
                      {t('simulation.your_turn')} <span className="text-black bg-gray-200 px-1 py-0.5 rounded shadow-sm mx-1">{t('simulation.space_key')}</span> {t('simulation.your_turn_suffix')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Microphone Button */}
              <div className="flex flex-col items-center gap-4">
                <MicrophoneButton
                  isRecording={isRecording}
                  isProcessing={isProcessingAudio || isAISpeaking}
                  onClick={handleMicClick}
                />
                
                {/* Waveform (appears when student is speaking) */}
                {activeSpeaker === "student" && (
                  <VoiceWaveform isActive={isRecording} />
                )}
                
                {/* Live student caption (appears while recording) */}
                {isRecording && liveCaption && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-300 bg-white p-3 text-sm max-w-2xl w-full"
                  >
                    <span className="font-semibold">{t('simulation.student_label')}: </span>
                    <span className="text-gray-700">{liveCaption}</span>
                  </motion.div>
                )}
              </div>

              {/* Transcription Box */}
              <div className="w-full max-w-2xl border border-gray-300 p-4 text-sm text-gray-700 min-h-[80px] flex items-center justify-start">
                {transcript}
              </div>
              


              {/* End Session Button */}
              <button
                onClick={handleEndSession}
                disabled={isEvaluating}
                className="text-sm uppercase tracking-widest text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEvaluating ? t('simulation.evaluating') : t('simulation.end_session')}
              </button>
            </div>

            {/* End Session Confirmation Modal */}
            <AnimatePresence>
              {showEndConfirmModal && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowEndConfirmModal(false)}
                    className="fixed inset-0 bg-black/50 z-[9999] backdrop-blur-sm"
                  />
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md pointer-events-auto p-6 flex flex-col items-center text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-black flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      </div>
                      
                      <h2 className="text-xl font-bold font-mono uppercase tracking-wider mb-2">
                        {t('simulation.end_session_confirm')}
                      </h2>
                      
                      <p className="text-gray-600 text-sm mb-6">
                        {t('simulation.end_session_description')}
                      </p>

                      <div className="flex gap-4 w-full">
                        <button
                          onClick={() => setShowEndConfirmModal(false)}
                          className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 font-bold uppercase tracking-widest hover:border-black hover:text-black transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={confirmEndSession}
                          className="flex-1 py-3 px-4 bg-red-600 text-white font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
                        >
                          {t('simulation.end_now')}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* PHASE 3.5: Closing — Jury farewell before evaluation */}
        {phase === "closing" && (
          <motion.div
            key="closing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center justify-center gap-8"
            style={{
              backgroundImage: "radial-gradient(#E5E5E5 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* All 3 Jury Avatars — active speaker highlighted */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end justify-center gap-6 md:gap-10"
            >
              {JURY_MEMBERS.map((member, index) => {
                const speakerKey = index === 0 ? 'technical' : index === 1 ? 'academic' : 'business';
                const isActive = activeSpeaker === speakerKey;
                return (
                  <motion.div
                    key={member.name}
                    animate={{
                      scale: isActive ? 1.1 : 0.85,
                      opacity: isActive ? 1 : 0.45,
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={`${isActive ? 'w-28 h-28' : 'w-20 h-20'} rounded-full ${member.bgColor} border-4 ${isActive ? 'border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]' : 'border-gray-300'} flex items-center justify-center overflow-hidden transition-all duration-300`}>
                      <img
                        src={member.imagePath}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest ${isActive ? 'text-black font-bold' : 'text-gray-400'}`}>
                      {member.name}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Closing Remark */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-xl text-center px-8"
            >
              <p className="text-lg text-gray-800 italic">&quot;{transcript}&quot;</p>
            </motion.div>

            {/* Session Stats */}
            {sessionStartTime > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-6 text-[11px] uppercase tracking-widest text-gray-400"
              >
                <span>
                  {t('simulation.duration_label')} {Math.floor((Date.now() - sessionStartTime) / 60000)} min
                </span>
                <span className="w-px h-3 bg-gray-300" />
                <span>
                  {messages.length} {messages.length !== 1 ? t('simulation.exchanges') : t('simulation.exchange')}
                </span>
              </motion.div>
            )}

            {/* Deliberation progress — multi-step messages */}
            {isEvaluating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center gap-4 max-w-sm w-full"
              >
                {/* Progress bar */}
                <div className="w-full h-1 bg-gray-200 border border-gray-300 overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${((deliberationStep + 1) / DELIBERATION_MESSAGES.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-black"
                  />
                </div>
                {/* Cycling message */}
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={deliberationStep}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="text-xs uppercase tracking-widest text-gray-500 font-mono"
                    >
                      {DELIBERATION_MESSAGES[deliberationStep]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* PHASE 4: Aftermath — Evaluation Results */}
        {phase === "aftermath" && evaluationResults && (
           <motion.div
             key="aftermath"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="w-full h-full p-6 flex items-center justify-center flex-col gap-4"
           >
             <Loader2 className="w-8 h-8 animate-spin text-black" />
             <div className="text-xl font-bold font-mono uppercase tracking-widest text-black">
               {t('simulation.results_title') || 'Redirecting to your Results...'}
             </div>
             
             {/* Tab switch is now handled by the useEffect above — no IIFE side-effects */}
             
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
