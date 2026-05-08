import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════
   HERO SECTION — TeamFit AI
   Premium landing hero with glassmorphism,
   floating icons, and smooth animations.
   ═══════════════════════════════════════════ */

const floatingIcons = [
  { src: '/langicons/python-svgrepo-com.svg', alt: 'Python', x: '6%', y: '18%', delay: 0, duration: 12 },
  { src: '/langicons/js-svgrepo-com.svg', alt: 'JS', x: '90%', y: '12%', delay: 1.5, duration: 10 },
  { src: '/langicons/java-svgrepo-com.svg', alt: 'Java', x: '85%', y: '72%', delay: 0.8, duration: 14 },
  { src: '/langicons/python-svgrepo-com.svg', alt: 'Python', x: '4%', y: '75%', delay: 2.2, duration: 11 },
  { src: '/langicons/js-svgrepo-com.svg', alt: 'JS', x: '50%', y: '4%', delay: 0.4, duration: 13 },
  { src: '/langicons/java-svgrepo-com.svg', alt: 'Java', x: '93%', y: '44%', delay: 1.8, duration: 9 },
  { src: '/langicons/python-svgrepo-com.svg', alt: 'Python', x: '12%', y: '48%', delay: 3.0, duration: 15 },
  { src: '/langicons/js-svgrepo-com.svg', alt: 'JS', x: '72%', y: '90%', delay: 2.5, duration: 12 },
];

const codeLines = [
  'def analyze_contribution(team):',
  '    scores = track_keystrokes(team)',
  '    insights = ai.generate(scores)',
  '    return fair_evaluation(insights)',
];

/* ── TeamFit AI Logo (purple lightning bolt) ── */
function TeamFitLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
        fill="url(#heroLogoGrad)"
      />
      <defs>
        <linearGradient id="heroLogoGrad" x1="0" y1="0" x2="48" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#6C5CE7" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function HeroSection() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A14 0%, #0F0F2D 40%, #1A0A2E 70%, #0A0A14 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ── Animated background orbs ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <motion.div
          style={{
            position: 'absolute', width: 600, height: 600, left: '-10%', top: '-20%',
            background: 'radial-gradient(circle, rgba(108,92,231,0.15) 0%, transparent 70%)',
            filter: 'blur(80px)', borderRadius: '50%',
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          style={{
            position: 'absolute', width: 500, height: 500, right: '-5%', bottom: '-10%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
            filter: 'blur(80px)', borderRadius: '50%',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          style={{
            position: 'absolute', width: 400, height: 400, left: '50%', top: '60%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            filter: 'blur(60px)', borderRadius: '50%',
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
      </div>

      {/* ── Grid lines overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(108,92,231,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(108,92,231,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* ── Floating language icons ── */}
      {floatingIcons.map((icon, i) => (
        <motion.img
          key={i}
          src={icon.src}
          alt={icon.alt}
          style={{
            position: 'absolute', left: icon.x, top: icon.y,
            width: 44, height: 44, opacity: 0, pointerEvents: 'none',
          }}
          animate={{
            y: [0, -20, 0, 15, 0],
            rotate: [0, 5, -5, 3, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: icon.duration, repeat: Infinity,
            ease: 'easeInOut', delay: icon.delay,
          }}
        />
      ))}

      {/* ── Main content ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        maxWidth: 800, width: '100%',
        margin: '0 auto', padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
      }}>

        {/* ── Logo + Brand ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 24,
          }}
        >
          <TeamFitLogo size={44} />
          <span style={{
            fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #A29BFE 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            TeamFit AI
          </span>
        </motion.div>

        {/* ── Badge ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 9999, marginBottom: 32,
            background: 'rgba(108,92,231,0.1)',
            border: '1px solid rgba(108,92,231,0.25)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#00D68F',
            boxShadow: '0 0 8px rgba(0,214,143,0.5)',
            animation: 'heroPulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#A29BFE' }}>
            AI-Powered Collaboration Platform
          </span>
        </motion.div>

        {/* ── Headline ── */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 800, lineHeight: 1.1,
            letterSpacing: '-0.03em', margin: '0 0 24px 0',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #E8E8F0 40%, #A29BFE 80%, #6C5CE7 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}
        >
          Eliminate Freeloaders
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #6C5CE7 0%, #A855F7 50%, #D946EF 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            in Group Projects
          </span>
        </motion.h1>

        {/* ── Subtext ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: '#8888AA', lineHeight: 1.7,
            maxWidth: 580, margin: '0 auto 40px auto',
          }}
        >
          Track real-time contributions, analyze performance with AI,{' '}
          <span style={{ color: '#A29BFE' }}>and ensure fair evaluation.</span>
        </motion.p>

        {/* ── CTA Button ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 56,
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(108,92,231,0.5)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '18px 48px', borderRadius: 14,
              background: 'linear-gradient(135deg, #6C5CE7 0%, #A855F7 50%, #D946EF 100%)',
              color: '#FFFFFF', fontSize: 18, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 25px rgba(108,92,231,0.3)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Get Started →
          </motion.button>
        </motion.div>

        {/* ── Code preview card ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          style={{
            width: '100%', maxWidth: 520, margin: '0 auto',
            borderRadius: 16, overflow: 'hidden', textAlign: 'left',
            background: 'rgba(18, 18, 42, 0.7)',
            border: '1px solid rgba(108,92,231,0.15)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(108,92,231,0.06)',
          }}
        >
          {/* Window bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px',
            borderBottom: '1px solid rgba(108,92,231,0.1)',
          }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28CA41' }} />
            <span style={{
              marginLeft: 12, fontSize: 12, color: '#555577',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              teamfit_ai.py
            </span>
          </div>
          {/* Code lines */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {codeLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.9 + i * 0.15 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span style={{
                  fontSize: 12, width: 20, textAlign: 'right', flexShrink: 0,
                  color: '#555577', fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {i + 1}
                </span>
                <code style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre' }}>
                  {highlightSyntax(line)}
                </code>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Trust bar ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          style={{
            marginTop: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 32, flexWrap: 'wrap',
          }}
        >
          {[
            { icon: '⚡', label: 'Real-time Tracking' },
            { icon: '🤖', label: 'AI-Powered Insights' },
            { icon: '👥', label: 'Team Collaboration' },
            { icon: '📊', label: 'Fair Evaluation' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#8888AA' }}>
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Pulse keyframe ── */}
      <style>{`
        @keyframes heroPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </section>
  );
}

/* ── Simple Python syntax highlighter ── */
function highlightSyntax(line) {
  const keywords = ['def', 'return', 'class', 'import', 'from', 'if', 'else', 'for', 'in', 'while'];
  const builtins = ['track_keystrokes', 'ai.generate', 'fair_evaluation', 'analyze_contribution'];

  return line.split(/(\s+|[().,:])/g).map((token, i) => {
    if (keywords.includes(token)) {
      return <span key={i} style={{ color: '#D946EF' }}>{token}</span>;
    }
    if (builtins.some(b => token.includes(b.split('.')[0]))) {
      return <span key={i} style={{ color: '#6C5CE7' }}>{token}</span>;
    }
    if (token.startsWith("'") || token.startsWith('"')) {
      return <span key={i} style={{ color: '#00D68F' }}>{token}</span>;
    }
    if (token === '(' || token === ')' || token === ':' || token === ',') {
      return <span key={i} style={{ color: '#555577' }}>{token}</span>;
    }
    return <span key={i} style={{ color: '#E8E8F0' }}>{token}</span>;
  });
}
