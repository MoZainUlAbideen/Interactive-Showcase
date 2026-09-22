// ─────────────────────────────────────────────────────────────
//  Everything you'll want to edit as words lives here.
//  (Where podiums stand on the map is in js/world.js.)
// ─────────────────────────────────────────────────────────────
window.SITE = {
  name: 'Zayn',
  role: 'AI Engineer',

  // Paragraph on the start screen.
  splashIntro:
    "Step into my little corner of the forest. Walk around, find the glowing podiums, and open them to see what each one holds.",

  // Popup text for each ACTIVE podium. The key must match a podium `id` in js/world.js.
  pods: {
    about: {
      title: 'Who am I',
      paragraphs: [
        "Hi, I am Zayn, an AI Engineer.",
        "I like turning machine-learning ideas into things people can actually use. This forest is my portfolio, and each podium opens a different part of my work.",
        "More podiums are on the way. The locked ones will open as I finish building them.",
      ],
      // Optional buttons under the text, e.g.
      // links: [{ label: 'GitHub', href: 'https://github.com/your-name' }],
      links: [],
    },
  },

  // Shown when Zayn stands next to a podium that is not open yet.
  lockedHint: 'Coming soon',
};
