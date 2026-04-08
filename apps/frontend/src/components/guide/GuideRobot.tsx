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
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'ai-section', label: 'AI Twin' },
  { id: 'contact', label: 'Contact' },
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

function getStepDelay(text: string, reducedMotion: boolean) {
  if (reducedMotion) return 90;
  return Math.min(2800, Math.max(1100, text.length * 20));
}

function GuideRobot() {
  const [robotState, setRobotState] = useState<RobotState>('sleeping');
  const [isTouring, setIsTouring] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [caption, setCaption] = useState('Hello, I am Nova, your guide. Press Tour and I will gently show you around.');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [robotPosition, setRobotPosition] = useState<RobotPosition>({ x: 0, y: 0 });

  const actionTokenRef = useRef(0);
  const tourQueueRef = useRef<string[]>([]);
  const stepTimeoutRef = useRef<number | null>(null);

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

    const compact = window.innerWidth <= 640;
    const robotWidth = compact ? 248 : 312;
    const rect = section.getBoundingClientRect();

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
    document.querySelectorAll('main section.guide-focus').forEach((section) => {
      section.classList.remove('guide-focus');
    });

    if (sectionId) {
      document.getElementById(sectionId)?.classList.add('guide-focus');
    }
  }

  function buildSectionNarration(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) return 'Section not found.';

    const snippets = new Set<string>();
    section.querySelectorAll<HTMLElement>(SECTION_TEXT_SELECTORS).forEach((node) => {
      const text = node.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 1) snippets.add(text);
    });

    const narration = Array.from(snippets).slice(0, 6).join('. ');
    return narration ? `${narration}.` : 'Ready to explore.';
  }

  function clearScheduledStep() {
    if (stepTimeoutRef.current === null) return;
    window.clearTimeout(stepTimeoutRef.current);
    stepTimeoutRef.current = null;
  }

  function announce(message: string, options?: { bubbleText?: string; onEnd?: () => void }) {
    const token = ++actionTokenRef.current;
    const bubbleText = options?.bubbleText ?? message;

    setCaption(shortenText(bubbleText));
    clearScheduledStep();

    if (!options?.onEnd) return;

    stepTimeoutRef.current = window.setTimeout(() => {
      stepTimeoutRef.current = null;
      if (actionTokenRef.current !== token) return;
      options.onEnd?.();
    }, getStepDelay(bubbleText, reducedMotion));
  }

  function cancelTour(clearSection = false) {
    actionTokenRef.current += 1;
    clearScheduledStep();
    tourQueueRef.current = [];
    setIsTouring(false);

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
      setCaption('Tour complete. Press Tour anytime for another guided walkthrough.');
      setRobotState('sleeping');
      return;
    }

    const section = GUIDE_SECTIONS.find((item) => item.id === nextId);
    if (!section) {
      continueTour();
      return;
    }

    setActiveSectionId(nextId);
    syncGuideFocus(nextId);
    setRobotPosition(getPositionForSection(nextId));

    document.getElementById(nextId)?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });

    const narration = buildSectionNarration(nextId);

    announce(`${section.label}. ${narration}`, {
      bubbleText: `${section.label}: ${narration}`,
      onEnd: () => {
        continueTour();
      },
    });
  }

  function startFullTour() {
    cancelTour(false);
    setRobotState('awake');
    setIsTouring(true);
    tourQueueRef.current = GUIDE_SECTIONS.map((section) => section.id);

    announce(
      "Hello, I am Nova, Anastasiia's guide robot. I will walk you through the most important parts of this site.",
      {
        bubbleText: 'Hello, I am Nova. I am ready to guide you through the most important parts of this site.',
        onEnd: () => continueTour(),
      },
    );
  }

  function stopTour() {
    cancelTour(true);
    setRobotState('sleeping');
    setCaption('Tour stopped. Press Tour whenever you would like a guided walkthrough.');
  }

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = (event: MediaQueryListEvent) => setReducedMotion(event.matches);

    setReducedMotion(motionQuery.matches);
    setRobotPosition(getDefaultPosition());
    motionQuery.addEventListener('change', handleMotion);

    return () => {
      clearScheduledStep();
      motionQuery.removeEventListener('change', handleMotion);
      syncGuideFocus(null);
      document.body.classList.remove('guide-mode', 'guide-reduced-motion');
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

  const statusLabel = isTouring
    ? 'ON TOUR'
    : robotState === 'awake'
      ? 'AWAKE'
      : 'SLEEPING';

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
          <span>{isTouring ? 'guided tour' : 'ready'}</span>
          <span>
            {activeSectionId
              ? GUIDE_SECTIONS.find((section) => section.id === activeSectionId)?.label ?? 'Tour stop'
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
          ? `touring: ${GUIDE_SECTIONS.find((section) => section.id === activeSectionId)?.label ?? '...'}` 
          : 'ready to guide you'}
      </div>
    </aside>
  );
}

export default GuideRobot;
