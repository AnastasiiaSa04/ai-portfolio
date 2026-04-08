import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ChatComponent from './components/chat/ChatComponent';
import GuideRobot from './components/guide/GuideRobot';
import './components/hero/Hero.css';
import './components/about/About.css';
import './components/chat/Chat.css';
import './components/skills/Skills.css';
import './components/experience/Experience.css';
import './components/AI/AIsection.css';
import './components/contact/Contact.css';
import './components/footer/Footer.css';

type BackgroundParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
};

type ExperienceItem = {
  date: string;
  role: string;
  company: string;
  description: string;
};

function App() {
  const { t, i18n } = useTranslation();

  const navItems = [
    { href: '#about', label: t('nav.about') },
    { href: '#skills', label: t('nav.skills') },
    { href: '#experience', label: t('nav.experience') },
    { href: '#ai-section', label: t('nav.aiTwin') },
    { href: '#contact', label: t('nav.contact') },
  ];

  const aiFeatures = t('ai.features', { returnObjects: true }) as string[];
  const experienceItems = t('experience.items', { returnObjects: true }) as ExperienceItem[];
  const currentLanguage = i18n.resolvedLanguage?.startsWith('de') ? 'de' : 'en';

  useEffect(() => {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animationFrameId = 0;
    let particles: BackgroundParticle[] = [];

    const initParticles = () => {
      const count = Math.min(60, Math.floor(window.innerWidth / 20));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.2 + 0.4,
        alpha: Math.random() * 0.5 + 0.15,
      }));
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const connectionDistance = 90;

    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 245, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const len = particles.length;
      for (let index = 0; index < len; index += 1) {
        const particle = particles[index];
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,255,${particle.alpha})`;
        ctx.fill();

        for (let innerIndex = index + 1; innerIndex < len; innerIndex += 1) {
          const neighbor = particles[innerIndex];
          const dx = particle.x - neighbor.x;
          const dy = particle.y - neighbor.y;
          if (Math.abs(dx) > connectionDistance || Math.abs(dy) > connectionDistance) continue;
          const distance = Math.hypot(dx, dy);
          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,245,255,${0.1 * (1 - distance / connectionDistance)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(neighbor.x, neighbor.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = window.requestAnimationFrame(drawFrame);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawFrame();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.2 },
    );

    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const cursor = document.getElementById('cursor');
    const trail = document.getElementById('cursor-trail');
    if (!cursor || !trail) return;

    let mouseX = 0;
    let mouseY = 0;
    let trailX = 0;
    let trailY = 0;
    let animationFrameId = 0;

    const moveCursor = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const animate = () => {
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      trailX += (mouseX - trailX) * 0.12;
      trailY += (mouseY - trailY) * 0.12;
      trail.style.transform = `translate3d(${trailX - 10}px, ${trailY - 10}px, 0)`;
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', moveCursor);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="portfolio-wrapper">
      <div className="cursor" id="cursor"></div>
      <div className="cursor-trail" id="cursor-trail"></div>
      <canvas id="bg-canvas"></canvas>

      <nav>
        <div className="nav-logo">A.SULOLLARI</div>
        <div className="nav-actions">
          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
          <div className="language-switcher" role="group" aria-label={t('languageSwitcher.label')}>
            <button
              type="button"
              className={`language-button ${currentLanguage === 'en' ? 'active' : ''}`}
              aria-pressed={currentLanguage === 'en'}
              onClick={() => void i18n.changeLanguage('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`language-button ${currentLanguage === 'de' ? 'active' : ''}`}
              aria-pressed={currentLanguage === 'de'}
              onClick={() => void i18n.changeLanguage('de')}
            >
              DE
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section id="hero">
          <div className="hero-content-wrapper">
            <div className="hero-main">
              <div className="hero-tag">{t('hero.tag')}</div>
              <h1 className="hero-name glitch" data-text="ANASTASIIA SULOLLARI">
                ANASTASIIA<span> SULOLLARI</span>
              </h1>
              <div className="hero-title">{t('hero.title')}</div>
              <p className="hero-desc">{t('hero.description')}</p>
              <div className="hero-cta">
                <a href="#contact" className="btn-primary">{t('hero.cta.connect')}</a>
                <a href="/resume.pdf" className="btn-secondary">{t('hero.cta.resume')}</a>
              </div>
            </div>
            <div className="hero-ai-companion">
              <ChatComponent />
            </div>
          </div>

          <div className="scroll-indicator">
            <div className="scroll-line"></div>
            <span className="scroll-text">{t('hero.scroll')}</span>
          </div>
        </section>

        <section id="about">
          <div className="section-label">{t('about.label')}</div>
          <h2 className="section-title">{t('about.title')}</h2>
          <div className="about-grid">
            <div className="about-text">
              <p>{t('about.paragraph1')}</p>
              <p>{t('about.paragraph2')}</p>
            </div>
            <div className="about-stats">
              <div className="stat-card">
                <span className="stat-number">6+</span>
                <span className="stat-label">{t('about.stats.leadership')}</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">3</span>
                <span className="stat-label">{t('about.stats.languages')}</span>
              </div>
            </div>
          </div>
        </section>

        <section id="skills">
          <div className="section-label">{t('skills.label')}</div>
          <h2 className="section-title">{t('skills.title')}</h2>
          <div className="skills-grid">
            <div className="skill-category">
              <div className="skill-cat-title">{t('skills.categories.frontend')}</div>
              <div className="skill-item">
                <span className="skill-dot"></span>
                <span className="skill-name">React / Redux</span>
                <div className="skill-bar"><div className="skill-fill" style={{ width: '90%' }}></div></div>
              </div>
              <div className="skill-item">
                <span className="skill-dot"></span>
                <span className="skill-name">JavaScript (ES6+)</span>
                <div className="skill-bar"><div className="skill-fill" style={{ width: '88%' }}></div></div>
              </div>
              <div className="skill-item">
                <span className="skill-dot"></span>
                <span className="skill-name">HTML / CSS</span>
                <div className="skill-bar"><div className="skill-fill" style={{ width: '95%' }}></div></div>
              </div>
            </div>
            <div className="skill-category">
              <div className="skill-cat-title">{t('skills.categories.backend')}</div>
              <div className="skill-item">
                <span className="skill-dot"></span>
                <span className="skill-name">Node.js / Express</span>
                <div className="skill-bar"><div className="skill-fill" style={{ width: '85%' }}></div></div>
              </div>
              <div className="skill-item">
                <span className="skill-dot"></span>
                <span className="skill-name">TypeScript</span>
                <div className="skill-bar"><div className="skill-fill" style={{ width: '80%' }}></div></div>
              </div>
              <div className="skill-item">
                <span className="skill-dot"></span>
                <span className="skill-name">REST APIs</span>
                <div className="skill-bar"><div className="skill-fill" style={{ width: '88%' }}></div></div>
              </div>
            </div>
            <div className="skill-category">
              <div className="skill-cat-title">{t('skills.categories.aiTools')}</div>
              <div className="skill-item">
                <span className="skill-dot skill-dot-magenta"></span>
                <span className="skill-name">{t('skills.items.aiIntegration')}</span>
                <div className="skill-bar"><div className="skill-fill skill-fill-magenta" style={{ width: '82%' }}></div></div>
              </div>
              <div className="skill-item">
                <span className="skill-dot skill-dot-magenta"></span>
                <span className="skill-name">Docker / Cloud</span>
                <div className="skill-bar"><div className="skill-fill skill-fill-magenta" style={{ width: '75%' }}></div></div>
              </div>
              <div className="skill-item">
                <span className="skill-dot skill-dot-magenta"></span>
                <span className="skill-name">MySQL / MongoDB</span>
                <div className="skill-bar"><div className="skill-fill skill-fill-magenta" style={{ width: '80%' }}></div></div>
              </div>
            </div>
          </div>
        </section>

        <section id="ai-section">
          <div className="section-label">{t('ai.label')}</div>
          <h2 className="section-title">{t('ai.title')}</h2>

          <div className="ai-wrapper">
            <div className="ai-intro">
              <p>{t('ai.intro1')}</p>
              <p>{t('ai.intro2')}</p>
              <a href="#hero" className="ai-link">{t('ai.link')}</a>
            </div>

            <div className="ai-features">
              {aiFeatures.map((feature) => (
                <div className="ai-feat" key={feature}>
                  <span className="ai-feat-icon">+</span>
                  <span className="ai-feat-text">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="experience">
          <div className="section-label">{t('experience.label')}</div>
          <h2 className="section-title">{t('experience.title')}</h2>
          <div className="timeline">
            {experienceItems.map((item) => (
              <div className="timeline-item" key={`${item.date}-${item.role}`}>
                <div className="timeline-dot"></div>
                <div className="timeline-date">{item.date}</div>
                <div className="timeline-role">{item.role}</div>
                <div className="timeline-company">{item.company}</div>
                <div className="timeline-desc">{item.description}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="contact">
          <div className="section-label">{t('contact.label')}</div>
          <h2 className="section-title">{t('contact.title')}</h2>
          <div className="contact-grid">
            <div className="contact-links">
              <a href="mailto:sulollarianastasiia@gmail.com" className="contact-link">
                <span className="cl-icon">✉</span>
                <div className="cl-text">
                  <span className="cl-label">{t('contact.links.email')}</span>
                  sulollarianastasiia@gmail.com
                </div>
              </a>
              <a href="https://github.com/AnastasiiaSa04" target="_blank" rel="noreferrer" className="contact-link">
                <span className="cl-icon">⌥</span>
                <div className="cl-text">
                  <span className="cl-label">{t('contact.links.github')}</span>
                  github.com/AnastasiiaSa04
                </div>
              </a>
              <a href="https://www.linkedin.com/in/anastasiiasulollaribb3a20369/" target="_blank" rel="noreferrer" className="contact-link">
                <span className="cl-icon">◈</span>
                <div className="cl-text">
                  <span className="cl-label">{t('contact.links.linkedin')}</span>
                  Anastasiia Sulollari
                </div>
              </a>
            </div>
            <div className="contact-info">
              <p>{t('contact.opportunities')}</p>
              <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '20px' }}>
                {t('contact.location')}
              </p>
              <div className="availability">
                <div className="availability-dot"></div>
                {t('contact.availability')}
              </div>
            </div>
          </div>
        </section>

        <footer>
          <span>{t('footer.copyright')}</span>
          <span style={{ color: 'var(--cyan)' }}>{t('footer.tagline')}</span>
          <span>{t('footer.country')}</span>
        </footer>
      </main>
      <GuideRobot />
    </div>
  );
}

export default App;
