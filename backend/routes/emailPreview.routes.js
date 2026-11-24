import express from 'express';
import { AppError } from '../error/AppError.js';
import { MAIL_SAMPLES, sampleTemplate } from '../services/email/email.samples.js';
import { renderMail } from '../services/email/email.renderer.js';

// Aperçu des mails pour le développement : `/preview/` (navigation entre les modèles, vue ordinateur ou mobile) et
// `/preview/<exemple>` (le mail seul). Monté hors production seulement (voir server.js) ; les données sont celles de
// `email.samples.js`, rien de réel n'y figure, d'où l'absence d'authentification.
const router = express.Router();

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Le décor est chargé depuis ce même serveur, pas depuis l'adresse publique du site
const assetsUrlOf = (req) => `${req.protocol}://${req.get('host')}/api/mail-assets`;

function renderSample(req, key) {
  const sample = Object.hasOwn(MAIL_SAMPLES, key) ? MAIL_SAMPLES[key] : null;
  if (!sample) throw new AppError('Aperçu inconnu', 404);
  return renderMail(sampleTemplate(key), { ...sample.data, assetsUrl: assetsUrlOf(req) });
}

function navigationHtml() {
  const groups = new Map();
  for (const [key, { group, label }] of Object.entries(MAIL_SAMPLES)) {
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ key, label });
  }
  return [...groups]
    .map(
      ([group, items]) =>
        `<h2>${escapeHtml(group)}</h2>` +
        items.map(({ key, label }) => `<a href="#${key}" data-key="${key}">${escapeHtml(label)}</a>`).join(''),
    )
    .join('');
}

const PAGE_STYLE = `
  :root { color-scheme: light dark; --bg:#eff0f3; --panel:#ffffff; --ink:#171D1E; --muted:#40484C; --primary:#675496; --line:#C0C8CC; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0F1416; --panel:#161c1d; --ink:#DEE3E5; --muted:#C0C8CC; --primary:#b4b3f5; --line:#40484C; } }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Roboto, Arial, sans-serif; background:var(--bg); color:var(--ink); height:100vh; display:grid; grid-template-columns: 270px 1fr; }
  nav { background:var(--panel); border-right:1px solid var(--line); overflow:auto; padding:18px 12px; }
  nav h1 { font-size:18px; margin:0 8px 14px; color:var(--primary); }
  nav h2 { font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin:18px 8px 6px; }
  nav a { display:block; padding:8px 12px; border-radius:16px; color:var(--ink); text-decoration:none; font-size:14px; }
  nav a:hover { background:color-mix(in srgb, var(--primary) 12%, transparent); }
  nav a[aria-current=true] { background:var(--primary); color:var(--panel); }
  main { display:grid; grid-template-rows:auto 1fr; min-width:0; }
  header { display:flex; gap:12px; align-items:center; padding:10px 18px; border-bottom:1px solid var(--line); background:var(--panel); flex-wrap:wrap; }
  header strong { flex:1; min-width:140px; }
  header button, header a { font:inherit; font-size:13px; border:1px solid var(--line); background:transparent; color:var(--ink); border-radius:16px; padding:5px 14px; cursor:pointer; text-decoration:none; }
  header button[aria-pressed=true] { background:var(--primary); color:var(--panel); border-color:var(--primary); }
  .stage { overflow:auto; padding:18px; display:flex; justify-content:center; }
  iframe { border:0; background:#eff0f3; width:100%; max-width:680px; height:100%; min-height:600px; border-radius:12px; box-shadow:0 2px 12px #0003; transition:max-width .2s; }
  iframe.mobile { max-width:375px; }
  @media (max-width: 760px) { body { grid-template-columns:1fr; grid-template-rows:auto 1fr; height:auto; } nav { max-height:34vh; border-right:0; border-bottom:1px solid var(--line); } }
`;

// `base` est l'adresse où le routeur est monté (`/preview/`) : la page marche avec ou sans « / » final
const pageScript = (base) => `
  const base = ${JSON.stringify(base)};
  const links = [...document.querySelectorAll('nav a')];
  const frame = document.getElementById('frame');
  const desktop = document.getElementById('desktop');
  const mobile = document.getElementById('mobile');
  const show = (key) => {
    const link = links.find((l) => l.dataset.key === key) || links[0];
    links.forEach((l) => l.setAttribute('aria-current', String(l === link)));
    frame.src = base + link.dataset.key;
    document.getElementById('title').textContent = link.textContent;
    document.getElementById('raw').href = base + link.dataset.key;
    link.scrollIntoView({ block: 'nearest' });
  };
  const setMobile = (on) => {
    frame.classList.toggle('mobile', on);
    desktop.setAttribute('aria-pressed', String(!on));
    mobile.setAttribute('aria-pressed', String(on));
  };
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  desktop.addEventListener('click', () => setMobile(false));
  mobile.addEventListener('click', () => setMobile(true));
  show(location.hash.slice(1));
`;

router.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aperçu des mails Céleste</title><style>${PAGE_STYLE}</style></head>
<body>
<nav><h1>Mails Céleste</h1>${navigationHtml()}</nav>
<main>
  <header><strong id="title"></strong>
    <button id="desktop" aria-pressed="true">Ordinateur</button><button id="mobile" aria-pressed="false">Mobile</button>
    <a id="raw" target="_blank" rel="noopener">Ouvrir seul</a></header>
  <div class="stage"><iframe id="frame" title="Aperçu du mail"></iframe></div>
</main>
<script>${pageScript(`${req.baseUrl}/`)}</script></body></html>`);
});

router.get('/:sample', (req, res, next) => {
  try {
    res.type('html').send(renderSample(req, req.params.sample));
  } catch (error) {
    next(error);
  }
});

export default router;
