// Icônes Material Design en SVG, sans police ni feuille de classes : le module virtuel `virtual:mdi-icons` ne contient que les icônes dont le nom
// (`mdi-account-outline`) apparaît quelque part dans `src/` ou dans les alias de Vuetify. Rien à déclarer : écrire `mdi-<nom>` dans un
// composant suffit, et une icône qui n'est plus écrite disparaît du bundle.
//
// Limite : un nom construit à l'exécution (`'mdi-' + type`) n'est pas vu. Écrire le nom en entier (voir `utils/entryIcons.js`).
import fs from 'node:fs';
import path from 'node:path';
import * as mdiPaths from '@mdi/js';

const VIRTUAL_ID = 'virtual:mdi-icons';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const NAME_PATTERN = /mdi-[a-z0-9]+(?:-[a-z0-9]+)*/g;

// `mdi-account-arrow-left` -> `mdiAccountArrowLeft`, le nom de l'export de `@mdi/js`
const exportName = (name) =>
  'mdi' +
  name
    .slice(4)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(vue|js)$/.test(entry.name)) files.push(full);
  }
  return files;
};

export default function mdiIcons() {
  let root = process.cwd();
  let names = new Set();

  const namesIn = (text) => text.match(NAME_PATTERN) ?? [];

  const scan = () => {
    const found = new Set();
    const sources = [
      ...walk(path.join(root, 'src')),
      // les icônes que les composants de Vuetify demandent par leur alias (`$dropdown`, `$checkboxOn`...)
      path.join(root, 'node_modules/vuetify/lib/iconsets/mdi.js'),
    ];
    for (const file of sources) {
      if (fs.existsSync(file)) for (const name of namesIn(fs.readFileSync(file, 'utf8'))) found.add(name);
    }
    return new Set([...found].filter((name) => exportName(name) in mdiPaths));
  };

  return {
    name: 'mdi-icons',
    configResolved(config) {
      root = config.root;
      names = scan();
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const icons = Object.fromEntries([...names].sort().map((name) => [name, mdiPaths[exportName(name)]]));
      return `export default ${JSON.stringify(icons)};`;
    },
    // En développement : une icône nouvelle dans un fichier modifié recharge la page
    handleHotUpdate({ file, read, server }) {
      if (!/\.(vue|js)$/.test(file) || file.includes('node_modules')) return;
      return read().then((text) => {
        const fresh = namesIn(text).filter((name) => exportName(name) in mdiPaths && !names.has(name));
        if (!fresh.length) return;
        fresh.forEach((name) => names.add(name));
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
