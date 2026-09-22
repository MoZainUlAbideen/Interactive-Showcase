# My Interactive Portfolio
## Link: https://interactive-showcase-amber.vercel.app/
A small top-down game on a plain `<canvas>`: walk through the forest, stand next to a
glowing podium, press **E** (or tap **Talk** on a phone) and a popup opens.
No build step, no npm, no libraries. It is just static files.

## Try it on your computer
Browsers block some features on `file://`, so serve the folder instead:

    python3 -m http.server 8000     # then open http://localhost:8000
    # or:  npx serve

Add `?debug` to the URL (e.g. `http://localhost:8000/?debug`) to see the walkable area
(red = blocked) and each podium's interaction radius.

## Put it on Vercel (first time)

### Option A: through GitHub (recommended, updates automatically)
1. Create a free account at github.com and make a **new repository**.
2. Upload everything in this folder to it (the *contents*, so `index.html` is at the top level).
3. Go to vercel.com, sign up with your GitHub account, click **Add New... > Project**.
4. Pick the repository and click **Deploy**. Leave every setting alone.
   Vercel detects a plain static site (Framework Preset: *Other*, no build command).
5. In about a minute you get a link like `your-project.vercel.app`.
   From then on, every change you push to GitHub redeploys the site automatically.

### Option B: from your terminal (no GitHub)
    cd this-folder
    npx vercel        # log in when asked, accept the defaults
    npx vercel --prod # publish to the real URL

## Where to change things
| I want to...                          | Edit                         |
|---------------------------------------|------------------------------|
| Change the popup text / add links     | `js/content.js`              |
| Change the start-screen text          | `js/content.js` and `index.html` |
| Unlock a podium                       | `js/world.js` (`active: true`) + add its text in `js/content.js` |
| Move a podium or rename its label     | `js/world.js` (`pods`)       |
| Change walk/run speed, zoom, size     | top of `js/game.js` (`CFG`)  |
| Change colours                        | top of `css/style.css` (`:root`) |

### Unlocking a podium
1. In `js/world.js`, set `active: true` on the podium (e.g. `projects`).
2. In `js/content.js`, add an entry under `pods` with the same key:

       projects: { title: 'Projects', paragraphs: ['...'], links: [{ label: 'GitHub', href: 'https://...' }] },

### Adding a new zone later
Generate a new map image the same size or larger, save it as `assets/forest.jpg`
(or add another file), then update `width`/`height`, `walk`, `block` and `pods` in `js/world.js`.
Use `?debug` while you tune the walkable shapes.

## Files
    index.html          page structure (start screen, game stage, popup)
    css/style.css       light theme + UI
    js/game.js          the game engine
    js/world.js         map size, walkable ground, obstacles, podiums
    js/content.js       all your words
    js/atlas.js         sprite frame positions (generated from your sprite sheet)
    assets/             map, character sprites, portrait, fonts
