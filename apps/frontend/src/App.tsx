import React, { useEffect } from 'react';
import ChatComponent from './components/chat/ChatComponent';
import './components/hero/Hero.css';
import './components/about/About.css'
import './components/chat/Chat.css'
import './components/skills/Skills.css'
import './components/experience/Experience.css'
import './components/AI/AIsection.css'
import './components/contact/Contact.css'
import './components/footer/Footer.css'

function App() {

  useEffect(() => {
  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  let particles: any[] = [];
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();
  };

  const init = () => {
    particles = [];
    const count = Math.floor(window.innerWidth / 12);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2
      });
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const step = 80;
    ctx.strokeStyle = 'rgba(0,245,255,0.04)';
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 245, 255, ${p.alpha})`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0, 245, 255, ${0.12 * (1 - dist / 100)})`;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
    requestAnimationFrame(draw);
  };

  window.addEventListener('resize', resize);
  resize(); draw();
  return () => window.removeEventListener('resize', resize);
}, []);

useEffect(() => {
  const observerOptions = { threshold: 0.2 };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.timeline-item').forEach(item => observer.observe(item));

  return () => observer.disconnect();
}, []);

  useEffect(() => {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let particles: any[] = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
      size = Math.random() * 2;
      speedY = (Math.random() - 0.5) * 0.3;

      update() {
        this.y += this.speedY;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = 'rgba(0, 245, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < 60; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize(); init(); animate();

    const cursor = document.getElementById('cursor');
    const trail = document.getElementById('cursor-trail');

    const moveCursor = (e: MouseEvent) => {
      if (cursor && trail) {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        setTimeout(() => {
          trail.style.transform = `translate3d(${e.clientX - 10}px, ${e.clientY - 10}px, 0)`;
        }, 50);
      }
    };

    window.addEventListener('mousemove', moveCursor);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', moveCursor);
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
          <li><a href="#ai-section">AI Twin</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>

      <main style={{ position: 'relative', zIndex: 10 }}>
 <section id="hero">
  <div className="hero-content-wrapper">
    <div className="hero-main">
      <div className="hero-tag">Full-Stack Developer · AI Specialist</div>
      <h1 className="hero-name glitch">ANASTASIIA<span> SULOLLARI</span></h1>
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

        <section id="about" style={{ opacity: 1, visibility: 'visible' }}>
          <div className="section-label">Identity</div>
          <h2 className="section-title">Who I Am</h2>
          <div className="about-grid">
            <div className="about-text">
              <p>I'm a <strong>Full-Stack Developer</strong> based in Germany, blending pixel-perfect frontend craft with robust backend architecture.</p>
              <p>My path brings <strong>leadership, adaptability, and a relentless drive</strong> to every project.</p>
            </div>
            <div className="about-stats">
              <div className="stat-card">
                <span className="stat-number">2026</span>
                <span className="stat-label">Current Year</span>
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

    <section id="ai-section">
  <div className="section-label">AI Integration</div>
  <h2 className="section-title">My AI Twin</h2>
  
  <div className="ai-wrapper">
    <div className="ai-intro">
      <p>This site doesn't just <strong>show</strong> my AI skills — it <strong>demonstrates</strong> them in real time. The widget on the right is powered by LLM, trained on my profile, experience, and tech stack.</p>
      <p>Ask it anything about my work, skills, or availability. It's the future of personal branding — and it's the kind of thing <strong>I build for clients</strong>.</p>
      
      <div className="ai-features">
        <div className="ai-feat">
          <span className="ai-feat-icon">⚡</span>
          <span className="ai-feat-text">LLM Integration — live responses</span>
        </div>
        <div className="ai-feat">
          <span className="ai-feat-icon">🧠</span>
          <span className="ai-feat-text">Context-aware about my profile</span>
        </div>
        <div className="ai-feat">
          <span className="ai-feat-icon">🔗</span>
          <span className="ai-feat-text">Integrable in any web app or product</span>
        </div>
        <div className="ai-feat">
          <span className="ai-feat-icon">🛡️</span>
          <span className="ai-feat-text">Secure & stateless — no data stored</span>
        </div>
      </div>
    </div>

    <div className="ai-widget-container">

      <ChatComponent />
    </div>
  </div>
</section>

    <div className="skill-category">
      <div className="skill-cat-title">AI & Tools</div>
      <div className="skill-item">
        <span className="skill-dot" style={{ background: 'var(--magenta)', boxShadow: '0 0 8px var(--magenta)' }}></span>
        <span className="skill-name">AI Integration</span>
        <div className="skill-bar"><div className="skill-fill" style={{ width: '82%', background: 'var(--magenta)' }}></div></div>
      </div>
      <div className="skill-item">
        <span className="skill-dot" style={{ background: 'var(--magenta)', boxShadow: '0 0 8px var(--magenta)' }}></span>
        <span className="skill-name">Docker / Cloud</span>
        <div className="skill-bar"><div className="skill-fill" style={{ width: '75%', background: 'var(--magenta)' }}></div></div>
      </div>
      <div className="skill-item">
        <span className="skill-dot" style={{ background: 'var(--magenta)', boxShadow: '0 0 8px var(--magenta)' }}></span>
        <span className="skill-name">MySQL / MongoDB</span>
        <div className="skill-bar"><div className="skill-fill" style={{ width: '80%', background: 'var(--magenta)' }}></div></div>
      </div>
    </div>
  </div>
</section>
<section id="experience">
  <div className="section-label">Timeline</div>
  <h2 className="section-title">Experience</h2>
  <div className="timeline">
    
    <div className="timeline-item visible">
      <div className="timeline-dot"></div>
      <div className="timeline-date">DEC 2024 – DEC 2025</div>
      <div className="timeline-role">IT Career Hub</div>
      <div className="timeline-company">Berlin, Germany · Full-Stack Development Training</div>
      <div className="timeline-desc">Advanced full-stack program covering React, Node.js, TypeScript, Docker, and cloud platforms. Focus on building production-grade, AI-integrated web applications.</div>
    </div>

    <div className="timeline-item visible">
      <div className="timeline-dot"></div>
      <div className="timeline-date">JUN 2023 – JUN 2024</div>
      <div className="timeline-role">Volunteer Interpreter</div>
      <div className="timeline-company">German Red Cross (DRK), Germany</div>
      <div className="timeline-desc">Language mediation DE ↔ RU/UK in medical and social institutions. Assisted with digital applications, authority forms, and cross-cultural communication.</div>
    </div>

    <div className="timeline-item visible">
      <div className="timeline-dot"></div>
      <div className="timeline-date">MAY 2013 – DEC 2019</div>
      <div className="timeline-role">Director</div>
      <div className="timeline-company">Rosinant Riding School, Ukraine</div>
      <div className="timeline-desc">Full business management: team leadership, tournament organization, PR, budget planning. Led a diverse team and grew the school's community presence significantly.</div>
    </div>

    <div className="timeline-item visible">
      <div className="timeline-dot"></div>
      <div className="timeline-date">SEP 2010 – MAY 2015</div>
      <div className="timeline-role">State Medical University</div>
      <div className="timeline-company">Ukraine · Education</div>
      <div className="timeline-desc">Academic foundation in analytical thinking, discipline, and scientific rigor — skills that now inform systematic, precision-focused software development.</div>
    </div>

  </div>
</section>

        {/* AI SECTION
        <section id="ai-section">
           <div className="section-label">Intelligence</div>
           <h2 className="section-title">AI Twin Demo</h2>
           <ChatComponent />
        </section> */}
        {/* CONTACT SECTION */}
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
      <p>I'm currently open to <strong style={{color:'var(--cyan)'}}>full-time roles, freelance projects,</strong> and <strong style={{color:'var(--cyan)'}}>AI integration consulting</strong>.</p>
      <p style={{color:'var(--text-dim)', fontSize:'14px', marginTop: '20px'}}>📍 Germany, Oschatz · Open to relocation & remote</p>
      <div className="availability">
        <div className="status-dot"></div>
        AVAILABLE FOR NEW PROJECTS
      </div>
    </div>
  </div>
</section>

<footer>
  <span>© 2026 ANASTASIIA SULOLLARI</span>
  <span style={{color:'var(--cyan)'}}>FULL-STACK · AI-POWERED · FUTURE-READY</span>
  <span>GERMANY</span>
</footer>
      </main>
    </div>
  );
}

export default App;
