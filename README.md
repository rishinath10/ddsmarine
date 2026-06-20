# DDS Marine Energy Services — Static Site

Plain HTML + Tailwind CSS (Play CDN) + Alpine.js. No build step required.

## Run locally
Just open `index.html` in a browser. Or serve the folder:
```
python3 -m http.server 8000
```
Then visit http://localhost:8000

## Pages
- index.html
- about.html
- services.html
- partners.html
- projects.html
- team.html
- contact.html

## Contact form
The contact form posts to **Formspree**. Sign up at https://formspree.io,
create a form, and replace `YOUR_FORM_ID` in `contact.html` with your form ID
(found in your Formspree dashboard).

## Deploy
Drop the folder on any static host: Netlify, Vercel, Cloudflare Pages,
GitHub Pages, S3, or your own web server.

## Tech notes
- **Tailwind** loaded via Play CDN (`cdn.tailwindcss.com`) — fine for production
  on small/medium sites. For maximum performance, swap to a built CSS file later.
- **Alpine.js** powers the mobile menu and form submit state.
- **Scroll reveal** handled with a tiny IntersectionObserver script (no library).
- All images live in `assets/`.


## SEO

Every page includes page-specific title, description, canonical, Open Graph and Twitter Card metadata. `sitemap.xml` and `robots.txt` are included at the site root. Update `https://www.ddsmarine.com` in the HTML, sitemap and robots files if you deploy to another domain.


## Visual polish

A lightweight preloader, scroll reveal animations, hover elevation and subtle hero media movement are included with reduced-motion fallbacks.
