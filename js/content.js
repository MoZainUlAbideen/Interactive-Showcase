// ─────────────────────────────────────────────────────────────
//  Everything you'll want to edit as words (and where each podium
//  stands) lives in this one file.
//
//  Map of the pitch, seen from above:
//
//        top  (z = -32)
//    ┌──────────────┬──────────────┐
//    │          INTERESTS    CERTS │
//  B │                             │ O    x runs left (-50) → right (+50)
//  L ▌goal         (o)        goal ▐ R    z runs top (-32) → bottom (+32)
//  U │                             │ A
//  E │           WHO AM I  PROJECTS│ N
//    └──────────────┴──────────────┘ G
//        bottom (z = +32)            E
//
//  Anything marked TODO is a placeholder until the resume / links arrive.
// ─────────────────────────────────────────────────────────────

export const SITE = {
  name: 'Zayn',
  role: 'AI Engineer',
  splashIntro:
    "Hop in my car, knock the ball around, and drive up to the glowing podiums to see who I am, what I've built and what I've learned.",
  socials: [
    { label: 'GitHub', href: 'https://github.com/MoZainUlAbideen' },
    // TODO: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/...' },
  ],
};

// kind: 'about' | 'interests' | 'project' | 'certs'  (changes the floating icon + popup layout)
// color: the podium's glow colour
export const PODIUMS = [
  {
    id: 'about', kind: 'about', label: 'WHO AM I', x: 0, z: 27, color: '#2de2ff',
    panel: {
      kicker: 'Player profile',
      title: 'Who am I',
      paragraphs: [
        "I'm Zayn, an AI Engineer based in Islamabad, Pakistan.",
        "I graduated in Electrical Engineering from NUST in 2026. I like building AI systems that are tested, measured and shipped, not just demoed: real evals, real bugs found and fixed, and interfaces people actually enjoy using.",
      ],
      facts: [
        ['Education', 'B.E. Electrical Engineering, NUST (2026)'],
        ['Experience', 'AI/ML Intern, RISETech / SPS at NSTP'],
        ['Freelance', 'AI/ML work on Upwork'],
        ['Base', 'Islamabad · home in Peshawar'],
      ],
      links: [{ label: 'GitHub', href: 'https://github.com/MoZainUlAbideen' }],
    },
  },
  {
    id: 'interests', kind: 'interests', label: 'MY INTERESTS', x: 0, z: -27, color: '#ff4fd8',
    panel: {
      kicker: 'Off the pitch',
      title: 'My interests',
      comingSoon: true,
      paragraphs: ['This podium is warming up. Check back soon.'],
    },
  },

  // ── Projects: bottom-right corner ──
  {
    id: 'edgariq', kind: 'project', label: 'EDGARIQ', x: 24, z: 27, color: '#a78bfa',
    panel: {
      kicker: 'Project 01',
      title: 'EdgarIQ',
      href: 'https://github.com/MoZainUlAbideen', // TODO: repo or live link
      tagline: 'A research copilot over SEC filings that answers with citations to the exact source page.',
      bullets: [
        'Multi-agent pipeline (drafter, critic, numeric checker) over 10-K, 10-Q and 8-K filings pulled live from SEC EDGAR.',
        'Eval harness with a human-verified golden set, deterministic + LLM-judge grading and regression tracking.',
        'Diagnosed real retrieval failures (wrong-quarter hits, rate limits, encoding) and took the golden-set pass rate from 29% to 100%.',
      ],
      tech: ['Python', 'RAG', 'Ollama', 'Groq', 'Evals'],
      links: [{ label: 'GitHub', href: 'https://github.com/MoZainUlAbideen' }], // TODO
    },
  },
  {
    id: 'rehnuma', kind: 'project', label: 'REHNUMA', x: 31, z: 27, color: '#38bdf8',
    panel: {
      kicker: 'Project 02',
      title: 'Rehnuma',
      href: 'https://rehnuma-kappa.vercel.app',
      tagline: 'An Urdu-first AI copilot that audits Pakistani electricity bills and explains them in plain language.',
      bullets: [
        'Reads a photo of the bill, reconciles every slab and levy, and flags what does not add up.',
        'Guides solar and net-metering households and answers questions on NEPRA policy.',
        'Live product: Docker backend on Render, frontend on Vercel, CI eval gate and Langfuse tracing.',
      ],
      tech: ['Python', 'Gemini vision', 'Groq', 'Docker', 'Langfuse'],
      links: [
        { label: 'Live site', href: 'https://rehnuma-kappa.vercel.app' },
        { label: 'GitHub', href: 'https://github.com/MoZainUlAbideen/rehnuma' },
      ],
    },
  },
  {
    id: 'parity', kind: 'project', label: 'PARITY', x: 38, z: 27, color: '#34d399',
    panel: {
      kicker: 'Project 03',
      title: 'Parity',
      href: 'https://parity-iota-puce.vercel.app',
      tagline: 'An AI web-accessibility auditor that finds, explains and fixes WCAG issues.',
      bullets: [
        'Crawler + axe engine scans a site and turns violations into plain-English explanations and code fixes.',
        'Gemini vision agent catches the issues rule engines miss.',
        'Measured against a labeled benchmark with a baseline eval; deployed on Render + Vercel.',
      ],
      tech: ['Python', 'axe-core', 'Gemini', 'WCAG'],
      links: [
        { label: 'Live site', href: 'https://parity-iota-puce.vercel.app' },
        // TODO: { label: 'GitHub', href: '...' },
      ],
    },
  },
  {
    id: 'jobassist', kind: 'project', label: 'JOB ASSISTANT', x: 44, z: 21, color: '#fbbf24',
    panel: {
      kicker: 'Project 04',
      title: 'Job Search Assistant',
      href: 'https://github.com/MoZainUlAbideen', // TODO: repo or live link
      tagline: 'A Chrome extension + dashboard that scores how well your resume fits a job and suggests grounded rewrites.',
      bullets: [
        'Captures listings straight from your own LinkedIn / Indeed session, no scraping.',
        'Semantic resume-to-JD matching with sentence-transformers + FAISS, and a fit score with gap analysis.',
        'Auto-tailors a downloadable resume for any job above 50% fit.',
      ],
      tech: ['FastAPI', 'FAISS', 'Groq', 'Chrome MV3', 'SQLite'],
      links: [{ label: 'GitHub', href: 'https://github.com/MoZainUlAbideen' }], // TODO
    },
  },

  // ── Certifications: top-right corner ──
  {
    id: 'certs', kind: 'certs', label: 'CERTIFICATIONS', x: 36, z: -26, color: '#ffd23f',
    panel: {
      kicker: 'Trophy cabinet',
      title: 'Certifications',
      items: [
        {
          title: 'Advanced Machine Learning on Google Cloud',
          issuer: 'Google Cloud · Coursera',
          date: 'Sep 2026',
          href: '#', // TODO: Coursera link
        },
      ],
    },
  },
];
