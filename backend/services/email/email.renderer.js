import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";

// Les modèles de mail sont à côté de ce fichier (services/email/templates), quel que soit le dossier de lancement
const templatesRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "templates");
const cache = new Map();

// Load all partials once

Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("ifNotEquals", function (arg1, arg2, options) {
  return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('formatText', function (text) {
  if (!text) return ''
  return new Handlebars.SafeString(
    text
      .replace(/&/g, '&') // escape &
      .replace(/</g, '<') // escape <
      .replace(/>/g, '>') // escape >
      .replace(/\n/g, '<br>') // newlines to <br>
      .replace(/\t/g, '    ') // tabs
  )
})

Handlebars.registerHelper('formatText', function (text) {
  if (!text) return ''
  return new Handlebars.SafeString(
    text
      .replace(/&/g, '&') // escape &
      .replace(/</g, '<') // escape <
      .replace(/>/g, '>') // escape >
      .replace(/\n/g, '<br>') // newlines to <br>
      .replace(/\t/g, '    ') // tabs
  )
})

/**
 * Render a full email template.
 * @param {string} templateName - Name of the template file (without .hbs)
 * @param {object} data - Template data
 * @returns {string} Compiled HTML
 */
export function renderMail(templateName, data = {}) {
  const templatesDir = path.join(templatesRoot, "content");
  const basePath = path.join(templatesRoot, "base.html");
  const templatePath = path.join(templatesDir, `${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template ${templateName} not found`);
  }

  const partialsDir = path.join(templatesRoot, "partials");
  fs.readdirSync(partialsDir).forEach((file) => {
    if (file.endsWith(".html")) {
      const name = path.basename(file, ".html");
      const partial = fs.readFileSync(path.join(partialsDir, file), "utf8");
      Handlebars.registerPartial(name, partial);
    }
  });

  // Cache compiled templates
  const cacheKey = `mail-${templateName}-a`;
  cache.delete(cacheKey);
  if (!cache.has(cacheKey)) {
    const base = fs.readFileSync(basePath, "utf8");
    const content = fs.readFileSync(templatePath, "utf8");

    // Combine base and content
    const layout = base.replace("{{{body}}}", content);
    const compiled = Handlebars.compile(layout);
    cache.set(cacheKey, compiled);
  }
  // Delete cache after use

  const compiled = cache.get(cacheKey);
  const result = compiled({
    ...data,
    year: new Date().getFullYear(),
  });
  return result;
}
