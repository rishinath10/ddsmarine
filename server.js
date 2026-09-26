require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const compression = require('compression');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const LEAD_TO_EMAIL = process.env.LEAD_TO_EMAIL || 'info@ddsmarine.com';
const RESEND_FROM = process.env.RESEND_FROM || 'DDS Marine Website <onboarding@resend.dev>';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Sends a contact-form submission to LEAD_TO_EMAIL via the Resend API
// (https://api.resend.com/emails). Throws on any failure — the caller
// decides how to handle that (never silently treat a failed send as
// success).
async function sendLeadEmail({ name, company, email, phone, subject, message }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set — cannot send contact form email.');
  }

  const html = `
    <h2>New Website Enquiry</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Company:</strong> ${escapeHtml(company) || '&mdash;'}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone) || '&mdash;'}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [LEAD_TO_EMAIL],
      reply_to: email,
      subject: `New Website Enquiry: ${subject}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API responded ${res.status}: ${body}`);
  }

  return res.json();
}

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(compression());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const SITE_URL = 'https://www.ddsmarine.com';
const ORG_ID = SITE_URL + '/#organization';

// Serialises a schema.org object for a <script type="application/ld+json">
// block. "<" is escaped so HTML inside values (job descriptions, etc.) can
// never close the script tag early.
function ldJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

// Search results cut meta descriptions off around 155-160 characters, so
// longer excerpts are trimmed at a word boundary rather than mid-word.
function metaDescription(text, max = 155) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—–-]+$/, '') + '…';
}

// Helper: load blog posts from JSON
function loadBlogPosts() {
  const filePath = path.join(__dirname, 'blog-posts.json');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const posts = JSON.parse(data);
    return posts.filter(p => p.published).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Error loading blog posts:', err.message);
    return [];
  }
}

// Load ALL posts (including drafts) for preview
function loadAllPosts() {
  const filePath = path.join(__dirname, 'blog-posts.json');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Error loading all posts:', err.message);
    return [];
  }
}

// Helper: load intelligence issues from JSON
function loadIntelligenceIssues() {
  const filePath = path.join(__dirname, 'intelligence-issues.json');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const issues = JSON.parse(data);
    return issues.filter(i => i.published).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Error loading intelligence issues:', err.message);
    return [];
  }
}

// Load ALL issues (including drafts)
function loadAllIntelligenceIssues() {
  const filePath = path.join(__dirname, 'intelligence-issues.json');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Error loading all intelligence issues:', err.message);
    return [];
  }
}

// Helper: load career postings from JSON
function loadCareers() {
  const filePath = path.join(__dirname, 'careers.json');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const postings = JSON.parse(data);
    return postings.filter(p => p.published).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Error loading careers:', err.message);
    return [];
  }
}

// Load ALL postings (including drafts) for preview
function loadAllCareers() {
  const filePath = path.join(__dirname, 'careers.json');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Error loading all careers:', err.message);
    return [];
  }
}

// Slugify heading text for in-page jump-link anchors
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Renders an issue's Markdown content file to HTML (with anchored headings)
// and returns a table of contents plus an estimated reading time.
function renderIssueContent(issue) {
  const empty = { html: '', toc: [], readingTimeMin: 0 };
  if (!issue || !issue.contentFile) return empty;

  const filePath = path.join(__dirname, issue.contentFile);
  let md;
  try {
    md = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error('Error loading intelligence content file:', err.message);
    return empty;
  }

  // Slugs must come from the SAME raw markdown text used for the table of
  // contents, not from post-render HTML (which entity-escapes "&" etc. and
  // would otherwise produce mismatched ids like "clean-amp-product-tankers"
  // vs a toc link of "clean-product-tankers").
  const allTokens = marked.lexer(md);
  const headingTokens = allTokens.filter((t) => t.type === 'heading');

  const seen = new Map();
  const orderedSlugs = headingTokens.map((t) => {
    const base = slugify(t.text);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });

  let headingIndex = 0;
  const html = marked.parse(md)
    .replace(/<h([1-6])>/g, (match, level) => {
      const slug = orderedSlugs[headingIndex] || '';
      headingIndex += 1;
      return `<h${level} id="${slug}">`;
    })
    // Wide tables (freight-rate grids, incident logs) are wider than a phone
    // screen and have no responsive handling by default; without this they
    // force the entire page layout wider, causing horizontal page scroll.
    // Scope the scroll to the table itself instead.
    .replace(/<table>/g, '<div class="overflow-x-auto -mx-1 px-1"><table>')
    .replace(/<\/table>/g, '</table></div>');

  const toc = headingTokens
    .map((t, i) => ({ text: t.text, slug: orderedSlugs[i], depth: t.depth }))
    .filter((t) => t.depth === 2);

  const wordCount = md.split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.round(wordCount / 200));

  return { html, toc, readingTimeMin };
}

// Static SEO files
app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'robots.txt')));

function latestDate(items) {
  return items.map((i) => i.date).filter(Boolean).sort().pop() || null;
}

// Built from the JSON data files on each request, so every published blog
// post, intelligence issue and job posting is listed automatically — no
// hand-editing when new content goes up.
app.get('/sitemap.xml', (req, res) => {
  const posts = loadBlogPosts();
  const issues = loadIntelligenceIssues();
  const careers = loadCareers();

  const entries = [
    { loc: '/', lastmod: latestDate([...posts, ...issues]) },
    { loc: '/about' },
    { loc: '/services' },
    { loc: '/partners' },
    { loc: '/projects' },
    { loc: '/team' },
    { loc: '/contact' },
    { loc: '/careers', lastmod: latestDate(careers) },
    ...careers.map((p) => ({ loc: '/careers/' + p.slug, lastmod: p.date })),
    { loc: '/blog', lastmod: latestDate(posts) },
    ...posts.map((p) => ({ loc: '/blog/' + p.slug, lastmod: p.date })),
    { loc: '/intelligence', lastmod: latestDate(issues) },
    ...issues.map((i) => ({ loc: '/intelligence/' + i.slug, lastmod: i.date }))
  ];

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + entries.map((e) => `  <url><loc>${SITE_URL}${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')
    + '\n</urlset>\n';

  res.type('application/xml').send(xml);
});

// llms.txt (https://llmstxt.org) — a plain-markdown summary of the site for
// AI assistants and answer engines. Generated from the same data files so it
// always lists the current intelligence issues and open roles.
app.get('/llms.txt', (req, res) => {
  const issues = loadIntelligenceIssues();
  const posts = loadBlogPosts();
  const careers = loadCareers();

  const lines = [
    '# DDS Marine Energy Services',
    '',
    '> DDS Marine Energy Services Sdn. Bhd. is a marine energy services company headquartered in Penang, Malaysia (founded 2020). It provides ship-to-ship (STS) transfer services, deep-draft vessel pilotage, mooring master services, bunkering, ship chartering and brokerage, and marine advisory across the Straits of Malacca and Southeast Asia, with offices in Kuala Lumpur, Muar and Singapore and a network reaching Hong Kong, India and Dubai.',
    '',
    'Headquarters: 3J-13-1 Straits Quay, Jalan Seri Tanjung Pinang, Tanjung Tokong, 10470 Pulau Pinang, Malaysia. Phone: +60 16-506 3003. Email: info@ddsmarine.com. Founder & Chairman: Capt. Dinesh Naidu KC.',
    '',
    '## Company',
    '',
    `- [Services](${SITE_URL}/services): STS services provider, marine advisory for the Malacca Straits, mooring master services, POAC services, deep-draft vessel pilotage, bunker survey, OVID inspection, oil spill response, deslopping and tank cleaning, fresh water and provision supply, oil and gas consultancy, ship chartering and brokerage, marine insurance claims, yacht repairs/sales/marketing, bunker fuel supply, DP survey and DP trial, and pre-purchase inspections.`,
    `- [About](${SITE_URL}/about): company history since 2020 and operating principles.`,
    `- [Projects](${SITE_URL}/projects): examples of completed marine operations.`,
    `- [Partners](${SITE_URL}/partners): industry partners and alliance network.`,
    `- [Team](${SITE_URL}/team): leadership and specialists.`,
    `- [Contact](${SITE_URL}/contact): enquiries and office locations.`,
    '',
    '## DDS Weekly Maritime Intelligence',
    '',
    'A weekly briefing on crude and product tanker markets, Singapore and Fujairah bunker pricing, sanctions and compliance, and Southeast Asia maritime and STS risk, written by DDS Marine with named sources for every figure.',
    '',
    ...issues.map((i) => `- [Issue ${String(i.issueNumber).padStart(3, '0')}: ${i.headline || i.title}](${SITE_URL}/intelligence/${i.slug}) (${i.date}): ${i.excerpt}`),
    ''
  ];

  if (posts.length) {
    lines.push('## Blog', '', ...posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}) (${p.date}): ${p.excerpt}`), '');
  }
  if (careers.length) {
    lines.push('## Careers', '', ...careers.map((p) => `- [${p.title}](${SITE_URL}/careers/${p.slug}) — ${p.type}, ${p.location}: ${p.excerpt}`), '');
  }

  res.type('text/plain; charset=utf-8').send(lines.join('\n'));
});

// Routes
app.get('/', (req, res) => {
    const blogPosts = loadBlogPosts();
    const intelligenceIssues = loadIntelligenceIssues();
    res.render('index', {
        title: 'DDS Marine Energy Services | Marine Operations Malaysia',
        description: 'DDS Marine provides STS operations, pilotage, bunkering, chartering and marine advisory from Penang across the Straits of Malacca.',
        path: '/',
        blogPosts: blogPosts,
        latestIssue: intelligenceIssues[0] || null
    });
});

app.get('/about', (req, res) => {
    res.render('about', { 
        title: 'About Us | DDS Marine Energy Services',
        description: 'Learn about DDS Marine Energy Services, our history since 2020, and our commitment to safety, integrity, and global maritime excellence.',
        path: '/about',
        ogImage: 'https://www.ddsmarine.com/assets/offshore-rig.jpg'
    });
});

app.get('/services', (req, res) => {
    res.render('services', { 
        title: 'Services | DDS Marine Operations & Advisory',
        description: 'Comprehensive marine solutions including Ship-to-Ship (STS) transfers, deep-draft pilotage, mooring master services, and POAC services.',
        path: '/services',
        ogImage: 'https://www.ddsmarine.com/assets/sts-operation.jpg'
    });
});

app.get('/partners', (req, res) => {
    res.render('partners', { 
        title: 'Partners | DDS Marine Global Network',
        description: 'DDS Marine collaborates with industry leaders like Petronas, Shell, and Swire Shipping to deliver top-tier marine and energy trading solutions.',
        path: '/partners'
    });
});

app.get('/projects', (req, res) => {
    res.render('projects', { 
        title: 'Projects & Operations | DDS Marine',
        description: 'Explore our portfolio of successful marine operations, vessel chartering, and strategic advisory projects across the globe.',
        path: '/projects'
    });
});

app.get('/team', (req, res) => {
    res.render('team', { 
        title: 'Team | Capt. Dinesh & DDS Marine Leadership',
        description: 'Meet the experienced leadership team behind DDS Marine, led by Managing Director Capt. Dinesh.',
        path: '/team'
    });
});

app.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact Us | DDS Marine Energy Services',
        description: 'Get in touch with DDS Marine for your maritime operations, advisory, and commercial inquiries at our Penang headquarters.',
        path: '/contact',
        formError: req.query.error === '1'
    });
});

app.get('/thankyou', (req, res) => {
    res.render('thankyou', {
        title: 'Message Received | DDS Marine',
        description: 'Thank you for contacting DDS Marine Energy Services. We will get back to you shortly.',
        path: '/thankyou',
        noindex: true
    });
});

// Blog routes
app.get('/blog', (req, res) => {
    const posts = loadBlogPosts();
    res.render('blog', { 
        title: 'Blog | DDS Marine Energy Services',
        description: 'Industry insights, company updates, and technical knowledge from the DDS Marine team.',
        path: '/blog',
        posts: posts,
        post: null
    });
});

app.get('/blog/:slug', (req, res) => {
    const posts = loadAllPosts();
    const post = posts.find(p => p.slug === req.params.slug);
    if (!post) {
        return res.status(404).render('404', {
            title: 'Post Not Found | DDS Marine',
            description: 'The blog post you are looking for does not exist.',
            path: req.path,
            noindex: true
        });
    }
    const postImage = post.ogImage || SITE_URL + '/assets/hero-ship.jpg';
    const articleSchema = ldJson({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: [postImage],
        datePublished: post.date,
        dateModified: post.date,
        author: { '@type': 'Person', name: post.author },
        publisher: { '@id': ORG_ID },
        mainEntityOfPage: { '@type': 'WebPage', '@id': SITE_URL + '/blog/' + post.slug },
        keywords: (post.tags || []).join(', ')
    });

    res.render('blog', {
        title: post.title + ' | DDS Marine Blog',
        description: metaDescription(post.excerpt),
        path: '/blog/' + post.slug,
        ogImage: postImage,
        articleSchema: articleSchema,
        posts: [],
        post: post
    });
});

// Careers routes
app.get('/careers', (req, res) => {
    const postings = loadCareers();
    res.render('careers', {
        title: 'Careers | DDS Marine Energy Services',
        description: 'Explore open roles at DDS Marine Energy Services and join our team of mariners, advisors and operators in Penang, Malaysia.',
        path: '/careers',
        postings: postings,
        posting: null
    });
});

app.get('/careers/:slug', (req, res) => {
    const postings = loadAllCareers();
    const posting = postings.find(p => p.slug === req.params.slug);
    if (!posting) {
        return res.status(404).render('404', {
            title: 'Position Not Found | DDS Marine',
            description: 'The job posting you are looking for does not exist.',
            path: req.path,
            noindex: true
        });
    }
    // JobPosting structured data makes the role eligible for Google's job
    // search listings. validThrough is only emitted when a posting sets it —
    // no expiry date is invented.
    const employmentTypes = { 'full-time': 'FULL_TIME', 'part-time': 'PART_TIME', 'contract': 'CONTRACTOR', 'temporary': 'TEMPORARY', 'internship': 'INTERN' };
    const jobSchema = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: posting.title,
        description: posting.description,
        datePosted: posting.date,
        employmentType: employmentTypes[String(posting.type || '').toLowerCase()] || undefined,
        hiringOrganization: {
            '@type': 'Organization',
            '@id': ORG_ID,
            name: 'DDS Marine Energy Services',
            sameAs: SITE_URL,
            logo: SITE_URL + '/assets/dds-logo-transparent.png'
        },
        jobLocation: {
            '@type': 'Place',
            address: {
                '@type': 'PostalAddress',
                addressLocality: posting.addressLocality || undefined,
                addressRegion: posting.addressRegion || undefined,
                addressCountry: posting.addressCountry || 'MY'
            }
        },
        occupationalCategory: posting.department,
        directApply: false
    };
    if (posting.validThrough) jobSchema.validThrough = posting.validThrough;

    res.render('careers', {
        title: posting.title + ' | Careers | DDS Marine',
        description: metaDescription(posting.excerpt),
        path: '/careers/' + posting.slug,
        ogImage: SITE_URL + '/assets/offshore-rig.jpg',
        articleSchema: ldJson(jobSchema),
        postings: [],
        posting: posting
    });
});

// Intelligence routes
app.get('/intelligence', (req, res) => {
    const issues = loadIntelligenceIssues();
    res.render('intelligence', {
        title: 'DDS Weekly Maritime Intelligence | DDS Marine',
        description: 'Weekly analysis of crude and product tanker markets, bunker pricing, sanctions and compliance, and Southeast Asia maritime risk from DDS Marine.',
        path: '/intelligence',
        issues: issues,
        issue: null
    });
});

app.get('/intelligence/:slug', (req, res) => {
    const allIssues = loadAllIntelligenceIssues();
    const issue = allIssues.find(i => i.slug === req.params.slug);
    if (!issue) {
        return res.status(404).render('404', {
            title: 'Issue Not Found | DDS Marine',
            description: 'The intelligence issue you are looking for does not exist.',
            path: req.path,
            noindex: true
        });
    }

    const published = loadIntelligenceIssues();
    const idx = published.findIndex(i => i.slug === issue.slug);
    const prevIssue = idx >= 0 ? published[idx + 1] : null; // older
    const nextIssue = idx > 0 ? published[idx - 1] : null;  // newer

    const { html: contentHtml, toc, readingTimeMin } = renderIssueContent(issue);
    const ogImageUrl = issue.coverImage ? 'https://www.ddsmarine.com' + issue.coverImage : 'https://www.ddsmarine.com/assets/offshore-rig.jpg';

    const issueNo = String(issue.issueNumber).padStart(3, '0');
    const pageTitle = issue.headline
        ? `Issue ${issueNo}: ${issue.headline} | DDS Marine`
        : issue.title + ' | DDS Marine';

    const articleSchema = ldJson({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: issue.headline ? `DDS Maritime Intelligence Issue ${issueNo}: ${issue.headline}` : issue.title,
        description: issue.excerpt,
        image: [ogImageUrl],
        datePublished: issue.date,
        dateModified: issue.date,
        author: { '@type': 'Person', name: 'Capt. Dinesh Naidu KC', jobTitle: 'Founder & Chairman, DDS Marine Group' },
        publisher: { '@id': ORG_ID },
        mainEntityOfPage: { '@type': 'WebPage', '@id': SITE_URL + '/intelligence/' + issue.slug },
        articleSection: (issue.highlights || []).slice(0, 6)
    });

    res.render('intelligence', {
        title: pageTitle,
        description: metaDescription(issue.excerpt),
        path: '/intelligence/' + issue.slug,
        ogImage: ogImageUrl,
        articleSchema: articleSchema,
        issues: [],
        issue: issue,
        contentHtml: contentHtml,
        toc: toc,
        readingTimeMin: readingTimeMin,
        prevIssue: prevIssue,
        nextIssue: nextIssue
    });
});

// Contact form handler — sends the lead to LEAD_TO_EMAIL via Resend.
app.post('/send-mail', async (req, res) => {
    const { name, company, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.redirect('/contact?error=1');
    }

    try {
        await sendLeadEmail({ name, company, email, phone, subject, message });
        console.log(`Contact form lead sent to ${LEAD_TO_EMAIL} from ${name} (${email}) - Subject: ${subject}`);
        res.redirect('/thankyou');
    } catch (err) {
        console.error('Failed to send contact form email:', err.message);
        res.redirect('/contact?error=1');
    }
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).render('404', {
        title: 'Page Not Found | DDS Marine',
        description: 'The page you are looking for does not exist.',
        path: req.path,
        noindex: true
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
