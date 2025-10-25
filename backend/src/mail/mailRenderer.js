import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

const __dirname = path.resolve();
const cache = new Map();

// Load all partials once


/**
 * Render a full email template.
 * @param {string} templateName - Name of the template file (without .hbs)
 * @param {object} data - Template data
 * @returns {string} Compiled HTML
 */
export function renderMail(templateName, data = {}) {
  const templatesDir = path.join(__dirname, "src/mail/templates/content");
  const basePath = path.join(__dirname, "src/mail/templates/base.html");
  const templatePath = path.join(templatesDir, `${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template ${templateName} not found`);
  }

  const partialsDir = path.join(__dirname, "src/mail/templates/partials");
fs.readdirSync(partialsDir).forEach(file => {
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
