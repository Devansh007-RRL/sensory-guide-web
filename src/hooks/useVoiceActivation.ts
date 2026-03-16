import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const WAKE_WORD = "hey glasses";

// Pages that have their own voice/mic controls — don't compete
const VOICE_CONFLICT_PAGES = ["/camera", "/navigation"];

export const useVoiceActivation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [isWakeListening, setIsWakeListening] = useState(true);
  const wakeRecognitionRef = useRef<any>(null);
  const commandRecognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const isConflictPage = VOICE_CONFLICT_PAGES.includes(location.pathname);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = "en-IN";
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, []);

  const handleCommand = useCallback((command: string) => {
    const lower = command.toLowerCase().trim();
    setIsActive(false);

    if (lower.includes("open camera") || lower.includes("start camera") || lower.includes("camera")) {
      speak("Opening camera");
      navigate("/camera");
    } else if (lower.includes("open navigation") || lower.includes("navigation") || lower.includes("navigate")) {
      speak("Opening navigation");
      navigate("/navigation");
    } else if (lower.includes("open chat") || lower.includes("chatbot") || lower.includes("assistant")) {
      speak("Opening AI assistant");
      navigate("/chatbot");
    } else if (lower.includes("go home") || lower.includes("home") || lower.includes("main page")) {
      speak("Going to home page");
      navigate("/");
    } else if (lower.includes("dashboard") || lower.includes("menu")) {
      speak("Opening dashboard");
      navigate("/dashboard");
    } else if (lower.includes("go back") || lower.includes("back")) {
      speak("Going back");
      navigate(-1 as any);
    } else {
      speak(`Sorry, I didn't understand "${command}". Try saying open camera, navigation, chatbot, dashboard, or go home.`);
    }
  }, [navigate, speak]);

  const startCommandListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setIsActive(true);
    speak("I'm listening. What would you like to do?");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleCommand(transcript);
    };

    recognition.onerror = () => {
      setIsActive(false);
    };

    recognition.onend = () => {
      commandRecognitionRef.current = null;
      setIsActive(false);
    };

    recognition.start();
    commandRecognitionRef.current = recognition;
  }, [handleCommand, speak]);

  const startWakeWordListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (wakeRecognitionRef.current) {
      try { wakeRecognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (transcript.includes("hey glasses") || transcript.includes("hey glass") || transcript.includes("a glasses")) {
          // Stop wake listener, start command listener
          try { recognition.stop(); } catch {}
          wakeRecognitionRef.current = null;
          startCommandListening();
          return;
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "aborted") return;
      // Restart after error
      restartTimeoutRef.current = setTimeout(() => {
        if (isWakeListening) startWakeWordListening();
      }, 1000);
    };

    recognition.onend = () => {
      wakeRecognitionRef.current = null;
      // Auto-restart if we should still be listening
      if (!commandRecognitionRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (isWakeListening) startWakeWordListening();
        }, 500);
      }
    };

    recognition.start();
    wakeRecognitionRef.current = recognition;
    setIsWakeListening(true);
  }, [startCommandListening, isWakeListening]);

  // Stop/start wake listening based on current page
  useEffect(() => {
    if (isConflictPage) {
      // Stop all voice recognition on pages with their own mic controls
      if (wakeRecognitionRef.current) try { wakeRecognitionRef.current.stop(); } catch {}
      if (commandRecognitionRef.current) try { commandRecognitionRef.current.stop(); } catch {}
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      setIsWakeListening(false);
      return;
    }

    startWakeWordListening();

    return () => {
      if (wakeRecognitionRef.current) try { wakeRecognitionRef.current.stop(); } catch {}
      if (commandRecognitionRef.current) try { commandRecognitionRef.current.stop(); } catch {}
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      speechSynthesis.cancel();
    };
  }, [isConflictPage]);

  // Restart wake listening when command finishes (only on non-conflict pages)
  useEffect(() => {
    if (!isActive && !wakeRecognitionRef.current && !isConflictPage) {
      restartTimeoutRef.current = setTimeout(() => {
        startWakeWordListening();
      }, 1000);
    }
  }, [isActive, startWakeWordListening, isConflictPage]);

  return { isActive, isWakeListening };
};
