// ─────────────────────────────────────────────────────────────
//  Everything you'll want to edit as words (and where each podium
//  stands) lives in this one file.
//
//  Map of the pitch, seen from above:
//
//        top  (z = -32)
//    ┌──────────────┬──────────────┐
//    │ STACK    LIFE UNCODED   CERTS │
//  B │                             │ O    x runs left (-50) → right (+50)
//  L ▌goal         (o)        goal ▐ R    z runs top (-32) → bottom (+32)
//  U │                             │ A
//  E │ EXPERIENCE  WHO AM I  PROJECTS│ N
//    └──────────────┴──────────────┘ G
//        bottom (z = +32)            E
// ─────────────────────────────────────────────────────────────

export const SITE = {
  name: 'Zain',
  role: 'AI Full Stack Engineer',
  splashIntro:
    "Hop in my car, knock the ball around, and drive up to the glowing podiums to see who I am, what I've built and what I've learned.",
};

const GH = 'https://github.com/MoZainUlAbideen';

// kind: 'about' | 'interests' | 'projects' | 'certs'  (changes the floating icon + popup layout)
// color: the podium's glow colour
// headline: optional big glowing sign floating above the podium's label
// plate: false hides the small label plate (the headline is used instead)
export const PODIUMS = [
  {
    id: 'about', kind: 'about', label: 'WHO AM I', headline: "ZAIN'S HQ", x: 0, z: 27, color: '#2de2ff',
    panel: {
      kicker: "Zain's HQ",
      title: 'Who am I',
      subtitle: 'Muhammad Zain-ul-Abideen · AI Full Stack Engineer · Islamabad, Pakistan',
      paragraphs: [
        'I ship production LLM applications: retrieval-augmented generation, multi-agent pipelines and eval harnesses on Python/FastAPI backends with Next.js frontends, backed by automated tests, CI/CD and observability.',
        'Drive to the EXPERIENCE and STACK podiums for where I have worked and what I build with.',
      ],
      facts: [
        ['Education', 'B.E. Electrical Engineering, NUST · 2022 – 2026'],
      ],
      // Shown under a "Contact" heading. Resume opens in a new tab.
      contact: [
        { label: 'LinkedIn', href: 'https://www.linkedin.com/in/muhammad-zain-ul-abideen-nust/' },
        { label: 'GitHub', href: GH },
        { label: 'Resume', href: 'resume/Muhammad-Zain-ul-Abideen-Resume.pdf' },
        { label: 'Email', href: 'mailto:mu.zainulabideen@gmail.com' },
      ],
    },
  },
  {
    id: 'interests', kind: 'interests', label: 'LIFE UNCODED', headline: 'LIFE UNCODED', plate: false,
    x: 0, z: -27, color: '#ff4fd8',
    panel: {
      kicker: 'Off the pitch',
      title: 'Life Uncoded',
      life: {
        community: {
          heading: 'Community Work',
          items: [
            {
              logo: 'assets/life/wwf.png',
              logoAlt: 'WWF logo',
              role: 'Collaborations Lead',
              org: 'WWF – Pakistan',
              place: 'Peshawar, Khyber Pakhtunkhwa, Pakistan · Remote',
              href: 'https://www.linkedin.com/in/muhammad-zain-ul-abideen-nust/details/experience/',
              text: 'Led the Collaborations team under WWF in support of education initiatives, contributing to awareness and learning activities focused on environmental responsibility and sustainable living. Engaged with communities and helped promote educational efforts that encouraged a greater understanding of conservation and the importance of protecting our environment.',
            },
          ],
        },
        beyond: {
          heading: 'Beyond',
          title: 'Competitive Sports Fanatic',
          items: [
            {
              sport: 'Football',
              logo: 'assets/life/fcb.png',
              logoAlt: 'FC Barcelona crest',
              name: 'FC Barcelona',
              text: "The first complete football match I watched was the 2015 Champions League final, and I've never looked back since. It's a hard love affair with this team, they almost bottle the Champions League every year, but they dismantle Real Madrid three times a year. Hahahah.",
              // hover / tap the badge to pop up the player's photo
              player: { label: 'Player of choice', img: 'assets/life/player.jpg', alt: 'Pedri in the FC Barcelona number 8 shirt' },
            },
            {
              sport: 'Cricket',
              logo: 'assets/life/pak-star.png',
              logoAlt: 'Pakistan cricket star emblem',
              name: 'Pakistan Cricket Team',
              text: "This Love affair has always been one sided. Still can't believe how I end up seeing all their matches ball by ball, well some things are bigger than sports. After all, this is the only sport we play.",
              player: { label: 'Player of choice', img: 'assets/life/player-cricket.jpg', alt: 'Babar Azam celebrating in the Pakistan shirt' },
            },
          ],
        },
      },
    },
  },
  {
    id: 'experience', kind: 'experience', label: 'EXPERIENCE', x: -38, z: 24, color: '#4ade80',
    panel: {
      kicker: 'Career so far',
      title: 'Experience',
      experience: [
        {
          role: 'Machine Learning Engineer Intern',
          org: 'RISETech',
          when: 'Jun – Aug 2025',
          points: [
            'Built the feature set from an underground vibration, magnetic and acoustic sensor node to classify passing vehicles (LTV, HTV, none).',
            'Trained ensemble classifiers (Random Forest, SVM, KNN, LDA, Extra Trees), taking accuracy from 71% to 99%.',
          ],
        },
        {
          role: 'AI Engineer Intern',
          org: 'Software Productivity Strategists (SPS), NSTP',
          when: 'Jun – Aug 2025',
          points: [
            'Built backend features for two flagship products: Business Management System and Cognitive Service Management.',
            'Deployed AI solutions on Microsoft Azure and improved analytics for a security management system.',
          ],
        },
      ],
    },
  },
  {
    id: 'stack', kind: 'stack', label: 'STACK', x: -38, z: -24, color: '#a78bfa',
    panel: {
      kicker: 'What I build with',
      title: 'Stack',
      skills: [
        ['LLM & Agentic AI', ['RAG', 'Hybrid search (BM25, RRF)', 'Multi-agent systems', 'LLM-as-judge evals', 'LangChain', 'Gemini', 'Groq', 'Ollama', 'FAISS', 'ChromaDB', 'Langfuse']],
        ['Machine Learning', ['Scikit-learn', 'PyTorch', 'TensorFlow', 'Keras', 'Ensembles', 'Feature engineering', 'NumPy', 'Pandas']],
        ['Full Stack', ['Python', 'FastAPI', 'Next.js', 'JavaScript', 'MERN', 'SQL', 'SQLAlchemy']],
        ['DevOps & Cloud', ['Docker', 'GitHub Actions', 'CI/CD', 'Testing', 'Vercel', 'Render', 'Azure', 'Google Cloud']],
      ],
    },
  },

  // ── Projects: bottom-right corner ──
  {
    id: 'projects', kind: 'projects', label: 'PROJECTS', x: 38, z: 24, color: '#ff8a1f',
    panel: {
      kicker: 'Highlight reel',
      title: 'Projects',
      items: [
        {
          title: 'Parity',
          href: 'https://parity-iota-puce.vercel.app',
          tagline: 'AI web-accessibility auditor that finds, explains and fixes WCAG 2.2 issues.',
          points: [
            'Runs axe-core in headless Chromium (desktop + mobile) with a pixel-based contrast meter, a keyboard-navigation agent and a Gemini vision agent that rewrites faulty alt text.',
            'Recall on a 24-issue labelled benchmark: 54% with rules alone → 24/24 with zero false alarms.',
            'Hybrid RAG over 1,092 W3C passages; 190+ tests with eval gates in CI.',
          ],
          tech: ['Python', 'FastAPI', 'Playwright', 'Gemini'],
          links: [
            { label: 'Live', href: 'https://parity-iota-puce.vercel.app' },
            { label: 'GitHub', href: `${GH}/Parity` },
          ],
        },
        {
          title: 'Rehnuma',
          href: 'https://rehnuma-kappa.vercel.app',
          tagline: 'Urdu/English AI copilot that audits Pakistani electricity bills.',
          points: [
            'Reads bill photos with Gemini and a self-verifying re-read loop (96.2% field accuracy); forecasts 12 months of bills and prices 2026 solar rules.',
            'Hybrid RAG over 566 NEPRA clauses with a citation critic: 91% top-5 retrieval, out-of-scope questions refused.',
            '319 tests, 20 eval metrics gated in CI, Langfuse tracing with PII masking.',
          ],
          tech: ['Python', 'FastAPI', 'Next.js', 'Gemini'],
          links: [
            { label: 'Live', href: 'https://rehnuma-kappa.vercel.app' },
            { label: 'GitHub', href: `${GH}/rehnuma` },
          ],
        },
        {
          title: 'EdgarIQ',
          href: 'https://edgar-iq-web.vercel.app',
          tagline: 'Grounded multi-agent research copilot over live SEC filings.',
          points: [
            'Planner → retriever → drafter → critic pipeline with a numeric checker that verifies every figure against the source text.',
            'Diagnosed wrong-quarter retrieval and fixed it with metadata-filtered hybrid search: golden-set accuracy 29% → 100%.',
            'Eval harness (deterministic + LLM-as-judge) backed by 89 tests.',
          ],
          tech: ['Python', 'SEC EDGAR', 'Ollama', 'Groq'],
          links: [
            { label: 'Live', href: 'https://edgar-iq-web.vercel.app' },
            { label: 'GitHub', href: `${GH}/Edgar_iq` },
          ],
        },
        {
          title: 'Job Assistant',
          href: `${GH}/Job-Assistant-An-AI-Resume-Fit-Dashboard-Built-From-Scratch-FastAPI-Groq-RAG`,
          tagline: 'Chrome extension + dashboard that scores how well your resume fits a job.',
          points: [
            'Captures listings from your own LinkedIn / Indeed session and matches them semantically with sentence-transformers + FAISS.',
            'Fit score, gap analysis and grounded rewrite suggestions; auto-tailors a resume for jobs above 50% fit.',
          ],
          tech: ['FastAPI', 'Groq', 'FAISS', 'Chrome MV3'],
          links: [
            { label: 'GitHub', href: `${GH}/Job-Assistant-An-AI-Resume-Fit-Dashboard-Built-From-Scratch-FastAPI-Groq-RAG` },
          ],
        },
      ],
    },
  },

  // ── Certifications: top-right corner ──
  {
    id: 'certs', kind: 'certs', label: 'CERTIFICATIONS', x: 38, z: -24, color: '#ffd23f',
    panel: {
      kicker: 'Trophy cabinet',
      title: 'Certifications',
      certs: [
        { title: 'Google AI Professional Certificate', issuer: 'Google · Coursera', href: 'https://www.coursera.org/account/accomplishments/professional-cert/certificate/V00M6JVIR24O' },
        { title: 'Advanced Machine Learning on Google Cloud', issuer: 'Google Cloud · Coursera', href: 'https://www.coursera.org/account/accomplishments/specialization/8ZNO2FZQPFR5' },
        { title: 'IBM Machine Learning Professional Certificate', issuer: 'IBM · Coursera', href: 'https://www.coursera.org/account/accomplishments/specialization/6AF4NKP5SG0W' },
        { title: 'Google Advanced Data Analytics', issuer: 'Google · Coursera', href: 'https://www.coursera.org/account/accomplishments/specialization/2M7FIVKXPNCE' },
        { title: 'Google AI Essentials', issuer: 'Google · Coursera', href: 'https://www.coursera.org/account/accomplishments/specialization/certificate/HFGV9W2AM02V' },
      ],
    },
  },
];
