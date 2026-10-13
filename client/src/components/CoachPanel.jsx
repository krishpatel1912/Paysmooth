// client/src/components/CoachPanel.jsx
import { useEffect, useState, useRef } from "react";
import { getCoach } from "../api";

const LANGUAGES = [
  { code: "mr", label: "मराठी", locale: "mr-IN" },
  { code: "hi", label: "हिन्दी", locale: "hi-IN" },
  { code: "en", label: "English", locale: "en-IN" },
];

export default function CoachPanel({
  riderId,
  language: initialLanguage,
  defaultLanguage = "en",
  coach = getCoach,
  onLanguageChange
}) {
  const activeInitialLang = initialLanguage || defaultLanguage;
  const [language, setLanguage] = useState(activeInitialLang);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoice, setAvailableVoice] = useState(null);

  const utteranceRef = useRef(null);

  // Check SpeechSynthesis voice availability for current language
  useEffect(() => {
    function checkVoice() {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setAvailableVoice(null);
        return;
      }
      const targetLocale = LANGUAGES.find((l) => l.code === language)?.locale || "en-IN";
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(
        (v) =>
          v.lang === targetLocale ||
          v.lang.replace(/_/g, "-").toLowerCase() === targetLocale.toLowerCase() ||
          v.lang.toLowerCase().startsWith(language.toLowerCase())
      );
      setAvailableVoice(matched || null);
    }

    checkVoice();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = checkVoice;
    }
  }, [language]);

  async function fetchMessage(langCode) {
    if (!riderId) return;
    setLoading(true);
    setError("");
    stopSpeaking();

    try {
      const data = await coach(riderId, langCode);
      setMessage(data.message);
    } catch {
      setError("The coach is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Load message when riderId or initial language changes
  useEffect(() => {
    setLanguage(activeInitialLang);
    fetchMessage(activeInitialLang);
  }, [riderId, activeInitialLang]);

  function handleLanguageChange(code) {
    setLanguage(code);
    fetchMessage(code);
    if (onLanguageChange) {
      onLanguageChange(code);
    }
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }

  function handleSpeak() {
    if (typeof window === "undefined" || !window.speechSynthesis || !message) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    const targetLocale = LANGUAGES.find((l) => l.code === language)?.locale || "en-IN";
    utterance.lang = targetLocale;
    if (availableVoice) {
      utterance.voice = availableVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className="card coach-panel">
      <div className="coach-header">
        <h2 className="card-title">Money Coach</h2>
        {message && availableVoice && (
          <button
            type="button"
            className={`btn--voice ${isSpeaking ? "btn--voice-speaking" : ""}`}
            onClick={handleSpeak}
            title={isSpeaking ? "Stop voice" : "Listen in natural voice"}
          >
            {isSpeaking ? "⏹️ Stop" : "🔊 Listen"}
          </button>
        )}
      </div>

      <div className="lang-toggle" role="group" aria-label="Coach language">
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            className={`lang-btn ${language === code ? "lang-btn--active" : ""}`}
            aria-pressed={language === code}
            onClick={() => handleLanguageChange(code)}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={() => fetchMessage(language)}
        disabled={loading || !riderId}
      >
        {loading ? "Thinking…" : "Ask coach"}
      </button>

      {error && <p className="coach-error" role="alert">{error}</p>}

      {message && !error && (
        <div className="coach-message" aria-live="polite">
          {message}
        </div>
      )}
    </section>
  );
}