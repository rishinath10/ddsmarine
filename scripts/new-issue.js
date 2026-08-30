#!/usr/bin/env node
/**
 * Scaffolds a new DDS Weekly Maritime Intelligence issue:
 *   - Prompts for title, date, excerpt, cover image and PDF path
 *   - Auto-generates the slug and next issue number
 *   - Creates content/intelligence/issue-0XX.md with a section skeleton
 *   - Inserts the metadata entry into intelligence-issues.json
 *   - Appends the new issue URL to sitemap.xml
 *
 * Run with: npm run new-issue
 * Then: write the .md file, add the PDF, git add / commit / push.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const ISSUES_JSON = path.join(ROOT, 'intelligence-issues.json');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const CONTENT_DIR = path.join(ROOT, 'content', 'intelligence');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

function pad(n) {
  return String(n).padStart(3, '0');
}

async function main() {
  const issues = JSON.parse(fs.readFileSync(ISSUES_JSON, 'utf-8'));
  const nextNumber = Math.max(0, ...issues.map((i) => i.issueNumber)) + 1;
  const slug = `issue-${pad(nextNumber)}`;

  console.log(`\nScaffolding Issue ${nextNumber} (slug: ${slug})\n`);

  const today = new Date().toISOString().slice(0, 10);
  const date = (await ask(`Date [${today}]: `)) || today;
  const title = (await ask(`Title [DDS Weekly Maritime Intelligence — Issue ${pad(nextNumber)}]: `))
    || `DDS Weekly Maritime Intelligence — Issue ${pad(nextNumber)}`;
  const excerpt = await ask('Excerpt (1-2 sentences for cards & meta description): ');
  const coverImage = (await ask('Cover image path [/assets/offshore-rig.jpg]: ')) || '/assets/offshore-rig.jpg';
  const pdfUrl = (await ask(`PDF path [/assets/intelligence/dds-weekly-intelligence-${slug}.pdf]: `))
    || `/assets/intelligence/dds-weekly-intelligence-${slug}.pdf`;
  const ceoQuote = await ask('CEO pull-quote (optional): ');
  const riskLevel = (await ask('Risk level [Low/Medium/High] (optional): ')) || undefined;

  rl.close();

  const entry = {
    slug,
    issueNumber: nextNumber,
    title,
    date,
    coverImage,
    excerpt,
    stats: [
      { label: 'Brent Crude', value: '', change: '', direction: 'flat' },
      { label: 'WTI Crude', value: '', change: '', direction: 'flat' },
      { label: 'Singapore VLSFO', value: '', change: '', direction: 'flat' },
      { label: 'Singapore MGO', value: '', change: '', direction: 'flat' }
    ],
    ceoQuote: ceoQuote || undefined,
    riskLevel,
    contentFile: `content/intelligence/${slug}.md`,
    highlights: [],
    pdfUrl,
    published: false
  };

  issues.push(entry);
  fs.writeFileSync(ISSUES_JSON, JSON.stringify(issues, null, 2) + '\n');
  console.log(`✅ Added entry to intelligence-issues.json (published: false — flip to true when ready to go live)`);

  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true });
  const mdPath = path.join(CONTENT_DIR, `${slug}.md`);
  const skeleton = `## This Week at a Glance

[Lead paragraph + bullet list of the week's headlines]

## CEO Market Commentary

> **Capt. Dinesh Naidu KC — Founder & Chairman, DDS Marine Group**
>
> "${ceoQuote || '[Pull-quote]'}"

[Full commentary]

## Global Oil Market

| Indicator | Latest | Reading |
|---|---|---|
| Brent crude |  |  |
| WTI crude |  |  |

## Crude Tanker Market

## Clean & Product Tankers

## Bunker Market — Singapore

## Geopolitical & Route Risk

## Sanctions & Compliance Watch

## Southeast Asia & STS Operations

## Seven-Day Outlook

## Sources & Disclaimer

*This publication is for general information only and is not investment, legal, sanctions, insurance, technical, navigational or chartering advice. Market indications can change without notice. Users must independently verify all data and obtain appropriate professional advice before acting. DDS Marine Group accepts no liability for decisions made solely on the basis of this publication.*
`;
  if (!fs.existsSync(mdPath)) {
    fs.writeFileSync(mdPath, skeleton);
    console.log(`✅ Created ${path.relative(ROOT, mdPath)}`);
  } else {
    console.log(`⚠️  ${path.relative(ROOT, mdPath)} already exists, left untouched.`);
  }

  const sitemap = fs.readFileSync(SITEMAP, 'utf-8');
  const newUrl = `  <url><loc>https://www.ddsmarine.com/intelligence/${slug}</loc><lastmod>${date}</lastmod><changefreq>yearly</changefreq><priority>0.6</priority></url>\n`;
  if (!sitemap.includes(`/intelligence/${slug}<`)) {
    const updated = sitemap.replace('</urlset>', newUrl + '</urlset>');
    fs.writeFileSync(SITEMAP, updated);
    console.log('✅ Added URL to sitemap.xml');
  }

  console.log(`\nNext steps:`);
  console.log(`  1. Write the report in ${path.relative(ROOT, mdPath)}`);
  console.log(`  2. Fill in real "stats" values in intelligence-issues.json`);
  console.log(`  3. Add the PDF to ${pdfUrl}`);
  console.log(`  4. Flip "published" to true when ready`);
  console.log(`  5. git add -A && git commit && git push\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
