import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import mjml2html from "mjml";

// Les modèles de mail sont à côté de ce fichier (services/email/templates), quel que soit le dossier de lancement :
//   base.mjml            l'enveloppe (en-tête, pied, styles) : `{{{body}}}` y reçoit le contenu
//   content/<nom>.mjml   le contenu d'un mail (des <mj-section>), c'est ce nom que l'on passe à `renderMail`
//   partials/<nom>.mjml  les morceaux partagés (`{{> hello }}`, `{{> button href=... label=... }}`, `{{> demand }}`...)
// La fabrication se fait en deux temps : Handlebars remplit les données (et échappe le HTML), puis MJML produit le HTML
// des clients de messagerie (tables, styles en ligne, Outlook). Le décor (PNG) est servi par `/api/mail-assets`.
const templatesRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "templates");
const contentDir = path.join(templatesRoot, "content");
const partialsDir = path.join(templatesRoot, "partials");

/** Adresse du site, cible des boutons « Se connecter à Céleste » */
export const SITE_URL = "https://celeste-app.fr";

// En production les modèles ne changent pas : on garde les modèles compilés. Ailleurs on relit les fichiers à chaque
// rendu, pour voir une modification en rechargeant la page d'aperçu.
const useCache = process.env.NODE_ENV === "production";
const compiledCache = new Map();

const handlebars = Handlebars.create();

handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper("ifNotEquals", function (arg1, arg2, options) {
  return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
});

// Le nombre 0 est une valeur à afficher : `{{#if (isNumber balance)}}` ne confond pas « solde nul » et « solde inconnu »
handlebars.registerHelper("isNumber", (value) => typeof value === "number");

// Un texte selon le destinataire d'un mail de points : `(byRole role "pour le receveur" "pour l'expéditeur")`
handlebars.registerHelper("byRole", (role, forReceiver, forSender) => (role === "receiver" ? forReceiver : forSender));

// Texte libre de l'utilisateur : HTML échappé, retours à la ligne en <br>, tabulations en espaces
handlebars.registerHelper("formatText", function (text) {
  if (!text) return "";
  return new handlebars.SafeString(
    handlebars
      .escapeExpression(String(text))
      .replace(/\r?\n/g, "<br>")
      .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;"),
  );
});

function registerPartials() {
  for (const file of fs.readdirSync(partialsDir)) {
    if (file.endsWith(".mjml")) {
      handlebars.registerPartial(path.basename(file, ".mjml"), fs.readFileSync(path.join(partialsDir, file), "utf8"));
    }
  }
}

function compileTemplate(templateName) {
  const templatePath = path.join(contentDir, `${templateName}.mjml`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template ${templateName} not found`);
  }
  registerPartials();
  const base = fs.readFileSync(path.join(templatesRoot, "base.mjml"), "utf8");
  const content = fs.readFileSync(templatePath, "utf8");
  return handlebars.compile(base.replace("{{{body}}}", () => content));
}

/** Noms des modèles disponibles (les fichiers de `templates/content`), dans l'ordre alphabétique */
export function listTemplates() {
  return fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith(".mjml"))
    .map((file) => path.basename(file, ".mjml"))
    .sort();
}

/** Adresse publique d'où les clients de messagerie chargent le décor des mails */
export function defaultAssetsUrl() {
  const front = (process.env.FRONT_URL || process.env.FRONTEND_URL || "").replace(/\/$/, "");
  return process.env.MAIL_ASSETS_URL || `${front}/api/mail-assets`;
}

/**
 * Au démarrage, en production : prévient quand le décor des mails ne pourra pas se charger. Sans `MAIL_ASSETS_URL` ni `FRONT_URL` /
 * `FRONTEND_URL`, l'adresse est relative (`/api/mail-assets`) et aucun client de messagerie ne peut l'ouvrir : les mails partent, sans
 * leur en-tête ni leur pied illustrés, et rien ne le signale.
 */
export function checkMailAssetsUrl() {
  if (process.env.NODE_ENV === "production" && !/^https?:\/\//.test(defaultAssetsUrl())) {
    console.warn(
      `⚠️ Mails : l'adresse du décor (${defaultAssetsUrl()}) n'est pas absolue. Définissez MAIL_ASSETS_URL (ou FRONT_URL) pour que les images des mails s'affichent.`,
    );
  }
}

/**
 * Fabrique le HTML d'un mail.
 * @param {string} templateName - Nom du modèle (fichier de `templates/content`, sans extension)
 * @param {object} data - Données du modèle ; `assetsUrl` remplace l'adresse du décor (l'aperçu y met son propre serveur)
 * @returns {string} HTML prêt à envoyer
 */
export function renderMail(templateName, data = {}) {
  let compiled = useCache ? compiledCache.get(templateName) : null;
  if (!compiled) {
    compiled = compileTemplate(templateName);
    if (useCache) compiledCache.set(templateName, compiled);
  }

  const mjmlSource = compiled({
    assetsUrl: defaultAssetsUrl(),
    siteUrl: SITE_URL,
    ...data,
    year: new Date().getFullYear(),
  });

  const { html, errors } = mjml2html(mjmlSource, { validationLevel: "soft" });
  if (errors?.length) {
    console.error(`[mail] ${templateName} : ${errors.map((e) => `${e.message} (ligne ${e.line})`).join("; ")}`);
  }
  return html;
}
