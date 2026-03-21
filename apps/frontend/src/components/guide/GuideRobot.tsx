import { useEffect, useRef, useState } from 'react';
import './GuideRobot.css';

type GuideSection = {
  id: string;
  label: string;
};

type RobotState = 'sleeping' | 'awake';

type RobotPosition = {
  x: number;
  y: number;
};

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

function GuideRobot() {
  const [robotState, setRobotState]     = useState<RobotState>('sleeping');
  const [isTouring, setIsTouring]       = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [caption, setCaption]           = useState('Hello, I am Nova, your guide. Press Start and I will gently show you around.');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [robotPosition, setRobotPosition] = useState<RobotPosition>({ x: 0, y: 0 });

  const actionTokenRef         = useRef(0);
  const tourQueueRef           = useRef<string[]>([]);
  const preferredVoiceRef      = useRef<SpeechSynthesisVoice | null>(null);
  const currentSectionIndexRef = useRef(0);
  const lastNarrationRef       = useRef('');

  function hasSpeech() {
    return 'speechSynthesis' in window;
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
    setRobotState('sleeping');
    setCaption('Thank you for visiting. I will be right here when you need me again.');
  }

  // Init
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    setReducedMotion(motionQuery.matches);
    setRobotPosition(getDefaultPosition());

    const loadVoices = () => {
      if (!hasSpeech()) return;
      preferredVoiceRef.current = pickPreferredVoice(window.speechSynthesis.getVoices());
    };

    loadVoices();
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
    const sync = () => setRobotPosition(getPositionForSection(activeSectionId));
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, { passive: true });
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync);
    };
  }, [activeSectionId]);

  const statusLabel = isTouring ? 'ON TOUR' : robotState === 'awake' ? 'AWAKE' : 'SLEEPING';

  return (
    <aside
      className={`guide-robot ${robotState} ${isTouring ? 'touring' : ''}`}
      aria-label="Accessibility tour guide robot"
      style={{ transform: `translate3d(${robotPosition.x}px, ${robotPosition.y}px, 0)` }}
    >
      <div className="guide-bubble" aria-live="polite">
        <span className="guide-status">{statusLabel}</span>
        <p>{caption}</p>
        <div className="guide-bubble-meta">
          <span>{isTouring ? 'auto tour' : 'ready'}</span>
          <span>
            {activeSectionId
              ? GUIDE_SECTIONS.find(s => s.id === activeSectionId)?.label ?? 'Tour stop'
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
          Start
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
        {isTouring
          ? `touring: ${GUIDE_SECTIONS.find(s => s.id === activeSectionId)?.label ?? '...'}`
          : 'ready to guide you'}
      </div>
    </aside>
  );
}

export default GuideRobot;
