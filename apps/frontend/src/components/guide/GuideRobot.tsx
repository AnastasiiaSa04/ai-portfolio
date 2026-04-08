import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './GuideRobot.css';

type GuideLanguage = 'de' | 'en';

type GuideSection = {
  id: string;
  label: string;
};

type RobotState = 'sleeping' | 'awake';

type RobotPosition = {
  x: number;
  y: number;
};

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

function pickGuideVoice(voices: SpeechSynthesisVoice[], language: GuideLanguage) {
  const priorityNames = language === 'de'
    ? ['Anna', 'Petra', 'Markus', 'Yannick']
    : ['Samantha', 'Nicky', 'Daniel', 'Karen', 'Moira', 'Martha'];

  for (const name of priorityNames) {
    const match = voices.find((voice) => voice.name === name);
    if (match) return match;
  }

  return voices.find((voice) => voice.lang.toLowerCase().startsWith(language)) ?? voices[0] ?? null;
}

function getSpeechLocale(language: GuideLanguage) {
  return language === 'de' ? 'de-DE' : 'en-US';
}

function GuideRobot() {
  const { t, i18n } = useTranslation();
  const currentLanguage: GuideLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'de';
  const guideSections: GuideSection[] = [
    { id: 'about', label: t('guide.sections.about') },
    { id: 'skills', label: t('guide.sections.skills') },
    { id: 'experience', label: t('guide.sections.experience') },
    { id: 'ai-section', label: t('guide.sections.aiTwin') },
    { id: 'contact', label: t('guide.sections.contact') },
  ];

  const [robotState, setRobotState] = useState<RobotState>('sleeping');
  const [isTouring, setIsTouring] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [caption, setCaption] = useState(t('guide.idleCaption'));
  const [reducedMotion, setReducedMotion] = useState(false);
  const [robotPosition, setRobotPosition] = useState<RobotPosition>({ x: 0, y: 0 });

  const actionTokenRef = useRef(0);
  const tourQueueRef = useRef<string[]>([]);
  const stepTimeoutRef = useRef<number | null>(null);
  const voicesRef = useRef<Record<GuideLanguage, SpeechSynthesisVoice | null>>({
    de: null,
    en: null,
  });

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

  function getSectionLabel(sectionId: string | null) {
    return guideSections.find((section) => section.id === sectionId)?.label ?? t('guide.meta.tourStop');
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
    if (!section) return t('guide.sectionNotFound');

    const snippets = new Set<string>();
    section.querySelectorAll<HTMLElement>(SECTION_TEXT_SELECTORS).forEach((node) => {
      const text = node.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 1) snippets.add(text);
    });

    const narration = Array.from(snippets).slice(0, 6).join('. ');
    return narration ? `${narration}.` : t('guide.readyToExplore');
  }

  function clearScheduledStep() {
    if (stepTimeoutRef.current === null) return;
    window.clearTimeout(stepTimeoutRef.current);
    stepTimeoutRef.current = null;
  }

  function loadVoices() {
    if (!hasSpeech()) return;

    const voices = window.speechSynthesis.getVoices();
    voicesRef.current = {
      de: pickGuideVoice(voices, 'de'),
      en: pickGuideVoice(voices, 'en'),
    };
  }

  function announce(message: string, options?: { bubbleText?: string; onEnd?: () => void }) {
    const token = ++actionTokenRef.current;
    const bubbleText = options?.bubbleText ?? message;

    setCaption(shortenText(bubbleText));
    clearScheduledStep();

    if (!hasSpeech()) {
      if (!options?.onEnd) return;

      stepTimeoutRef.current = window.setTimeout(() => {
        stepTimeoutRef.current = null;
        if (actionTokenRef.current !== token) return;
        options.onEnd?.();
      }, getStepDelay(bubbleText, reducedMotion));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = getSpeechLocale(currentLanguage);
    utterance.voice = voicesRef.current[currentLanguage];
    utterance.rate = reducedMotion ? 0.98 : currentLanguage === 'de' ? 0.96 : 0.94;
    utterance.pitch = 1.04;
    utterance.volume = 1;

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
    clearScheduledStep();
    tourQueueRef.current = [];
    setIsTouring(false);

    if (hasSpeech()) {
      window.speechSynthesis.cancel();
    }

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
      setRobotState('sleeping');
      announce(t('guide.tourComplete'));
      return;
    }

    const section = guideSections.find((item) => item.id === nextId);
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
    tourQueueRef.current = guideSections.map((section) => section.id);

    announce(t('guide.intro'), {
      bubbleText: t('guide.introBubble'),
      onEnd: () => continueTour(),
    });
  }

  function stopTour() {
    cancelTour(true);
    setRobotState('sleeping');
    announce(t('guide.tourStopped'));
  }

  useEffect(() => {
    if (!isTouring) {
      setCaption(t('guide.idleCaption'));
    }
  }, [i18n.language, isTouring, t]);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = (event: MediaQueryListEvent) => setReducedMotion(event.matches);

    setReducedMotion(motionQuery.matches);
    setRobotPosition(getDefaultPosition());
    motionQuery.addEventListener('change', handleMotion);

    loadVoices();

    if (hasSpeech()) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      clearScheduledStep();
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

  const statusLabel = isTouring
    ? t('guide.status.onTour')
    : robotState === 'awake'
      ? t('guide.status.awake')
      : t('guide.status.sleeping');

  return (
    <aside
      className={`guide-robot ${robotState} ${isTouring ? 'touring' : ''}`}
      aria-label={t('guide.ariaLabel')}
      style={{ transform: `translate3d(${robotPosition.x}px, ${robotPosition.y}px, 0)` }}
    >
      <div className="guide-bubble" aria-live="polite">
        <span className="guide-status">{statusLabel}</span>
        <p>{caption}</p>
        <div className="guide-bubble-meta">
          <span>{isTouring ? t('guide.meta.guidedTour') : t('guide.meta.ready')}</span>
          <span>
            {activeSectionId
              ? getSectionLabel(activeSectionId)
              : t('guide.meta.wholeSite')}
          </span>
        </div>
      </div>

      <div className="guide-action-row">
        <button
          className="guide-action-button guide-action-button-primary"
          type="button"
          onClick={startFullTour}
        >
          {t('guide.buttons.tour')}
        </button>
        <button
          className="guide-action-button guide-action-button-danger"
          type="button"
          onClick={stopTour}
        >
          {t('guide.buttons.stop')}
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
          ? t('guide.captionLine.touring', { section: getSectionLabel(activeSectionId) })
          : t('guide.captionLine.ready')}
      </div>
    </aside>
  );
}

export default GuideRobot;
