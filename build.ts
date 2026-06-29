import { marked } from "marked";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = import.meta.dir;
const DIST = join(ROOT, "dist");

interface Post {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  tag: string; // 'learning' | 'work' | ...
  summary: string;
  html: string;
}

// Two separate streams, each its own source dir, output dir and index.
// blog = curated (work, best of projects); notes = learning log, kept apart
// so it doesn't dilute the blog. Add a third collection by appending here.
interface Collection {
  src: string; // source dir with the .md files
  out: string; // output dir + URL segment (/blog/, /notes/)
  title: string;
  blurb: string; // one line under the index title
}

const COLLECTIONS: Collection[] = [
  {
    src: "posts",
    out: "blog",
    title: "Blog",
    blurb: "Cosas que construyo: trabajo y lo mejor de mis proyectos.",
  },
  {
    src: "notes",
    out: "notes",
    title: "Notes",
    blurb: "Apuntes de lo que voy aprendiendo.",
  },
];

// --- frontmatter: lines between the first pair of `---` fences ---
function parse(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

const CSS = `
  :root {
    --bg: #eceae5; --panel: #f4f2ee; --border: #d9d6cf;
    --text: #2a2926; --muted: #6b6862; --accent: #555049;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.65;
  }
  .wrap { max-width: 760px; margin: 0 auto; padding: 0 20px; }
  a { color: var(--accent); }
  header.top { padding: 36px 0 8px; }
  header.top a.back { color: var(--muted); font-size: 14px; text-decoration: none; }
  header.top a.back:hover { color: var(--text); }
  h1 { font-size: 34px; font-weight: 600; letter-spacing: -0.5px; margin: 20px 0 6px; }
  .meta { color: var(--muted); font-size: 14px; margin-bottom: 28px; }
  .tag {
    display: inline-block; font-size: 12px; text-transform: uppercase;
    letter-spacing: 0.5px; color: var(--muted); border: 1px solid var(--border);
    border-radius: 4px; padding: 1px 7px; margin-left: 8px;
  }
  article h2 { font-size: 22px; margin: 32px 0 10px; }
  article h3 { font-size: 18px; margin: 24px 0 8px; }
  article p, article ul, article ol { margin: 14px 0; }
  article code {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 4px; padding: 1px 5px; font-size: 13.5px;
  }
  article pre {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 8px; padding: 14px 16px; overflow-x: auto;
  }
  article pre code { background: none; border: none; padding: 0; }
  article blockquote {
    margin: 16px 0; padding: 2px 16px; border-left: 3px solid var(--border);
    color: var(--muted);
  }
  ul.list { list-style: none; margin: 0; padding: 0; }
  ul.list li { padding: 16px 0; border-bottom: 1px solid var(--border); }
  ul.list li:last-child { border-bottom: none; }
  ul.list a.title { font-weight: 600; font-size: 17px; text-decoration: none; }
  ul.list a.title:hover { text-decoration: underline; }
  ul.list .row { display: flex; align-items: baseline; gap: 8px; }
  ul.list .date { color: var(--muted); font-size: 13px; min-width: 92px; }
  ul.list .desc { color: var(--muted); font-size: 14px; margin-top: 4px; }
  footer {
    text-align: center; color: var(--muted); padding: 40px 0 32px;
    font-size: 14px; border-top: 1px solid var(--border); margin-top: 48px;
  }
`;

function shell(title: string, desc: string, body: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <link rel="icon" type="image/x-icon" href="/public/favicon.ico" />
    <style>${CSS}</style>
  </head>
  <body>
    <div class="wrap">
${body}
    </div>
    <footer>© 2026 Alex Bellosta · <a href="/">albebu.me</a></footer>
  </body>
</html>
`;
}

function postPage(p: Post, c: Collection): string {
  return shell(
    `${p.title} — Albebu`,
    p.summary,
    `      <header class="top"><a class="back" href="/${c.out}/">← ${c.title.toLowerCase()}</a></header>
      <h1>${p.title}</h1>
      <div class="meta">${p.date}${p.tag ? `<span class="tag">${p.tag}</span>` : ""}</div>
      <article>
${p.html}
      </article>`,
  );
}

function indexPage(posts: Post[], c: Collection): string {
  const items = posts.length
    ? posts
        .map(
          (p) => `        <li>
          <div class="row">
            <span class="date">${p.date}</span>
            <a class="title" href="/${c.out}/${p.slug}.html">${p.title}</a>
            ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
          </div>
          ${p.summary ? `<div class="desc">${p.summary}</div>` : ""}
        </li>`,
        )
        .join("\n")
    : `        <li><span class="desc">Aún nada por aquí.</span></li>`;

  return shell(
    `${c.title} — Albebu`,
    c.blurb,
    `      <header class="top"><a class="back" href="/">← albebu.me</a></header>
      <h1>${c.title}</h1>
      <div class="meta">${c.blurb}</div>
      <ul class="list">
${items}
      </ul>`,
  );
}

async function buildCollection(c: Collection): Promise<number> {
  const dir = join(ROOT, c.src);
  // Always emit the index (even empty) so /blog/ and /notes/ never 404.
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".md"))
    : [];
  const posts: Post[] = await Promise.all(
    files.map(async (file) => {
      const { meta, body } = parse(await Bun.file(join(dir, file)).text());
      return {
        slug: file.replace(/\.md$/, ""),
        title: meta.title ?? file,
        date: meta.date ?? "",
        tag: meta.tag ?? "",
        summary: meta.summary ?? "",
        html: marked.parse(body, { async: false }) as string,
      };
    }),
  );

  posts.sort((a, b) => b.date.localeCompare(a.date)); // newest first

  mkdirSync(join(DIST, c.out), { recursive: true });
  for (const p of posts)
    await Bun.write(join(DIST, c.out, `${p.slug}.html`), postPage(p, c));
  await Bun.write(join(DIST, c.out, "index.html"), indexPage(posts, c));

  return posts.length;
}

// --- build ---
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// static passthrough
for (const f of ["index.html", "404.html"])
  cpSync(join(ROOT, f), join(DIST, f));
cpSync(join(ROOT, "public"), join(DIST, "public"), { recursive: true });

// one stream per collection
for (const c of COLLECTIONS) {
  const n = await buildCollection(c);
  console.log(`  ${c.out}: ${n} post(s)`);
}
console.log("Built → dist/");
