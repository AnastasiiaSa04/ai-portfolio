import { useEffect } from 'react';
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

const AI_FEATURES = [
  'LLM integration with live responses',
  'Context-aware answers about my profile',
  'Easy to integrate into products and websites',
  'Secure and stateless interaction design',
];

function App() {
  useEffect(() => {
  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  let animationFrameId = 0;
  let particles: BackgroundParticle[] = [];

  const initParticles = () => {
    // Меньше частиц — лучше производительность
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

  const CONNECTION_DISTANCE = 90; // уменьшили с 100

  const drawFrame = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Сетка
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Частицы + связи
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,245,255,${p.alpha})`;
      ctx.fill();

      // Только половина связей — в 2 раза быстрее
      for (let j = i + 1; j < len; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        // Избегаем sqrt пока возможно
        if (Math.abs(dx) > CONNECTION_DISTANCE || Math.abs(dy) > CONNECTION_DISTANCE) continue;
        const dist = Math.hypot(dx, dy);
        if (dist < CONNECTION_DISTANCE) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,245,255,${0.1 * (1 - dist / CONNECTION_DISTANCE)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
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
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const cursor = document.getElementById('cursor');
  const trail = document.getElementById('cursor-trail');
  if (!cursor || !trail) return;

  let mx = 0, my = 0, tx = 0, ty = 0;
  let rafId = 0;

  const moveCursor = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };

  const animate = () => {
    cursor.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    tx += (mx - tx) * 0.12;
    ty += (my - ty) * 0.12;
    trail.style.transform = `translate3d(${tx - 10}px, ${ty - 10}px, 0)`;
    rafId = requestAnimationFrame(animate);
  };

  window.addEventListener('mousemove', moveCursor);
  rafId = requestAnimationFrame(animate);

  return () => {
    window.removeEventListener('mousemove', moveCursor);
    cancelAnimationFrame(rafId);
  };
}, []);

  return (
    <div className="portfolio-wrapper">
      <div className="cursor" id="cursor"></div>
      <div className="cursor-trail" id="cursor-trail"></div>
      <canvas id="bg-canvas"></canvas>

      <nav>
        <div className="nav-logo">A.SULOLLARI</div>
        <ul className="nav-links">
<li><a href="#about">About</a></li>
<li><a href="#skills">Skills</a></li>
<li><a href="#experience">Experience</a></li>
<li><a href="#ai-section">AI Twin</a></li>
<li><a href="#contact">Contact</a></li>
        </ul>
      </nav>

      <main>
        <section id="hero">
          <div className="hero-content-wrapper">
            <div className="hero-main">
              <div className="hero-tag">Full-Stack Developer · AI Specialist</div>
              <h1 className="hero-name glitch" data-text="ANASTASIIA SULOLLARI">
                ANASTASIIA<span> SULOLLARI</span>
              </h1>
              <div className="hero-title">Building the future with code and intelligence.</div>
              <p className="hero-desc">
                Specializing in production-grade web applications with integrated AI capabilities.
                Based in Germany, ready for global challenges.
              </p>
              <div className="hero-cta">
                <a href="#contact" className="btn-primary">Connect</a>
                <a href="/resume.pdf" className="btn-secondary">Resume</a>
              </div>
            </div>
            <div className="hero-ai-companion">
              <ChatComponent />
            </div>
          </div>

          <div className="scroll-indicator">
            <div className="scroll-line"></div>
            <span className="scroll-text">Scroll to explore</span>
          </div>
        </section>

        <section id="about">
          <div className="section-label">Identity</div>
          <h2 className="section-title">Who I Am</h2>
          <div className="about-grid">
            <div className="about-text">
              <p>I'm a <strong>Full-Stack Developer</strong> based in Germany, blending pixel-perfect frontend craft with robust backend architecture.</p>
              <p>My path brings <strong>leadership, adaptability, and a relentless drive</strong> to every project.</p>
            </div>
            <div className="about-stats">
<div className="stat-card">
  <span className="stat-number">6+</span>
  <span className="stat-label">Years of leadership</span>
</div>
              <div className="stat-card">
                <span className="stat-number">3</span>
                <span className="stat-label">Languages</span>
              </div>
            </div>
          </div>
        </section>

        <section id="skills">
          <div className="section-label">Technical Arsenal</div>
          <h2 className="section-title">Skills</h2>
          <div className="skills-grid">
            <div className="skill-category">
              <div className="skill-cat-title">Frontend</div>
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
              <div className="skill-cat-title">Backend</div>
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
              <div className="skill-cat-title">AI & Tools</div>
              <div className="skill-item">
                <span className="skill-dot skill-dot-magenta"></span>
                <span className="skill-name">AI Integration</span>
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
          <div className="section-label">AI Integration</div>
          <h2 className="section-title">My AI Twin</h2>

          <div className="ai-wrapper">
            <div className="ai-intro">
              <p>
                This site does not just <strong>show</strong> my AI skills. It demonstrates them live
                through the assistant placed right beside my name in the hero section.
              </p>
              <p>
                Ask it about my work, stack, and availability. It is a practical example of the kind
                of AI experiences <strong>I build for clients</strong>.
              </p>
              <a href="#hero" className="ai-link">Open the assistant in the hero section</a>
            </div>

            <div className="ai-features">
              {AI_FEATURES.map((feature) => (
                <div className="ai-feat" key={feature}>
                  <span className="ai-feat-icon">+</span>
                  <span className="ai-feat-text">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="experience">
          <div className="section-label">Timeline</div>
          <h2 className="section-title">Experience</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-date">DEC 2024 – DEC 2025</div>
              <div className="timeline-role">IT Career Hub</div>
              <div className="timeline-company">Berlin, Germany · Full-Stack Development Training</div>
              <div className="timeline-desc">Advanced full-stack program covering React, Node.js, TypeScript, Docker, and cloud platforms. Focus on building production-grade, AI-integrated web applications.</div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-date">JUN 2023 – JUN 2024</div>
              <div className="timeline-role">Volunteer Interpreter</div>
              <div className="timeline-company">German Red Cross (DRK), Germany</div>
              <div className="timeline-desc">Language mediation DE ↔ RU/UK in medical and social institutions. Assisted with digital applications, authority forms, and cross-cultural communication.</div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-date">MAY 2013 – DEC 2019</div>
              <div className="timeline-role">Director</div>
              <div className="timeline-company">Rosinant Riding School, Ukraine</div>
              <div className="timeline-desc">Full business management: team leadership, tournament organization, PR, budget planning. Led a diverse team and grew the school's community presence significantly.</div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-date">SEP 2010 – MAY 2015</div>
              <div className="timeline-role">State Medical University</div>
              <div className="timeline-company">Ukraine · Education</div>
              <div className="timeline-desc">Academic foundation in analytical thinking, discipline, and scientific rigor — skills that now inform systematic, precision-focused software development.</div>
            </div>
          </div>
        </section>

        <section id="contact">
          <div className="section-label">Let's Connect</div>
          <h2 className="section-title">Contact</h2>
          <div className="contact-grid">
            <div className="contact-links">
              <a href="mailto:sulollarianastasiia@gmail.com" className="contact-link">
                <span className="cl-icon">✉</span>
                <div className="cl-text">
                  <span className="cl-label">Email</span>
                  sulollarianastasiia@gmail.com
                </div>
              </a>
              <a href="https://github.com/AnastasiiaSa04" target="_blank" rel="noreferrer" className="contact-link">
                <span className="cl-icon">⌥</span>
                <div className="cl-text">
                  <span className="cl-label">GitHub</span>
                  github.com/AnastasiiaSa04
                </div>
              </a>
              <a href="https://www.linkedin.com/in/anastasiiasulollaribb3a20369/" target="_blank" rel="noreferrer" className="contact-link">
                <span className="cl-icon">◈</span>
                <div className="cl-text">
                  <span className="cl-label">LinkedIn</span>
                  Anastasiia Sulollari
                </div>
              </a>
            </div>
            <div className="contact-info">
              <p>I'm currently open to <strong style={{ color: 'var(--cyan)' }}>full-time roles, freelance projects,</strong> and <strong style={{ color: 'var(--cyan)' }}>AI integration consulting</strong>.</p>
              <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '20px' }}>📍 Germany, Oschatz · Open to relocation & remote</p>
              <div className="availability">
                <div className="availability-dot"></div>
                AVAILABLE FOR NEW PROJECTS
              </div>
            </div>
          </div>
        </section>

        <footer>
          <span>© 2026 ANASTASIIA SULOLLARI</span>
          <span style={{ color: 'var(--cyan)' }}>FULL-STACK · AI-POWERED · FUTURE-READY</span>
          <span>GERMANY</span>
        </footer>
      </main>
      <GuideRobot />
    </div>
  );
}

export default App;
