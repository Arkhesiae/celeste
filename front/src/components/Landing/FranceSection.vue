<template>
  <!-- Troisième section de la page d'accueil : la France et, au survol de Paris (ou au focus, ou au toucher), l'image du CRNA qui glisse sur le côté.
       Contour issu de src/assets/map/countries.json (Natural Earth), projeté une fois pour toutes (voir la rubrique « Landing » de CLAUDE.md). -->
  <v-row class="px-4 py-16 mt-16 align-center france-section">
    <v-col cols="12" md="6" class="d-flex justify-center">
      <v-card flat color="surfaceContainer" class="france-section__card pa-4">
        <svg viewBox="0 0 520 520" role="group" aria-label="Carte de la France" class="france-section__map">
          <path
            class="france-section__land"
            d="M481.5 416.3L480.2 423.6L481.5 425.4L482.7 425.4L482.7 427.3L484 445.4L484 447.2L480.2 454.5L479 456.3L479 465.4L477.7 467.2L476.5 469.1L474 478.2L472.7 480L466.5 476.3L462.7 474.5L461.5 472.7L460.2 470.9L461.5 469.1L462.7 467.2L462.7 465.4L459 465.4L457.7 463.6L457.7 461.8L459 458.2L457.7 456.3L456.5 456.3L455.2 456.3L454 454.5L455.2 452.7L457.7 450.9L456.5 449.1L455.2 447.2L454 445.4L452.7 443.6L454 441.8L456.5 440L455.2 436.3L454 436.3L452.7 436.3L454 434.5L455.2 432.7L457.7 427.3L460.2 425.4L466.5 423.6L467.7 421.8L469 420L470.2 420L472.7 420L474 420L475.2 421.8L476.5 420L476.5 418.2L476.5 416.3L476.5 409.1L477.7 407.3L479 405.4L481.5 407.3L480.2 409.1L481.5 412.7L481.5 416.3ZM422.7 198.2L418.9 200L418.9 201.8L417.7 205.5L415.2 205.5L412.7 205.5L410.2 205.5L408.9 205.5L408.9 203.6L407.7 203.6L405.2 203.6L402.7 205.5L400.2 207.3L401.4 209.1L403.9 209.1L403.9 210.9L402.7 210.9L402.7 212.7L398.9 218.2L393.9 223.6L392.6 225.5L386.4 227.3L386.4 229.1L386.4 232.7L385.1 236.4L381.4 240L377.6 243.6L376.4 245.5L376.4 247.3L375.1 250.9L376.4 254.5L376.4 256.4L375.1 258.2L373.9 260L371.4 261.8L371.4 263.6L372.6 263.6L375.1 263.6L378.9 261.8L381.4 260L380.1 256.4L382.6 252.7L386.4 250.9L390.1 250.9L396.4 252.7L396.4 254.5L397.7 256.4L397.7 258.2L396.4 263.6L397.7 265.5L398.9 267.3L400.2 269.1L402.7 270.9L403.9 272.7L405.2 274.5L401.4 276.4L397.7 280L397.7 281.8L397.7 283.6L400.2 285.5L402.7 289.1L403.9 292.7L407.7 296.4L408.9 298.2L407.7 300L406.4 305.4L405.2 305.4L403.9 307.3L398.9 310.9L397.7 309.1L393.9 309.1L392.6 310.9L392.6 312.7L393.9 314.5L395.2 318.2L395.2 320L397.7 321.8L400.2 321.8L401.4 323.6L402.7 323.6L403.9 323.6L405.2 329.1L403.9 330.9L402.7 330.9L401.4 332.7L400.2 336.4L398.9 338.2L400.2 340L400.2 341.8L400.2 343.6L400.2 347.3L402.7 349.1L408.9 352.7L413.9 356.4L415.2 356.4L422.7 354.5L423.9 354.5L425.2 356.4L425.2 358.2L423.9 360L422.7 363.6L420.2 365.4L418.9 367.3L418.9 369.1L418.9 372.7L417.7 372.7L416.4 372.7L415.2 374.5L412.7 376.3L410.2 378.2L400.2 387.3L395.2 390.9L393.9 392.7L392.6 394.5L390.1 398.2L387.6 400L382.6 401.8L376.4 403.6L373.9 401.8L366.4 403.6L362.6 400L353.9 396.3L351.4 390.9L347.6 390.9L345.1 390.9L343.8 390.9L342.6 389.1L342.6 387.3L340.1 387.3L338.8 387.3L337.6 389.1L336.3 389.1L335.1 389.1L335.1 390.9L332.6 390.9L330.1 389.1L322.6 387.3L321.3 387.3L317.6 385.4L315.1 383.6L313.8 381.8L312.6 380L311.3 380L307.6 381.8L306.3 383.6L303.8 385.4L286.3 398.2L283.8 403.6L280 410.9L280 414.5L281.3 425.4L285 430.9L285 432.7L283.8 432.7L280 432.7L277.5 430.9L275 432.7L272.5 432.7L271.3 434.5L270 434.5L268.8 434.5L267.5 436.3L265 436.3L258.7 434.5L253.7 432.7L250 434.5L248.7 436.3L247.5 436.3L246.2 434.5L245 432.7L242.5 432.7L238.7 429.1L240 427.3L238.7 425.4L233.7 423.6L232.5 423.6L230 423.6L230 425.4L227.5 421.8L225 420L222.5 420L220 418.2L216.2 418.2L208.7 414.5L206.2 414.5L204.9 416.3L204.9 420L204.9 421.8L201.2 421.8L196.2 421.8L194.9 421.8L192.4 421.8L191.2 420L183.7 421.8L182.4 420L181.2 418.2L178.7 416.3L177.4 416.3L174.9 414.5L173.7 414.5L172.4 416.3L169.9 416.3L167.4 416.3L166.1 416.3L162.4 410.9L161.1 410.9L158.6 409.1L156.1 409.1L148.6 405.4L144.9 403.6L143.6 403.6L143.6 401.8L143.6 403.6L142.4 403.6L142.4 405.4L141.1 405.4L139.9 405.4L138.6 403.6L139.9 401.8L139.9 400L141.1 398.2L141.1 396.3L138.6 394.5L136.1 394.5L133.6 394.5L131.1 392.7L129.9 392.7L128.6 390.9L128.6 389.1L133.6 387.3L138.6 381.8L142.4 360L146.1 336.4L148.6 330.9L151.1 330.9L148.6 327.3L147.4 329.1L147.4 330.9L146.1 330.9L147.4 309.1L148.6 300L151.1 292.7L154.9 296.4L158.6 298.2L161.1 301.8L163.6 312.7L164.9 314.5L167.4 316.4L166.1 314.5L164.9 312.7L162.4 298.2L159.9 294.5L157.4 292.7L148.6 285.5L147.4 283.6L147.4 281.8L149.9 281.8L152.4 281.8L151.1 280L149.9 274.5L149.9 261.8L149.9 260L148.6 256.4L146.1 256.4L143.6 256.4L141.1 254.5L128.6 247.3L124.8 240L119.8 234.5L119.8 230.9L119.8 229.1L122.3 223.6L119.8 220L117.3 220L116.1 218.2L117.3 214.6L118.6 212.7L121.1 212.7L124.8 214.6L128.6 214.6L129.9 216.4L123.6 210.9L111.1 212.7L108.6 212.7L106.1 210.9L106.1 207.3L107.3 207.3L108.6 203.6L107.3 201.8L104.8 201.8L101.1 201.8L98.6 201.8L97.3 201.8L99.8 198.2L97.3 196.4L94.8 198.2L92.3 198.2L88.6 196.4L86.1 194.6L83.6 194.6L82.3 194.6L81.1 192.7L78.5 192.7L77.3 192.7L74.8 190.9L62.3 187.3L57.3 187.3L52.3 189.1L49.8 187.3L48.5 185.5L46 181.8L38.5 178.2L39.8 176.4L43.5 176.4L48.5 174.6L49.8 172.7L46 170.9L43.5 169.1L42.3 169.1L42.3 167.3L43.5 165.5L44.8 167.3L47.3 167.3L52.3 165.5L49.8 163.6L48.5 163.6L47.3 163.6L43.5 163.6L41 163.6L37.3 163.6L36 161.8L36 160L37.3 156.4L43.5 152.7L58.5 147.3L64.8 149.1L68.5 147.3L73.5 145.5L76 143.7L83.6 141.8L91.1 143.7L97.3 152.7L101.1 156.4L108.6 150.9L119.8 150.9L122.3 152.7L123.6 150.9L124.8 149.1L127.4 149.1L127.4 150.9L139.9 150.9L142.4 150.9L138.6 149.1L136.1 143.7L134.9 125.5L132.4 120L128.6 112.7L126.1 107.3L126.1 105.5L127.4 103.7L131.1 103.7L134.9 103.7L142.4 101.8L146.1 103.7L144.9 107.3L146.1 112.7L147.4 114.6L149.9 116.4L154.9 116.4L161.1 118.2L168.6 118.2L179.9 121.8L184.9 120L188.7 116.4L197.4 114.6L198.7 112.7L193.7 112.7L188.7 110.9L188.7 109.1L188.7 107.3L191.2 101.8L203.7 94.6L213.7 92.7L223.7 89.1L228.7 85.5L232.5 80L233.7 78.2L235 78.2L233.7 76.4L233.7 56.4L235 52.8L237.5 49.1L240 47.3L245 43.7L261.3 40L263.8 40L263.8 41.8L265 43.7L266.3 45.5L265 47.3L266.3 49.1L268.8 52.8L271.3 54.6L273.8 56.4L275 56.4L276.3 56.4L280 54.6L282.5 54.6L283.8 54.6L285 56.4L286.3 58.2L286.3 61.8L287.5 65.5L288.8 65.5L293.8 67.3L297.5 67.3L298.8 69.1L300 74.6L301.3 74.6L302.5 72.8L303.8 72.8L305.1 74.6L308.8 74.6L311.3 74.6L315.1 78.2L315.1 81.8L313.8 81.8L315.1 83.7L316.3 85.5L316.3 87.3L315.1 87.3L313.8 89.1L315.1 90.9L321.3 90.9L327.6 90.9L330.1 89.1L331.3 87.3L332.6 85.5L333.8 83.7L335.1 81.8L337.6 83.7L335.1 90.9L336.3 92.7L336.3 96.4L337.6 98.2L338.8 98.2L341.3 100L342.6 100L345.1 101.8L347.6 103.7L350.1 103.7L351.4 105.5L352.6 107.3L355.1 109.1L357.6 110.9L358.9 110.9L360.1 110.9L363.9 110.9L366.4 110.9L367.6 110.9L370.1 112.7L371.4 114.6L372.6 114.6L375.1 114.6L376.4 112.7L377.6 112.7L380.1 112.7L381.4 112.7L383.9 114.6L385.1 114.6L386.4 114.6L388.9 116.4L390.1 118.2L390.1 120L391.4 121.8L395.2 127.3L396.4 127.3L398.9 127.3L398.9 125.5L400.2 125.5L402.7 125.5L403.9 127.3L405.2 129.1L406.4 129.1L407.7 129.1L410.2 129.1L413.9 129.1L416.4 127.3L417.7 127.3L420.2 130.9L422.7 130.9L428.9 132.7L435.2 134.6L437.7 134.6L438.9 136.4L440.2 140L438.9 140L432.7 149.1L430.2 150.9L428.9 154.6L427.7 161.8L426.4 167.3L422.7 172.7L422.7 176.4L422.7 180L422.7 183.6L421.4 190.9L420.2 194.6L421.4 198.2L422.7 198.2Z"
          />

          <!-- Paris : zone sensible, halo qui palpite et point -->
          <g
            class="france-section__city"
            :class="{ 'france-section__city--active': active }"
            role="button"
            tabindex="0"
            aria-label="Paris : afficher l'image du CRNA"
            :aria-pressed="active"
            @mouseenter="active = true"
            @mouseleave="active = false"
            @focus="active = true"
            @blur="active = false"
            @click="active = !active"
            @keydown.enter.prevent="active = !active"
            @keydown.space.prevent="active = !active"
          >
            <circle class="france-section__hit" cx="258.5" cy="141.1" r="26" />
            <circle class="france-section__halo" cx="258.5" cy="141.1" r="14" />
            <circle class="france-section__dot" cx="258.5" cy="141.1" r="5" />
          </g>
        </svg>
      </v-card>
    </v-col>

    <v-col cols="12" md="6" class="d-flex align-center">
      <!-- L'image arrive de la carte (par la gauche) quand Paris est survolé, repart de la même façon ; sans survol, une invitation -->
      <Transition name="france-section-slide" mode="out-in">
        <div v-if="active" key="image" class="france-section__panel">
          <div class="france-section__photo" role="img" aria-label="Le CRNA">
            <img :src="siteImage" alt="" class="france-section__image" draggable="false" />
          </div>
          <div class="text-title-large font-weight-bold mt-4">CRNA</div>
          <div class="text-body-medium text-medium-emphasis">Paris</div>
        </div>
        <div v-else key="hint" class="france-section__panel france-section__panel--hint">
          <v-icon icon="mdi-cursor-default-click-outline" color="primary" size="28" class="mb-3" />
          <div class="text-title-large font-weight-bold">Partout en France</div>
          <div class="text-body-medium text-medium-emphasis mt-1">Survolez Paris pour découvrir le CRNA.</div>
        </div>
      </Transition>
    </v-col>
  </v-row>
</template>

<script setup>
import siteImage from '@/assets/CRNA.png';

const active = ref(false);
</script>

<style scoped>
.france-section__card {
  width: 100%;
  max-width: 460px;
}

.france-section__map {
  display: block;
  width: 100%;
  height: auto;
}

.france-section__land {
  fill: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
  stroke: color-mix(in srgb, rgb(var(--v-theme-primary)) 70%, transparent);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

/* Paris : le point grossit et le halo s'élargit quand la ville est active */
.france-section__city {
  cursor: pointer;
  outline: none;
}

.france-section__hit {
  fill: transparent;
}

.france-section__halo,
.france-section__dot {
  fill: rgb(var(--v-theme-primary));
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.france-section__halo {
  opacity: 0.22;
  animation: france-section-pulse 2.8s ease-in-out infinite;
}

.france-section__city--active .france-section__dot,
.france-section__city:focus-visible .france-section__dot {
  transform: scale(1.5);
}

.france-section__city--active .france-section__halo,
.france-section__city:focus-visible .france-section__halo {
  animation: none;
  transform: scale(2);
}

.france-section__city:focus-visible .france-section__hit {
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2;
}

@keyframes france-section-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.5);
  }
}

.france-section__panel {
  width: 100%;
  max-width: 460px;
}

.france-section__panel--hint {
  padding: 24px 8px;
}

/* Le CRNA : l'image d'origine a beaucoup de marge transparente, on cadre son contenu (centré vers 38 % / 44 % de l'image) */
.france-section__photo {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-radius: 24px;
  background: rgb(var(--v-theme-surfaceContainer));
}

.france-section__image {
  position: absolute;
  top: -85%;
  left: -21.6%;
  width: 190%;
  max-width: none;
  user-select: none;
}

/* Glissement latéral : l'image vient de la gauche (côté carte) et s'efface vers elle */
.france-section-slide-enter-active,
.france-section-slide-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.35s cubic-bezier(0.2, 0, 0, 1);
}

.france-section-slide-enter-from,
.france-section-slide-leave-to {
  opacity: 0;
  transform: translateX(-32px);
}

@media (prefers-reduced-motion: reduce) {
  .france-section__halo {
    animation: none;
  }
  .france-section-slide-enter-active,
  .france-section-slide-leave-active {
    transition: opacity 0.15s ease;
  }
  .france-section-slide-enter-from,
  .france-section-slide-leave-to {
    transform: none;
  }
}
</style>
