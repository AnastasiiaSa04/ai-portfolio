import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ChatRequest, ChatResponse } from '@portfolio/shared';
import './GuideRobot.css';

const NOVA_SYSTEM_PROMPT = `You are Nova, a warm and witty AI guide robot on Anastasiia Sulollari's portfolio.`


type GuideSection = {
  id: string;
  label: string;
};

type RobotState = 'sleeping' | 'awake';

type RobotPosition = {
  x: number;
  y: number;
};

type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed';

type SpeechRecognitionResultLike = {
  0: {
    transcript: string;
  };
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: SpeechRecognitionErrorCode }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const GUIDE_SECTIONS: GuideSection[] = [
  { id: 'about',      label: 'About' },
  { id: 'skills',     label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'ai-section', label: 'AI Twin' },
  { id: 'contact',    label: 'Contact' },
];

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

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const MAX_VOICE_MESSAGES = 10;
const VOICE_REQUEST_TIMEOUT_MS = 12000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function shortenText(text: string, maxLength = 160) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3).trim()}...`;
}

function pickPreferredVoice(voices: SpeechSynthesisVoice[]) {
  const priority = [, 'Nicky', 'Karen', 'Samantha', 'Moira', 'Martha'];
  for (const name of priority) {
    const match = voices.find(v => v.name === name);
    if (match) return match;
  }
  return voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

function detectVoiceReplyLanguage(input: string) {
  const normalized = input.toLowerCase();

  if (/[а-яё]/i.test(input)) return 'ru';
  if (/\b(hallo|guten|deutsch|erfahrung|fähigkeiten|kontakt)\b/i.test(normalized)) return 'de';
  return 'en';
}

function pickVoiceText(
  language: 'en' | 'ru' | 'de',
  content: Record<'en' | 'ru' | 'de', string>,
) {
  return content[language];
}

function buildLocalVoiceReply(input: string) {
  const normalized = input.toLowerCase();
  const language = detectVoiceReplyLanguage(input);

  if (/(who are you|introduce yourself|who am i talking to|кто ты|представься|wer bist du)/i.test(normalized)) {
    return pickVoiceText(language, {
      en: 'I am Nova, Anastasiia\'s guide robot and AI assistant. I can help you explore her portfolio, explain her skills and projects, and answer questions in a warm and accessible way.',
      ru: 'Я Nova, робот-гид и AI-ассистент Анастасии. Я могу помочь изучить её портфолио, рассказать о навыках и проектах и ответить на вопросы в тёплой и понятной форме.',
      de: 'Ich bin Nova, Anastasiias Guide-Roboter und KI-Assistentin. Ich kann Ihnen helfen, ihr Portfolio zu erkunden, ihre Skills und Projekte zu erklaren und Fragen freundlich und verstandlich zu beantworten.',
    });
  }

  if (/(skill|stack|react|typescript|node|docker|mongo|mysql|навык|стек|technologie|skills)/i.test(normalized)) {
    return pickVoiceText(language, {
      en: 'Anastasiia works with a modern full-stack stack that includes React, Redux, JavaScript, TypeScript, Node.js, Express, HTML and CSS, MySQL, MongoDB, and Docker. She is especially strong in combining polished frontend work with practical backend logic.',
      ru: 'Анастасия работает с современным full-stack стеком: React, Redux, JavaScript, TypeScript, Node.js, Express, HTML и CSS, MySQL, MongoDB и Docker. Её сильная сторона в том, что она сочетает аккуратный frontend с практичной backend-логикой.',
      de: 'Anastasiia arbeitet mit einem modernen Full-Stack-Stack aus React, Redux, JavaScript, TypeScript, Node.js, Express, HTML, CSS, MySQL, MongoDB und Docker. Besonders stark ist sie in der Verbindung von sauberem Frontend und praktischer Backend-Logik.',
    });
  }

  if (/(experience|career|work|journey|опыт|карьер|erfahrung|laufbahn)/i.test(normalized)) {
    return pickVoiceText(language, {
      en: 'Anastasiia is currently developing her full-stack profile through study and hands-on projects at IT Career Hub Berlin. Her work shows steady growth across frontend, backend, accessibility, and interactive AI experiences.',
      ru: 'Сейчас Анастасия развивает свой full-stack профиль через обучение и практические проекты в IT Career Hub Berlin. Её путь показывает уверенный рост во frontend, backend, accessibility и интерактивных AI-решениях.',
      de: 'Anastasiia entwickelt ihr Full-Stack-Profil derzeit durch Lernen und praktische Projekte bei IT Career Hub Berlin weiter. Ihr Weg zeigt klares Wachstum in Frontend, Backend, Accessibility und interaktiven KI-Erlebnissen.',
    });
  }

  if (/(project|portfolio|robot|guide|assistant|проект|портфолио|робот|projekt)/i.test(normalized)) {
    return pickVoiceText(language, {
      en: 'This portfolio is designed as an interactive experience rather than a static page. It includes an AI assistant, a guide robot, and thoughtful accessibility features, which reflects Anastasiia\'s interest in modern and human-centered interfaces.',
      ru: 'Это портфолио задумано как интерактивный опыт, а не как статичная страница. Здесь есть AI-ассистент, робот-гид и продуманные accessibility-решения, что хорошо отражает интерес Анастасии к современным и человечным интерфейсам.',
      de: 'Dieses Portfolio ist als interaktives Erlebnis gedacht und nicht nur als statische Seite. Es enthalt einen KI-Assistenten, einen Guide-Roboter und durchdachte Accessibility-Funktionen, was Anastasiias Interesse an modernen und menschenzentrierten Interfaces zeigt.',
    });
  }

  if (/(contact|email|hire|github|cv|resume|контакт|почта|kontakt)/i.test(normalized)) {
    return pickVoiceText(language, {
      en: 'You can contact Anastasiia at sulollarianastasiia@gmail.com and explore her GitHub at github.com/AnastasiiaSa04. She is open to professional conversations, collaboration, and new opportunities.',
      ru: 'Связаться с Анастасией можно по почте sulollarianastasiia@gmail.com, а её GitHub находится по адресу github.com/AnastasiiaSa04. Она открыта к профессиональному общению, сотрудничеству и новым возможностям.',
      de: 'Sie konnen Anastasiia unter sulollarianastasiia@gmail.com kontaktieren und ihr GitHub unter github.com/AnastasiiaSa04 ansehen. Sie ist offen fur berufliche Gesprache, Zusammenarbeit und neue Moglichkeiten.',
    });
  }

  return pickVoiceText(language, {
    en: 'I am here to help with questions about Anastasiia\'s skills, projects, experience, portfolio, and contact details. If you would like, ask me about her tech stack, professional strengths, AI work, or career direction.',
    ru: 'Я могу помочь с вопросами о навыках Анастасии, её проектах, опыте, портфолио и контактах. Если хочешь, спроси меня о её стеке, сильных сторонах, AI-проектах или карьерном направлении.',
    de: 'Ich helfe gern bei Fragen zu Anastasiias Skills, Projekten, Erfahrungen, Portfolio und Kontaktdaten. Wenn Sie mochten, fragen Sie mich nach ihrem Tech-Stack, ihren Starken, ihren KI-Projekten oder ihrer beruflichen Ausrichtung.',
  });
}

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
}

function getRecognitionCtor() {
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function GuideRobot() {
  const [robotState, setRobotState]     = useState<RobotState>('sleeping');
  const [isTouring, setIsTouring]       = useState(false);
  const [isConversing, setIsConversing] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [isMicActive, setIsMicActive]   = useState(false);
  const [isThinking, setIsThinking]     = useState(false);
  const [lastHeard, setLastHeard]       = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [caption, setCaption]           = useState('Hello, I am Nova, your guide. Press Start and I will gently show you around.');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [robotPosition, setRobotPosition] = useState<RobotPosition>({ x: 0, y: 0 });

  const actionTokenRef         = useRef(0);
  const tourQueueRef           = useRef<string[]>([]);
  const preferredVoiceRef      = useRef<SpeechSynthesisVoice | null>(null);
  const currentSectionIndexRef = useRef(0);
  const lastNarrationRef       = useRef('');
  const lastHeardRef           = useRef('');
  const recognitionRef         = useRef<SpeechRecognitionLike | null>(null);
  const voiceConversationRef   = useRef<ChatMessage[]>([]);
  const shouldResumeListeningRef = useRef(false);
  const voiceThinkingRef       = useRef(false);
  const isHandlingVoiceTurnRef = useRef(false);
  const isListeningRef         = useRef(false);
  const hasMicPermissionRef    = useRef(false);
  const listeningRestartTimeoutRef = useRef<number | null>(null);

  function hasSpeech() {
    return 'speechSynthesis' in window;
  }

  function hasRecognition() {
    return Boolean(getRecognitionCtor());
  }

  function getDefaultPosition() {
    const compact = window.innerWidth <= 640;
    const robotWidth = compact ? 248 : 312;
    return {
      x: window.innerWidth - robotWidth - (compact ? 12 : 24),
      y: window.innerHeight - (compact ? 220 : 240),
    };
  }

  function getPositionForSection(sectionId: string | null) {
    if (!sectionId) return getDefaultPosition();

    const section = document.getElementById(sectionId);
    if (!section) return getDefaultPosition();

    const compact    = window.innerWidth <= 640;
    const robotWidth = compact ? 248 : 312;
    const rect       = section.getBoundingClientRect();

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

  function syncGuideFocus(sectionId: string | null) {
    document.body.classList.toggle('guide-mode', Boolean(sectionId));
    document.querySelectorAll('main section.guide-focus').forEach(s => {
      s.classList.remove('guide-focus');
    });
    if (sectionId) {
      document.getElementById(sectionId)?.classList.add('guide-focus');
    }
  }

  function buildSectionNarration(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) return 'Section not found.';

    const snippets = new Set<string>();
    section.querySelectorAll<HTMLElement>(SECTION_TEXT_SELECTORS).forEach(node => {
      const text = node.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 1) snippets.add(text);
    });

    const narration = Array.from(snippets).slice(0, 6).join('. ');
    return narration ? `${narration}.` : 'Ready to explore.';
  }

  function speak(message: string, options?: { bubbleText?: string; onEnd?: () => void }) {
    const token = ++actionTokenRef.current;

    lastNarrationRef.current = message;
    setCaption(shortenText(options?.bubbleText ?? message));

    if (!hasSpeech()) {
      options?.onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance    = new SpeechSynthesisUtterance(message);
    utterance.voice    = preferredVoiceRef.current;
    utterance.lang     = preferredVoiceRef.current?.lang ?? 'en-US';
    utterance.rate     = reducedMotion ? 0.95 : 0.88;
    utterance.pitch    = 1.08;
    utterance.volume   = 1;

    utterance.onend = () => {
      if (actionTokenRef.current !== token) return;
      options?.onEnd?.();
    };

    utterance.onerror = () => {
      if (actionTokenRef.current !== token) return;
      options?.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

async function requestAssistantReply(messages: ChatMessage[]) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), VOICE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        systemPrompt: NOVA_SYSTEM_PROMPT,  // ← главное изменение
      } as ChatRequest),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');

    const reply = (data as ChatResponse).reply?.trim();
    return reply || buildLocalVoiceReply(getLastUserMessage(messages));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return buildLocalVoiceReply(getLastUserMessage(messages));  // только как fallback
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

  async function ensureMicrophoneAccess() {
    if (hasMicPermissionRef.current) {
      setHasMicPermission(true);
      setIsMicActive(true);
      return true;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCaption('This browser does not support stable microphone access for live conversation.');
      setIsMicActive(false);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.getTracks().forEach((track) => track.stop());
      hasMicPermissionRef.current = true;
      setHasMicPermission(true);
      setIsMicActive(true);
      return true;
    } catch {
      hasMicPermissionRef.current = false;
      setHasMicPermission(false);
      setIsMicActive(false);
      setCaption('I could not access the microphone. Please allow microphone access and try again.');
      return false;
    }
  }

  function clearListeningRestart() {
    if (listeningRestartTimeoutRef.current) {
      window.clearTimeout(listeningRestartTimeoutRef.current);
      listeningRestartTimeoutRef.current = null;
    }
  }

  function scheduleListeningRestart(delay: number) {
    clearListeningRestart();

    if (!shouldResumeListeningRef.current || voiceThinkingRef.current || isHandlingVoiceTurnRef.current) {
      return;
    }

    listeningRestartTimeoutRef.current = window.setTimeout(() => {
      listeningRestartTimeoutRef.current = null;
      void startListening();
    }, delay);
  }

  function startListening() {
    const recognition = recognitionRef.current;

    if (!recognition) {
      setCaption('Voice conversation is not supported in this browser.');
      return;
    }

    if (
      !shouldResumeListeningRef.current ||
      voiceThinkingRef.current ||
      isHandlingVoiceTurnRef.current ||
      isListeningRef.current
    ) {
      return;
    }

    clearListeningRestart();
    setIsMicActive(true);

    try {
      recognition.lang = preferredVoiceRef.current?.lang ?? 'en-US';
      recognition.start();
      setCaption('Microphone is active for live conversation. Speak whenever you are ready.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        scheduleListeningRestart(reducedMotion ? 120 : 320);
        return;
      }

      setCaption('I could not start the microphone. Please try again.');
      scheduleListeningRestart(reducedMotion ? 180 : 420);
    }
  }

  function stopConversation(options?: { farewell?: boolean; silent?: boolean }) {
    shouldResumeListeningRef.current = false;
    voiceThinkingRef.current = false;
    isHandlingVoiceTurnRef.current = false;
    isListeningRef.current = false;
    setIsConversing(false);
    setIsListening(false);
    setIsMicActive(false);
    setIsThinking(false);
    setLastHeard('');
    lastHeardRef.current = '';
    voiceConversationRef.current = [];
    clearListeningRestart();

    recognitionRef.current?.abort();

    if (options?.farewell) {
      speak(
        'Of course. I will be right here if you would like to talk again.',
        { bubbleText: 'Voice conversation ended.' },
      );
      setRobotState('sleeping');
      return;
    }

    if (!options?.silent) {
      setCaption('Voice conversation stopped. You can start talking to me again anytime.');
    }
  }

  async function handleVoiceTurn(transcript: string) {
    const normalized = transcript.toLowerCase();
    isHandlingVoiceTurnRef.current = true;

    lastHeardRef.current = transcript;
    setLastHeard(transcript);

    if (
      /\b(stop listening|stop talking|goodbye|bye)\b/.test(normalized) ||
      /(стоп|хватит|пока|до свидания)/.test(normalized)
    ) {
      stopConversation({ farewell: true });
      return;
    }

    const currentMessages = [
      ...voiceConversationRef.current,
      { role: 'user', content: transcript } as ChatMessage,
    ].slice(-MAX_VOICE_MESSAGES);

    voiceConversationRef.current = currentMessages;
    setCaption(shortenText(`You said: ${transcript}`));
    setIsThinking(true);

    try {
      const reply = await requestAssistantReply(currentMessages);
      const nextMessages = [
        ...currentMessages,
        { role: 'assistant', content: reply } as ChatMessage,
      ].slice(-MAX_VOICE_MESSAGES);

      voiceConversationRef.current = nextMessages;

      speak(reply, {
        bubbleText: reply,
        onEnd: () => {
          isHandlingVoiceTurnRef.current = false;
          voiceThinkingRef.current = false;
          setIsThinking(false);
          if (shouldResumeListeningRef.current) {
            scheduleListeningRestart(reducedMotion ? 180 : 420);
          }
        },
      });
    } catch (error) {
      const fallbackReply = buildLocalVoiceReply(transcript);
      const nextMessages = [
        ...currentMessages,
        { role: 'assistant', content: fallbackReply } as ChatMessage,
      ].slice(-MAX_VOICE_MESSAGES);

      voiceConversationRef.current = nextMessages;

      speak(fallbackReply, {
        bubbleText: fallbackReply,
        onEnd: () => {
          isHandlingVoiceTurnRef.current = false;
          voiceThinkingRef.current = false;
          setIsThinking(false);
          if (shouldResumeListeningRef.current) {
            scheduleListeningRestart(reducedMotion ? 180 : 420);
          }
        },
      });
    }
  }

  function cancelTour(clearSection = false) {
    actionTokenRef.current += 1;
    tourQueueRef.current = [];
    setIsTouring(false);

    if (hasSpeech()) window.speechSynthesis.cancel();

    if (clearSection) {
      setActiveSectionId(null);
      syncGuideFocus(null);
      setRobotPosition(getDefaultPosition());
    }
  }

  function continueTour() {
    const nextId = tourQueueRef.current.shift();

    if (!nextId) {
      setIsTouring(false);
      setActiveSectionId(null);
      syncGuideFocus(null);
      setRobotPosition(getDefaultPosition());
      setCaption('Tour complete! Press Start again anytime.');
      setRobotState('sleeping');
      return;
    }

    const section = GUIDE_SECTIONS.find(s => s.id === nextId);
    if (!section) { continueTour(); return; }

    currentSectionIndexRef.current = GUIDE_SECTIONS.findIndex(s => s.id === nextId);
    setActiveSectionId(nextId);
    syncGuideFocus(nextId);
    setRobotPosition(getPositionForSection(nextId));

    document.getElementById(nextId)?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });

    const narration = buildSectionNarration(nextId);
    const message   = `${section.label}. ${narration}`;

    speak(message, {
      bubbleText: `Exploring ${section.label}`,
      onEnd: () => {
        window.setTimeout(() => continueTour(), reducedMotion ? 100 : 500);
      },
    });
  }

  function startFullTour() {
    stopConversation();
    cancelTour(false);
    setRobotState('awake');
    setIsTouring(true);
    tourQueueRef.current = GUIDE_SECTIONS.map(s => s.id);

    speak(
      "Hello, I am Nova, Anastasiia's guide robot. It is a pleasure to meet you. I will gently walk you through the most important parts of this site.",
      {
        bubbleText: 'Hello, I am Nova. It is a pleasure to guide you.',
        onEnd: () => continueTour(),
      },
    );
  }

  function stopTour() {
    cancelTour(true);
    stopConversation();
    setRobotState('sleeping');
    setCaption('Thank you for visiting. I will be right here when you need me again.');
  }

  async function startConversation() {
    if (!hasRecognition()) {
      setRobotState('awake');
      setCaption('Voice conversation is not supported in this browser. Chrome-based browsers usually work best.');
      return;
    }

    stopConversation({ silent: true });
    cancelTour(true);

    if (!hasMicPermissionRef.current) {
      setCaption('Please allow microphone access so we can talk naturally.');
    }

    const hasMicAccess = await ensureMicrophoneAccess();

    if (!hasMicAccess) {
      setRobotState('awake');
      return;
    }

    setRobotState('awake');
    setIsConversing(true);
    setIsMicActive(true);
    setIsThinking(false);
    setLastHeard('');
    shouldResumeListeningRef.current = true;
    voiceConversationRef.current = [];

    speak(
      'Hello, I am Nova. Your microphone is now active, and we can talk naturally. Ask me about Anastasiia, her experience, her projects, or anything on this website.',
      {
        bubbleText: 'Voice mode is ready. Your microphone will stay active for live conversation.',
        onEnd: () => {
          scheduleListeningRestart(reducedMotion ? 160 : 420);
        },
      },
    );
  }

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    setReducedMotion(motionQuery.matches);
    setRobotPosition(getDefaultPosition());

    const loadVoices = () => {
      if (!hasSpeech()) return;
      preferredVoiceRef.current = pickPreferredVoice(window.speechSynthesis.getVoices());
      if (recognitionRef.current) {
        recognitionRef.current.lang = preferredVoiceRef.current?.lang ?? 'en-US';
      }
    };

    loadVoices();
    setVoiceSupported(hasRecognition());
    if (hasSpeech()) window.speechSynthesis.onvoiceschanged = loadVoices;
    motionQuery.addEventListener('change', handleMotion);

    return () => {
      motionQuery.removeEventListener('change', handleMotion);
      syncGuideFocus(null);
      document.body.classList.remove('guide-mode', 'guide-reduced-motion');
      if (hasSpeech()) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('guide-reduced-motion', reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    const Recognition = getRecognitionCtor();

    if (!Recognition) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = preferredVoiceRef.current?.lang ?? 'en-US';

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setIsMicActive(true);
      if (!lastHeardRef.current && !voiceThinkingRef.current) {
        setCaption('Live dialogue is active. Speak naturally whenever you are ready.');
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);

      if (!shouldResumeListeningRef.current) {
        setIsMicActive(false);
        return;
      }

      setIsMicActive(true);

      if (!voiceThinkingRef.current && !isHandlingVoiceTurnRef.current) {
        scheduleListeningRestart(reducedMotion ? 120 : 320);
      }
    };

    recognition.onerror = (event) => {
      isListeningRef.current = false;
      setIsListening(false);

      if (event.error === 'aborted') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        shouldResumeListeningRef.current = false;
        hasMicPermissionRef.current = false;
        setIsConversing(false);
        setHasMicPermission(false);
        setIsMicActive(false);
        setIsThinking(false);
        voiceThinkingRef.current = false;
        isHandlingVoiceTurnRef.current = false;
        clearListeningRestart();
        setCaption('I could not access the microphone. Please allow microphone access and try again.');
        return;
      }

      if (event.error === 'no-speech') {
        setIsMicActive(true);
        setCaption('Microphone is active. Speak whenever you are ready.');
        return;
      }

      setCaption('The microphone is still active, but I had trouble hearing that. Please try once more.');
      setIsMicActive(shouldResumeListeningRef.current);
    };

    recognition.onresult = (event) => {
      let transcript = '';
      let interimTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          transcript += result[0]?.transcript ?? '';
        } else {
          interimTranscript += result[0]?.transcript ?? '';
        }
      }

      transcript = transcript.trim();

      if (transcript) {
        clearListeningRestart();
        lastHeardRef.current = transcript;
        setLastHeard(transcript);
        isHandlingVoiceTurnRef.current = true;
        voiceThinkingRef.current = true;
        isListeningRef.current = false;
        setIsThinking(true);
        setIsListening(false);
        setIsMicActive(true);
        setCaption(shortenText(`You said: ${transcript}`));
        recognition.abort();
        void handleVoiceTurn(transcript);
        return;
      }

      if (interimTranscript.trim()) {
        setCaption(shortenText(`I hear: ${interimTranscript.trim()}`));
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      clearListeningRestart();
      recognition.abort();
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [reducedMotion]);

  useEffect(() => {
    return () => {
      clearListeningRestart();
    };
  }, []);

  useEffect(() => {
    const sync = () => setRobotPosition(getPositionForSection(activeSectionId));
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, { passive: true });
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync);
    };
  }, [activeSectionId]);

  const statusLabel = isConversing
    ? 'LIVE DIALOGUE'
    : isTouring
      ? 'ON TOUR'
      : robotState === 'awake'
        ? 'AWAKE'
        : 'SLEEPING';

  return (
    <aside
      className={`guide-robot ${robotState} ${isTouring ? 'touring' : ''} ${isListening ? 'listening' : ''} ${isMicActive ? 'mic-active' : ''} ${isThinking ? 'thinking' : ''} ${isConversing ? 'conversing' : ''}`}
      aria-label="Accessibility tour guide robot"
      style={{ transform: `translate3d(${robotPosition.x}px, ${robotPosition.y}px, 0)` }}
    >
      <div className="guide-bubble" aria-live="polite">
        <span className="guide-status">{statusLabel}</span>
        <p>{caption}</p>
        <div className="guide-bubble-meta">
          <span>
            {isConversing
              ? hasMicPermission
                ? 'mic permission granted'
                : 'voice chat'
              : isTouring
                ? 'auto tour'
                : isMicActive
                  ? 'microphone active'
                  : 'ready'}
          </span>
          <span>
            {lastHeard
              ? shortenText(lastHeard, 30)
              : activeSectionId
                ? GUIDE_SECTIONS.find(s => s.id === activeSectionId)?.label ?? 'Tour stop'
                : isConversing
                  ? isThinking
                    ? 'Nova is replying'
                    : 'Ask anything'
                  : 'Whole site'}
          </span>
        </div>
      </div>

      <div className="guide-action-row">
        <button
          className="guide-action-button guide-action-button-primary"
          type="button"
          onClick={startFullTour}
        >
          Tour
        </button>
        <button
          className="guide-action-button guide-action-button-voice"
          type="button"
          onClick={startConversation}
        >
          {voiceSupported ? (hasMicPermission ? 'Talk' : 'Enable Mic') : 'No Mic'}
        </button>
        <button
          className="guide-action-button guide-action-button-danger"
          type="button"
          onClick={stopTour}
        >
          Stop
        </button>
      </div>

      <div className="guide-avatar" aria-hidden="true">
        <div className="guide-hover-shadow"></div>
        <div className="guide-antenna"></div>
        <div className="guide-head">
          <div className="guide-faceplate">
            <div className="guide-eyes">
              <span className="guide-eye"></span>
              <span className="guide-eye"></span>
            </div>
            <div className="guide-mouth"></div>
          </div>
        </div>
        <div className="guide-shoulders">
          <span className="guide-arm guide-arm-left"></span>
          <span className="guide-arm guide-arm-right"></span>
        </div>
        <div className="guide-body">
          <div className="guide-heart-light" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="guide-heart-icon" focusable="false">
              <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.27 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.77-3.4 6.86-8.55 11.54L12 21.35Z" />
            </svg>
          </div>
          <span className="guide-body-line"></span>
          <span className="guide-body-line"></span>
        </div>
        <div className="guide-platform">
          <div className="guide-feet">
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <div className="guide-caption-line">
        {isTouring
          ? `touring: ${GUIDE_SECTIONS.find(s => s.id === activeSectionId)?.label ?? '...'}`
          : isConversing
            ? isThinking
              ? 'live dialogue in progress'
              : hasMicPermission
                ? 'microphone permission granted for live dialogue'
                : 'voice mode ready'
            : isMicActive
              ? 'microphone active and ready'
              : 'ready to guide you'}
      </div>
    </aside>
  );
}

export default GuideRobot;
