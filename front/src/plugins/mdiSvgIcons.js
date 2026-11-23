// Jeu d'icônes de Vuetify : les noms `mdi-...` deviennent des SVG en ligne. `virtual:mdi-icons` (vite-plugins/mdiIcons.js) ne contient que les
// icônes écrites dans le code, il n'y a plus ni police ni classes `.mdi-*`.
import { h } from 'vue';
import icons from 'virtual:mdi-icons';

export const mdiSvg = {
  component: ({ tag, icon, ...attrs }) => {
    const path = icons[icon];
    if (!path && import.meta.env.DEV) console.warn(`[mdi] icône inconnue : "${icon}" (nom écrit en entier dans le code ?)`);
    return h(tag, attrs, [
      h('svg', { class: 'v-icon__svg', xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', role: 'img', 'aria-hidden': 'true' }, [
        path ? h('path', { d: path }) : null,
      ]),
    ]);
  },
};
