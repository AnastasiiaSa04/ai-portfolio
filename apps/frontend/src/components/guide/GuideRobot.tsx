import { useEffect, useRef, useState } from 'react';
import './GuideRobot.css';

type GuideSection = {
  id: string;
  label: string;
  keywords: string[];
};

type RobotState = 'sleeping' | 'awake';

type RobotPosition = {
  x: number;
  y: number;
};

type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }>;

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const GUIDE_SECTIONS: GuideSection[] = [
  { id: 'about', label: 'About', keywords: ['about', 'identity', 'who you are', 'who are you', 'you', 'yourself'] },
  { id: 'skills', label: 'Skills', keywords: ['skills', 'stack', 'tech stack', 'technology', 'frontend', 'backend'] },
  { id: 'ai-section', label: 'AI Twin', keywords: ['ai', 'assistant', 'twin', 'guide', 'artificial intelligence'] },
  { id: 'experience', label: 'Experience', keywords: ['experience', 'timeline', 'work', 'career', 'history'] },
  { id: 'contact', label: 'Contact', keywords: ['contact', 'email', 'github', 'linkedin', 'availability'] },
];

const ACTIVATION_PHRASE = 'tell me about';
const DEFAULT_PROMPT = 'say: tell me about';
const VOICE_READY_PROMPT = 'say: tell me about';
const CONSENT_PROMPT = 'Allow microphone access so I can guide visitors by voice.';
const SUPPORT_INTRO =
  'We are in solidarity with people who have accessibility needs. This guide is here to support visitors with low vision or limited mobility.';
const COMMAND_HELP =
  'Say tell me about for the full site tour, or say tell me about skills, experience, AI twin, or contact. You can also say next, repeat, stop, or sleep.';

const SECTION_TEXT_SELECTORS = [
  '.section-title',
  '.section-label',
  'p',
  '.stat-number',
  '.stat-label',
  '.skill-cat-title',
  '.skill-name',
  '.ai-feat-text',
  '.timeline-date',
  '.timeline-role',
  '.timeline-company',
  '.timeline-desc',
  '.cl-label',
  '.cl-text',
  '.availability',
].join(', ');

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function shortenText(text: string, maxLength = 160) {
  const compactText = text.replace(/\s+/g, ' ').trim();
  if (compactText.length <= maxLength) return compactText;
  return `${compactText.slice(0, maxLength - 3).trim()}...`;
}

function getRecognitionConstructor():
  | SpeechRecognitionConstructor
  | undefined {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickPreferredVoice(voices: SpeechSynthesisVoice[]) {
  const preferredNames = [
    'Samantha',
    'Google UK English Female',
    'Microsoft Libby Online (Natural)',
    'Microsoft Aria Online (Natural)',
    'Microsoft Ava Online (Natural)',
    'Microsoft Jenny Online (Natural)',
    'Emma',
    'Ava',
    'Serena',
    'Female',
  ];

  for (const preferredName of preferredNames) {
    const exactMatch = voices.find((voice) => voice.name === preferredName);
    if (exactMatch) return exactMatch;

    const partialMatch = voices.find((voice) =>
      voice.name.toLowerCase().includes(preferredName.toLowerCase()),
    );
    if (partialMatch) return partialMatch;
  }

  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ?? voices[0] ?? null;
}

function GuideRobot() {
  const [robotState, setRobotState] = useState<RobotState>('sleeping');
  const [voiceWakeEnabled, setVoiceWakeEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [caption, setCaption] = useState(DEFAULT_PROMPT);
  const [heardCommand, setHeardCommand] = useState('waiting');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showConsentPrompt, setShowConsentPrompt] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackStopped, setFallbackStopped] = useState(false);
  const [isAutoTourPending, setIsAutoTourPending] = useState(false);
  const [robotPosition, setRobotPosition] = useState<RobotPosition>({ x: 24, y: 120 });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionActiveRef = useRef(false);
  const voiceWakeEnabledRef = useRef(false);
  const pausedForSpeechRef = useRef(false);
  const actionTokenRef = useRef(0);
  const lastNarrationRef = useRef('');
  const currentSectionIndexRef = useRef(0);
  const tourQueueRef = useRef<string[]>([]);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const fallbackStoppedRef = useRef(false);
  const autoTourTimeoutRef = useRef<number | null>(null);

  function hasSpeechSynthesis() {
    return 'speechSynthesis' in window;
  }

  function setBubbleText(text: string) {
    setCaption(shortenText(text));
  }

  function getDefaultPosition() {
    const compact = window.innerWidth <= 640;
    return {
      x: compact ? 12 : 24,
      y: clamp(window.innerHeight - (compact ? 220 : 230), 88, window.innerHeight - 140),
    };
  }

  function getPositionForSection(sectionId: string | null) {
    if (!sectionId) return getDefaultPosition();

    const section = document.getElementById(sectionId);
    if (!section) return getDefaultPosition();

    const compact = window.innerWidth <= 640;
    const rect = section.getBoundingClientRect();
    const robotWidth = compact ? 248 : 312;
    const x = clamp(
      rect.right - robotWidth * 0.55,
      compact ? 12 : 18,
      window.innerWidth - robotWidth - (compact ? 12 : 18),
    );
    const y = clamp(
      rect.top + Math.min(56, rect.height * 0.16),
      compact ? 92 : 96,
      window.innerHeight - (compact ? 190 : 220),
    );

    return { x, y };
  }

  function updateRobotPosition(sectionId = activeSectionId) {
    setRobotPosition(getPositionForSection(sectionId));
  }

  function syncGuideFocus(sectionId: string | null) {
    document.body.classList.toggle('guide-mode', Boolean(sectionId));
    document.querySelectorAll('main section.guide-focus').forEach((section) => {
      section.classList.remove('guide-focus');
    });

    if (sectionId) {
      document.getElementById(sectionId)?.classList.add('guide-focus');
    }
  }

  function stopRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.stop();
    } catch {
      // Ignore browser errors when recognition is already stopped.
    }
  }

  function clearAutoTourTimeout() {
    if (autoTourTimeoutRef.current) {
      window.clearTimeout(autoTourTimeoutRef.current);
      autoTourTimeoutRef.current = null;
    }
    setIsAutoTourPending(false);
  }

  function scheduleFallbackTour(reasonText = 'Microphone unavailable. Starting automatic tour in 3 seconds.') {
    clearAutoTourTimeout();
    setShowConsentPrompt(false);
    fallbackStoppedRef.current = false;
    setFallbackStopped(false);
    setFallbackMode(true);
    setRobotState('awake');
    setBubbleText(reasonText);
    setIsListening(false);
    voiceWakeEnabledRef.current = false;
    setVoiceWakeEnabled(false);
    setIsAutoTourPending(true);

    autoTourTimeoutRef.current = window.setTimeout(() => {
      autoTourTimeoutRef.current = null;
      setIsAutoTourPending(false);

      if (fallbackStoppedRef.current) return;

      startFullTour();
    }, 2600);
  }

  function startRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition || recognitionActiveRef.current) return false;

    pausedForSpeechRef.current = false;

    try {
      recognition.start();
      return true;
    } catch {
      return false;
    }
  }

  function requestVoiceGuideConsent() {
    if (!voiceSupported || voiceWakeEnabledRef.current) return;

    setShowConsentPrompt(false);
    setFallbackMode(false);
    fallbackStoppedRef.current = false;
    setFallbackStopped(false);
    voiceWakeEnabledRef.current = true;
    setVoiceWakeEnabled(true);
    setBubbleText(VOICE_READY_PROMPT);

    if (!startRecognition()) {
      voiceWakeEnabledRef.current = false;
      setVoiceWakeEnabled(false);
      scheduleFallbackTour('Microphone could not start. Starting automatic tour in 3 seconds.');
    }
  }

  function cancelCurrentGuide(clearSection = false) {
    actionTokenRef.current += 1;
    tourQueueRef.current = [];
    setIsTouring(false);
    clearAutoTourTimeout();

    if (hasSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }

    if (clearSection) {
      setActiveSectionId(null);
      syncGuideFocus(null);
      updateRobotPosition(null);
    }
  }

  function buildSectionNarration(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) return 'I could not find that section on the page.';

    const uniqueSnippets = new Set<string>();

    Array.from(section.querySelectorAll<HTMLElement>(SECTION_TEXT_SELECTORS)).forEach((node) => {
      const snippet = node.textContent?.replace(/\s+/g, ' ').trim();
      if (snippet && snippet.length > 1) {
        uniqueSnippets.add(snippet);
      }
    });

    const narration = Array.from(uniqueSnippets).slice(0, 16).join('. ');
    return narration ? `${narration}.` : 'This section is ready to be explored.';
  }

  function speak(
    message: string,
    options?: {
      bubbleText?: string;
      includeIntro?: boolean;
      onEnd?: () => void;
      rawText?: boolean;
    },
  ) {
    const token = actionTokenRef.current + 1;
    actionTokenRef.current = token;

    const spokenText = options?.rawText
      ? message
      : `${options?.includeIntro === false ? '' : `${SUPPORT_INTRO} `}${message}`.trim();

    lastNarrationRef.current = spokenText;
    setBubbleText(options?.bubbleText ?? message);

    if (!hasSpeechSynthesis()) {
      options?.onEnd?.();
      return;
    }

    if (voiceWakeEnabledRef.current && recognitionActiveRef.current) {
      pausedForSpeechRef.current = true;
      stopRecognition();
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.voice = preferredVoiceRef.current;
    utterance.lang = preferredVoiceRef.current?.lang ?? 'en-US';
    utterance.rate = reducedMotion ? 1 : 0.94;
    utterance.pitch = 1.02;

    utterance.onend = () => {
      pausedForSpeechRef.current = false;

      if (actionTokenRef.current !== token) return;

      options?.onEnd?.();

      if (actionTokenRef.current === token && voiceWakeEnabledRef.current) {
        startRecognition();
      }
    };

    utterance.onerror = () => {
      pausedForSpeechRef.current = false;

      if (actionTokenRef.current !== token) return;

      options?.onEnd?.();

      if (actionTokenRef.current === token && voiceWakeEnabledRef.current) {
        startRecognition();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function getSectionById(sectionId: string) {
    return GUIDE_SECTIONS.find((section) => section.id === sectionId) ?? null;
  }

  function getSectionByTopic(topic: string) {
    return (
      GUIDE_SECTIONS.find((section) =>
        section.keywords.some(
          (keyword) => topic.includes(keyword) || keyword.includes(topic),
        ),
      ) ?? null
    );
  }

  function focusSection(
    section: GuideSection,
    options?: { continueTour?: boolean; includeIntro?: boolean },
  ) {
    const sectionNode = document.getElementById(section.id);
    if (!sectionNode) {
      speak(`I could not find the ${section.label} section.`, {
        bubbleText: `I cannot find ${section.label}.`,
        includeIntro: true,
      });
      return;
    }

    currentSectionIndexRef.current = GUIDE_SECTIONS.findIndex((item) => item.id === section.id);
    setRobotState('awake');
    setActiveSectionId(section.id);
    syncGuideFocus(section.id);
    updateRobotPosition(section.id);

    sectionNode.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });

    const sectionNarration = buildSectionNarration(section.id);
    const message = `I am now at the ${section.label} section. ${sectionNarration}`;

    speak(message, {
      bubbleText: options?.continueTour
        ? `Moving to ${section.label}.`
        : `Exploring ${section.label}.`,
      includeIntro: options?.includeIntro !== false,
      onEnd: options?.continueTour
        ? () => {
            window.setTimeout(() => {
              continueTour();
            }, reducedMotion ? 120 : 520);
          }
        : undefined,
    });
  }

  function continueTour() {
    const nextSectionId = tourQueueRef.current.shift();

    if (!nextSectionId) {
      setIsTouring(false);
      setBubbleText('Tour complete. Say: tell me about');
      return;
    }

    const nextSection = getSectionById(nextSectionId);
    if (!nextSection) {
      continueTour();
      return;
    }

    focusSection(nextSection, {
      continueTour: true,
      includeIntro: false,
    });
  }

  function startFullTour() {
    cancelCurrentGuide(false);
    fallbackStoppedRef.current = false;
    setFallbackStopped(false);
    setRobotState('awake');
    setIsTouring(true);
    tourQueueRef.current = GUIDE_SECTIONS.map((section) => section.id);

    const firstSectionId = tourQueueRef.current.shift();
    if (!firstSectionId) return;

    const firstSection = getSectionById(firstSectionId);
    if (!firstSection) return;

    focusSection(firstSection, {
      continueTour: true,
      includeIntro: true,
    });
  }

  function stopGuide() {
    cancelCurrentGuide(true);
    fallbackStoppedRef.current = true;
    setFallbackStopped(true);
    setRobotState('sleeping');
    setBubbleText(
      fallbackMode
        ? 'Automatic tour stopped.'
        : 'Tour paused. Say: tell me about',
    );

    if (voiceWakeEnabledRef.current && !fallbackMode) {
      startRecognition();
    }
  }

  function sleepGuide() {
    cancelCurrentGuide(true);
    setRobotState('sleeping');
    setBubbleText(DEFAULT_PROMPT);

    if (voiceWakeEnabledRef.current) {
      startRecognition();
    }
  }

  function repeatLastNarration() {
    if (!lastNarrationRef.current) return;

    cancelCurrentGuide(false);
    setRobotState('awake');
    speak(lastNarrationRef.current, {
      bubbleText: 'Repeating the last stop.',
      rawText: true,
    });
  }

  function goToNextSection() {
    cancelCurrentGuide(false);
    setRobotState('awake');

    const nextIndex = (currentSectionIndexRef.current + 1) % GUIDE_SECTIONS.length;
    focusSection(GUIDE_SECTIONS[nextIndex], {
      includeIntro: true,
    });
  }

  function handleCommand(transcript: string) {
    const normalized = normalizeText(transcript);
    if (!normalized) return;

    setHeardCommand(transcript);

    if (normalized === 'next' || normalized.includes('next section')) {
      goToNextSection();
      return;
    }

    if (normalized === 'repeat' || normalized.includes('say that again')) {
      repeatLastNarration();
      return;
    }

    if (normalized === 'stop' || normalized.includes('stop guide')) {
      stopGuide();
      return;
    }

    if (normalized === 'sleep' || normalized.includes('go to sleep')) {
      sleepGuide();
      return;
    }

    if (!normalized.startsWith(ACTIVATION_PHRASE)) {
      return;
    }

    const topic = normalized.slice(ACTIVATION_PHRASE.length).trim();
    if (!topic || ['all', 'everything', 'site', 'website', 'portfolio'].includes(topic)) {
      startFullTour();
      return;
    }

    const matchedSection = getSectionByTopic(topic);
    if (matchedSection) {
      cancelCurrentGuide(false);
      focusSection(matchedSection, {
        includeIntro: true,
      });
      return;
    }

    cancelCurrentGuide(false);
    setRobotState('awake');
    speak(`I heard "${transcript}", but I need a section name. ${COMMAND_HELP}`, {
      bubbleText: 'I need a section name.',
      includeIntro: true,
    });
  }

  useEffect(() => {
    const recognitionConstructor = getRecognitionConstructor();
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    const loadVoices = () => {
      if (!hasSpeechSynthesis()) return;
      preferredVoiceRef.current = pickPreferredVoice(window.speechSynthesis.getVoices());
    };

    const recognitionAvailable = Boolean(recognitionConstructor);

    setReducedMotion(motionQuery.matches);
    setVoiceSupported(recognitionAvailable);
    setRobotPosition(getDefaultPosition());
    loadVoices();

    if (hasSpeechSynthesis()) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    motionQuery.addEventListener('change', handleMotionChange);

    if (recognitionConstructor) {
      const recognition = new recognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        recognitionActiveRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const latestResult = results[results.length - 1];
        if (!latestResult) return;

        const transcript = Array.from(latestResult)
          .map((item) => item.transcript)
          .join(' ')
          .trim();

        handleCommand(transcript);
      };

        recognition.onerror = (event) => {
          recognitionActiveRef.current = false;
          setIsListening(false);

          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            voiceWakeEnabledRef.current = false;
            setVoiceWakeEnabled(false);
            scheduleFallbackTour('Microphone access was not allowed. Starting automatic tour in 3 seconds.');
            return;
          }

          if (event.error !== 'aborted') {
            setBubbleText(`Voice wake-up paused: ${event.error}.`);
          }
      };

      recognition.onend = () => {
        recognitionActiveRef.current = false;
        setIsListening(false);

        if (voiceWakeEnabledRef.current && !pausedForSpeechRef.current) {
          window.setTimeout(() => {
            startRecognition();
          }, 360);
        }
      };

      recognitionRef.current = recognition;
    }

    window.setTimeout(() => {
      if (recognitionAvailable) {
        setRobotState('awake');
        setShowConsentPrompt(true);
        setBubbleText(CONSENT_PROMPT);
      } else {
        scheduleFallbackTour();
      }
    }, 300);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      voiceWakeEnabledRef.current = false;
      clearAutoTourTimeout();
      stopRecognition();
      syncGuideFocus(null);
      document.body.classList.remove('guide-mode', 'guide-reduced-motion');

      if (hasSpeechSynthesis()) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('guide-reduced-motion', reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    syncGuideFocus(activeSectionId);
  }, [activeSectionId]);

  useEffect(() => {
    const syncPosition = () => {
      updateRobotPosition(activeSectionId);
    };

    syncPosition();

    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, { passive: true });

    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition);
    };
  }, [activeSectionId]);

  const statusLabel = isTouring
    ? 'ON TOUR'
    : isAutoTourPending
      ? 'AUTO START'
    : isListening
      ? 'LISTENING'
      : robotState === 'awake'
        ? 'AWAKE'
        : 'SLEEPING';

  const modeLabel = fallbackMode
    ? isAutoTourPending
      ? 'auto tour soon'
      : 'auto tour'
    : showConsentPrompt
      ? 'awaiting consent'
    : voiceWakeEnabled
      ? 'voice guide on'
      : 'voice guide off';

  const activeSectionLabel = activeSectionId
    ? getSectionById(activeSectionId)?.label ?? 'Tour stop'
    : 'Whole site';

  return (
    <aside
      className={`guide-robot ${robotState} ${isListening ? 'listening' : ''} ${isTouring ? 'touring' : ''}`}
      aria-label="Accessibility tour guide robot"
      style={{ transform: `translate3d(${robotPosition.x}px, ${robotPosition.y}px, 0)` }}
    >
      <div className="guide-bubble" aria-live="polite">
        <span className="guide-status">{statusLabel}</span>
        <p>{caption}</p>
        <div className="guide-bubble-meta">
          <span>{modeLabel}</span>
          <span>{activeSectionLabel}</span>
        </div>
      </div>

      <div className="guide-action-row">
        <button className="guide-action-button guide-action-button-primary" type="button" onClick={startFullTour}>
          Start
        </button>
        <button className="guide-action-button guide-action-button-danger" type="button" onClick={stopGuide}>
          Stop
        </button>
      </div>

      {showConsentPrompt && (
        <button className="guide-consent-button" type="button" onClick={requestVoiceGuideConsent}>
          Enable Voice Guide
        </button>
      )}

      <div className="guide-avatar" aria-hidden="true">
        <div className="guide-antenna"></div>
        <div className="guide-head">
          <div className="guide-eyes">
            <span className="guide-eye"></span>
            <span className="guide-eye"></span>
          </div>
          <div className="guide-mouth"></div>
        </div>
        <div className="guide-body">
          <span className="guide-body-line"></span>
          <span className="guide-body-line"></span>
        </div>
        <div className="guide-feet">
          <span></span>
          <span></span>
        </div>
      </div>

      <div className="guide-caption-line">
        {fallbackMode
          ? fallbackStopped
            ? 'automatic tour stopped'
            : 'microphone fallback active'
          : showConsentPrompt
            ? 'waiting for consent'
          : voiceSupported
            ? heardCommand === 'waiting'
              ? 'voice-only guide ready'
              : `heard: ${shortenText(heardCommand, 60)}`
            : 'voice guide needs browser speech support'}
      </div>
    </aside>
  );
}

export default GuideRobot;
