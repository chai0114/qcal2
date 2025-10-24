```markdown
# Queuing Calculator

Single-page static queuing calculator (M/M/1 and M/M/c) with plotting.

How to run locally
1. Put index.html, styles.css, script.js in the same folder.
2. Serve with a simple server:
   - python3 -m http.server 8000
   - Open http://localhost:8000/index.html

How to publish to GitHub Pages
1. Ensure repository `queue-calculator` exists and remote is set.
2. Commit & push the files to main (instructions below).
3. In GitHub: Settings → Pages → Source: main branch / root → Save.
4. Visit: https://chai0114.github.io/queue-calculator

Notes
- Chart.js is loaded from CDN (Chart.umd.min.js). If CDN blocked, download Chart.js and serve locally.
- If you previously had a framework-based app (vite/react), this static site replaces it. Make sure index.html is at repository root.
```