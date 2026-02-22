"use client";

import { useState, useEffect } from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/context/user-context";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

import { TalkingAvatar } from "@/components/dashboard/TalkingAvatar";
import { VoiceWaveform } from "@/components/dashboard/VoiceWaveform";
import { StressMeter } from "@/components/dashboard/StressMeter";
import { MicrophoneButton } from "@/components/dashboard/MicrophoneButton";
import { AudioRecorder, playAudioBase64, transcribeAudio } from "@/lib/voice/audioRecorder";

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
  "Indexing technical stack (RAG)...",
  "Briefing the Jury members...",
  "Identifying 4 methodological vulnerabilities...",
];

const DIFFICULTY_CARDS = [
  {
    id: "gentle" as Difficulty,
    title: "Gentle",
    description: "Supportive, focuses on clarity",
  },
  {
    id: "standard" as Difficulty,
    title: "Standard",
    description: "Professional, realistic academic standards",
  },
  {
    id: "hostile" as Difficulty,
    title: "Hostile (Grilleur)",
    description: "Aggressive, looks for contradictions",
  },
];

// Distinct voice profiles for each jury member
const VOICE_PROFILES: Record<string, { pitch: number; rate: number }> = {
  technical: { pitch: 0.85, rate: 0.9 },   // Malek — deep, deliberate
  academic: { pitch: 1.15, rate: 1.0 },     // Souad — higher, measured
  business: { pitch: 1.0, rate: 1.05 },     // Amir — mid-range, energetic
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
  const [stressLevel, setStressLevel] = useState(0);
  const [transcript, setTranscript] = useState(t('common.loading'));
  
  // Transcript tracking for evaluation
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Voice state (Native Browser APIs)
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [liveCaption, setLiveCaption] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [evaluationResults, setEvaluationResults] = useState<any>(null);

  // Cycle loading messages
  useEffect(() => {
    if (phase === "loading") {
      const interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev >= 3) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [phase]);

  // Countdown timer for arena
  useEffect(() => {
    if (phase === "arena" && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Timer ended — go to closing phase, not direct evaluation
            handleClosingPhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, timeRemaining]);

  // Stress level increment effect
  useEffect(() => {
    if (phase === "arena" && stressLevel < 100) {
      const interval = setInterval(() => {
        setStressLevel((prev) => Math.min(prev + 1, 100));
      }, 3000); // Increase by 1% every 3 seconds
      return () => clearInterval(interval);
    }
  }, [phase, stressLevel]);

  // Sync config language when initialLanguage prop changes
  useEffect(() => {
    if (initialLanguage) {
      setConfig(prev => ({
        ...prev,
        language: initialLanguage
      }));
    }
  }, [initialLanguage]);

  // Transition to Arena when ready
  useEffect(() => {
    if (phase === "loading" && loadingStep === 3 && initialData) {
      const { firstJuryMessage } = initialData;

      // Start Arena
      setTimeRemaining(config.duration * 60);
      setSessionStartTime(Date.now());
      setPhase("arena");
      
      // Add first message
      const initialMessage: TranscriptMessage = {
        speaker: firstJuryMessage.speaker,
        text: firstJuryMessage.text,
        timestamp: 0,
      };
      setMessages([initialMessage]);
      
      // Start speaking immediately
      setActiveSpeaker(firstJuryMessage.speaker);
      setIsAISpeaking(true);
      typewriterEffect(firstJuryMessage.text);
      
      // Speak with voice profile
      speakWithProfile(firstJuryMessage.text, firstJuryMessage.speaker, () => {
        setIsAISpeaking(false);
        setActiveSpeaker(null);
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
    if (!profile || profile.credits < 30) {
      alert("Insufficient credits. You need 30 credits to start a simulation.");
      return;
    }

    setIsProcessing(true);

    try {
      // Deduct credits
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - 30 })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();

      setPhase("loading");

      const finalReportId = reportId || profile?.active_report_id;
      
      if (!finalReportId) {
        throw new Error("No active report selected. Please upload or select a report first.");
      }

      console.log("🚀 Initializing Simulation for ID:", finalReportId);

      // Double-API Initialization
      const response = await fetch("/api/simulation/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: finalReportId,
          selectedLanguage: config.language,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Initialize API Error:", errData);
        throw new Error(errData.error || `Simulation initialization failed (${response.status})`);
      }

      const data = await response.json();
      setInitialData(data);
    } catch (error) {
      console.error("Failed to initialize simulation:", error);
      alert("Failed to start simulation. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper: speak text with jury-specific voice profile
  const speakWithProfile = (text: string, speaker: string, onDone?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = config.language === 'french' ? 'fr-FR' : 'en-US';
      const profile = VOICE_PROFILES[speaker] || { pitch: 1.0, rate: 1.0 };
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;

      utterance.onend = () => {
        if (onDone) onDone();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback delay
      const delay = text.split(' ').length * 300;
      setTimeout(() => {
        if (onDone) onDone();
      }, delay);
    }
  };

  // Closing phase: AI generates a farewell remark, speaks it, then evaluates
  const handleClosingPhase = async () => {
    // Stop any recording
    if (recognition) recognition.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsRecording(false);
    setActiveSpeaker(null);

    setPhase("closing");

    try {
      // Get AI-generated closing remark
      const response = await fetch('/api/simulation/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: config.language,
          conversation_history: messages.slice(-6),
          report_id: reportId || profile?.active_report_id,
        }),
      });

      let closingText = config.language === 'french'
        ? "Merci pour votre présentation. Le jury va maintenant délibérer."
        : "Thank you for your defense. The jury will now deliberate.";
      let closingSpeaker = "academic";

      if (response.ok) {
        const data = await response.json();
        closingText = data.text || closingText;
        closingSpeaker = data.speaker || closingSpeaker;
      }

      // Display and speak the closing remark
      setActiveSpeaker(closingSpeaker as ActiveSpeaker);
      setIsAISpeaking(true);
      setTranscript(closingText);

      speakWithProfile(closingText, closingSpeaker, () => {
        setIsAISpeaking(false);
        setActiveSpeaker(null);
        // After speaking, auto-proceed to evaluation
        runEvaluation();
      });
    } catch (error) {
      console.error('Closing remarks failed:', error);
      // Skip closing and go straight to evaluation
      runEvaluation();
    }
  };

  // Run the evaluation (called after closing remarks)
  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const response = await fetch("/api/simulation/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: messages,
          report_id: reportId || profile?.active_report_id,
          config: {
            difficulty: config.difficulty,
            language: config.language,
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

      if (onSimulationComplete) {
        onSimulationComplete(data.simulation_id);
      }

      setPhase("aftermath");
    } catch (error) {
      console.error("Failed to evaluate simulation:", error);
      alert("Failed to process simulation results. Please try again.");
      setPhase("config");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Manual end session button also goes through closing
  const handleEndSession = () => {
    if (messages.length === 0) {
      alert("No conversation recorded. Please try again.");
      setPhase("config");
      return;
    }
    handleClosingPhase();
  };

  // Typewriter effect for jury responses
  const typewriterEffect = (text: string, callback?: () => void) => {
    const words = text.split(' ');
    let displayed = '';
    let index = 0;
    
    const interval = setInterval(() => {
      if (index >= words.length) {
        clearInterval(interval);
        if (callback) callback();
        return;
      }
      displayed += (index > 0 ? ' ' : '') + words[index];
      setTranscript(displayed);
      index++;
    }, 80); // 80ms per word
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
      
      // Set active speaker
      setActiveSpeaker(speaker);
      setIsAISpeaking(true);
      
      // Start typewriter effect immediately (visual)
      typewriterEffect(juryResponse);
      
      // Speak with voice profile
      speakWithProfile(juryResponse, speaker as string, () => {
        setIsAISpeaking(false);
        setActiveSpeaker(null);
      });
      
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
      setIsRecording(false);
      setActiveSpeaker(null);
      
      if (recognition) {
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
      }
    } else {
      // Start recording
      console.log("▶️ Starting recording...");
      
      if (!recognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }

      try {
        setTranscript('Listening...');
        setLiveCaption('');
        setIsRecording(true);
        setActiveSpeaker('student');

        // Set session start time on first recording
        if (messages.length === 0) {
          setSessionStartTime(Date.now());
        }

        recognition.lang = config.language === 'french' ? 'fr-FR' : 'en-US';
        recognition.start();
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
      title: "THE TECHNICAL EXPERT",
      subtitle: "Focus: System Architecture, Code Efficiency, and Technical Choices.",
      bgColor: "bg-cyan-100",
      imagePath: "/jury/technical-expert.png",
    },
    {
      name: "Souad",
      title: "THE STRICT ACADEMIC",
      subtitle: "Focus: Research Methodology, Structural Compliance, and Formal Logic.",
      bgColor: "bg-purple-100",
      imagePath: "/jury/strict-academic.png",
    },
    {
      name: "Amir",
      title: "THE BUSINESS STRATEGIST",
      subtitle: "Focus: Innovation, Market Value, and Scalability in Tunisia.",
      bgColor: "bg-amber-100",
      imagePath: "/jury/business-strategist.png",
    },
  ];

  return (
    <div className="w-full h-full">
      <AnimatePresence mode="wait">
        {/* PHASE 1: Configuration Form */}
        {phase === "config" && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full p-6 flex items-center justify-center"
          >
            <div className="max-w-3xl w-full">
              <h2 className="text-2xl font-bold mb-1 font-mono uppercase tracking-wider">
                {t('simulation.setup')}
              </h2>
              <p className="text-gray-600 text-sm mb-6">{t('simulation.setup_subtitle')}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Language Selection */}
                  <div className="border border-black p-4">
                    <label className="block text-xs font-semibold mb-2 uppercase tracking-widest">
                      {t('simulation.report_language')}
                    </label>
                    <div className="flex gap-2">
                      {["french", "english"].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setConfig({ ...config, language: lang as Language })}
                          className={`flex-1 py-2 px-3 border transition-colors text-sm ${
                            config.language === lang
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-gray-300 hover:border-black"
                          }`}
                        >
                          {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Selection */}
                  <div className="border border-black p-4">
                    <label className="block text-xs font-semibold mb-2 uppercase tracking-widest">
                      {t('simulation.duration')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[5, 10, 15, 20].map((duration) => (
                        <button
                          key={duration}
                          onClick={() => setConfig({ ...config, duration })}
                          className={`py-2 px-3 border transition-colors text-sm ${
                            config.duration === duration
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-gray-300 hover:border-black"
                          }`}
                        >
                          {duration} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Difficulty */}
                <div>
                  <div className="border border-black p-4 h-full">
                    <label className="block text-xs font-semibold mb-3 uppercase tracking-widest">
                      {t('simulation.difficulty')}
                    </label>
                    <div className="space-y-2">
                      {DIFFICULTY_CARDS.map((diff) => (
                        <button
                          key={diff.id}
                          onClick={() => setConfig({ ...config, difficulty: diff.id })}
                          className={`w-full p-3 border text-left transition-all ${
                            config.difficulty === diff.id
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-gray-300 hover:border-black"
                          }`}
                        >
                          <div className="font-bold text-sm mb-0.5">{diff.title}</div>
                          <div className={`text-xs ${config.difficulty === diff.id ? "text-gray-300" : "text-gray-600"}`}>
                            {diff.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Initialize Button */}
              <div className="mt-6 border-t border-black pt-6">
                <button
                  onClick={handleInitialize}
                  disabled={isProcessing || !profile || profile.credits < 30}
                  className="w-full bg-black text-white py-4 font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center justify-center gap-3">
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t('common.loading')}</span>
                      </div>
                    ) : (
                      <>
                        <span>{t('simulation.initialize')}</span>
                        <span className="flex items-center gap-1.5 bg-white text-black px-2 py-1 rounded-full text-[10px] font-extrabold normal-case tracking-normal shadow-sm group-hover:bg-gray-100 transition-colors">
                          30
                          <NextImage 
                            src="/images/favicon.jpeg" 
                            alt="Latexo" 
                            width={14} 
                            height={14} 
                            className="rounded-full"
                          />
                        </span>
                      </>
                    )}
                  </div>
                </button>

                {profile && profile.credits < 30 && (
                  <p className="text-red-600 text-xs mt-2 text-center">
                    {t('simulation.insufficient_credits', { credits: profile.credits })}
                  </p>
                )}
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
                        // Fallback to placeholder if image not found
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-6xl font-bold text-black">${JURY_MEMBERS[loadingStep - 1].name[0]}</span>`;
                      }}
                    />
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-bold uppercase tracking-wider border-b-4 border-black pb-2 inline-block"
                  >
                    {loadingStep === 1 ? t('simulation.jury_title_technical') :
                     loadingStep === 2 ? t('simulation.jury_title_academic') :
                     t('simulation.jury_title_business')}
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
          </motion.div>
        )}

        {/* PHASE 3: Live Arena */}
        {phase === "arena" && (
          <motion.div
            key="arena"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col"
          >
            {/* Top Bar - Timer & Stress Meter */}
            <div className="border-b border-black py-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-4xl font-mono font-bold">{formatTime(timeRemaining)}</div>
                  <div className="text-xs uppercase tracking-widest text-gray-600 mt-1">{t('simulation.time_remaining')}</div>
                </div>
                <StressMeter level={stressLevel} />
              </div>
            </div>

            {/* Center - Jury Panel with Talking Avatars */}
            <div className="flex-1 flex items-center justify-center gap-8 md:gap-16 p-8">
              {JURY_MEMBERS.map((member, index) => (
                <TalkingAvatar
                  key={member.name}
                  name={member.name}
                  imagePath={member.imagePath}
                  bgColor={member.bgColor}
                  isSpeaking={
                    activeSpeaker === "technical" && index === 0 ||
                    activeSpeaker === "academic" && index === 1 ||
                    activeSpeaker === "business" && index === 2
                  }
                  size="large"
                />
              ))}
            </div>

            {/* Bottom - Voice Interface */}
            <div className="border-t border-black p-6 flex flex-col items-center gap-6">
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
                className="text-sm uppercase tracking-widest text-gray-600 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEvaluating ? t('simulation.evaluating') : t('simulation.end_session')}
              </button>
            </div>
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
            {/* Active Speaker Avatar */}
            {activeSpeaker && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-32 h-32 rounded-full bg-gray-100 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden"
              >
                <img
                  src={JURY_MEMBERS.find((_, i) => 
                    (activeSpeaker === 'technical' && i === 0) ||
                    (activeSpeaker === 'academic' && i === 1) ||
                    (activeSpeaker === 'business' && i === 2)
                  )?.imagePath || '/jury/strict-academic.png'}
                  alt="Jury"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}

            {/* Closing Remark */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-xl text-center px-8"
            >
              <p className="text-lg text-gray-800 italic">"{transcript}"</p>
            </motion.div>

            {/* Evaluating indicator */}
            {isEvaluating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm uppercase tracking-widest text-gray-500">
                  {t('simulation.evaluating') || 'The jury is deliberating...'}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* PHASE 4: Aftermath — Evaluation Results */}
        {phase === "aftermath" && evaluationResults && (
          <motion.div
            key="aftermath"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full p-6 overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold font-mono uppercase tracking-wider">
                  {t('simulation.results_title') || 'Defense Results'}
                </h2>
                <p className="text-sm text-gray-500 uppercase tracking-widest">
                  {t('simulation.results_subtitle') || 'Your performance summary'}
                </p>
              </div>

              {/* Score + Mention */}
              <div className="border-4 border-black p-8 text-center">
                <div className="text-6xl font-bold font-mono">
                  {evaluationResults.final_grade}
                  <span className="text-2xl text-gray-500">/20</span>
                </div>
                <div className="mt-2 inline-block bg-black text-white px-4 py-1 text-sm font-bold uppercase tracking-widest">
                  {evaluationResults.mention}
                </div>
              </div>

              {/* 3-Axis Proficiency */}
              <div className="border border-black p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4">
                  {t('simulation.proficiency') || 'Proficiency Axes'}
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Technical', value: evaluationResults.evaluation?.proficiency?.tech || 0, color: 'bg-cyan-500' },
                    { label: 'Academic', value: evaluationResults.evaluation?.proficiency?.acad || 0, color: 'bg-purple-500' },
                    { label: 'Business', value: evaluationResults.evaluation?.proficiency?.biz || 0, color: 'bg-amber-500' },
                  ].map((axis) => (
                    <div key={axis.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold">{axis.label}</span>
                        <span className="font-mono">{axis.value}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 border border-black">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${axis.value}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className={`h-full ${axis.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jury Feedback Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'tech', name: 'Malek', title: 'Technical Expert', borderColor: 'border-cyan-500' },
                  { key: 'strict', name: 'Souad', title: 'Strict Academic', borderColor: 'border-purple-500' },
                  { key: 'business', name: 'Amir', title: 'Business Strategist', borderColor: 'border-amber-500' },
                ].map((juror) => {
                  const fb = evaluationResults.feedback?.[juror.key];
                  return (
                    <div key={juror.key} className={`border-2 ${juror.borderColor} p-4 space-y-3`}>
                      <div>
                        <div className="font-bold text-sm">{juror.name}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest">{juror.title}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Comment</div>
                        <p className="text-sm text-gray-700">{fb?.comment || '—'}</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Tip</div>
                        <p className="text-sm text-gray-700">{fb?.tip || '—'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sticker Roast */}
              {evaluationResults.sticker_caption && (
                <div className="border-2 border-dashed border-black p-6 text-center">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    🔥 Sticker Roast
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {evaluationResults.sticker_caption}
                  </div>
                </div>
              )}

              {/* Back to Setup */}
              <div className="text-center pt-4 pb-8">
                <button
                  onClick={() => {
                    setPhase("config");
                    setTimeRemaining(0);
                    setMessages([]);
                    setEvaluationResults(null);
                    setStressLevel(0);
                  }}
                  className="bg-black text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors"
                >
                  {t('simulation.back_to_setup') || 'Back to Setup'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
