/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { md3 } from 'vuetify/blueprints'
import { VTimePicker } from 'vuetify/labs/VTimePicker'


// Composables
import { createVuetify } from 'vuetify'
import {fr} from "vuetify/locale";
import {VDateInput} from "vuetify/labs/components";

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  blueprint: md3,

  date: {
    locale: {
      fr: 'fr-FR',
    },
  },
  theme: {
    defaultTheme: 'darkTheme', // You can set the default theme (light or dark)
    themes : {
      darkTheme: {
        dark: true,
        colors: {
          "permutation": "#dcffbc",
          "onPermutation": "#5c2a65",
          "primary": "#87a1E0",
          "surfaceTint": "#87D1EA",
          "onPrimary": "#003542",
          "primaryContainer": "#004E5F",
          "onPrimaryContainer": "#B4EBFF",
          "secondary": "#B3CAD4",
          "onSecondary": "#1D333B",
          "secondaryContainer": "#344A52",
          "onSecondaryContainer": "#CEE6F0",
          "tertiary": "#C2C4EB",
          "onTertiary": "#2B2E4D",
          "tertiaryContainer": "#414465",
          "onTertiaryContainer": "#E0E0FF",
          "error": "#FFB4AB",
          "onError": "#690005",
          "errorContainer": "#93000A",
          "onErrorContainer": "#FFDAD6",
          "background": "#0F1416",
          "onBackground": "#DEE3E6",
          "surface": "#161c1d",
          "onSurface": "#DEE3E5",
          "surfaceVariant": "#40484C",
          "onSurfaceVariant": "#C0C8CC",
          "outline": "#8A9296",
          "outlineVariant": "#40484C",
          "shadow": "#000000",
          "scrim": "#000000",
          "inverseSurface": "#DEE3E5",
          "inverseOnSurface": "#2B3133",
          "inversePrimary": "#03677D",
          "primaryFixed": "#B4EBFF",
          "onPrimaryFixed": "#001F28",
          "primaryFixedDim": "#87D1EA",
          "onPrimaryFixedVariant": "#004E5F",
          "secondaryFixed": "#CEE6F0",
          "onSecondaryFixed": "#071E25",
          "secondaryFixedDim": "#B3CAD4",
          "onSecondaryFixedVariant": "#344A52",
          "tertiaryFixed": "#E0E0FF",
          "onTertiaryFixed": "#161937",
          "tertiaryFixedDim": "#C2C4EB",
          "onTertiaryFixedVariant": "#414465",
          "surfaceDim": "#0E1416",
          "surfaceBright": "#343A3C",
          "surfaceContainerLowest": "#090F10",
          "surfaceContainerLow": "#171D1E",
          "surfaceContainer": "#1B2122",
          "surfaceContainerHigh": "#252B2C",
          "surfaceContainerHighest": "#303637",
          "remplacement": "#f6ccfd",
          "permutation": "#e6ec5d",
          info: '#2196F3',
          success: '#affF80',
          warning: '#FB8C00',
        }
      },
      lightTheme: {
        dark: false,
        colors: {
          "primary": "#03677D",
          "surfaceTint": "#03677D",
          "onPrimary": "#FFFFFF",
          "primaryContainer": "#B4EBFF",
          "onPrimaryContainer": "#001F28",
          "secondary": "#4C626A",
          "onSecondary": "#FFFFFF",
          "secondaryContainer": "#CEE6F0",
          "onSecondaryContainer": "#071E25",
          "tertiary": "#595C7E",
          "onTertiary": "#FFFFFF",
          "tertiaryContainer": "#E0E0FF",
          "onTertiaryContainer": "#161937",
          "error": "#BA1A1A",
          "onError": "#FFB4AB",
          "errorContainer": "#FFDAD6",
          "onErrorContainer": "#410002",
          "background": "#fafcff",
          "onBackground": "#171C1F",
          "surface": "#f0f4f6",
          "onSurface": "#171D1E",
          "surfaceVariant": "#DCE4E8",
          "onSurfaceVariant": "#40484C",
          "outline": "#70787C",
          "outlineVariant": "#C0C8CC",
          "shadow": "#000000",
          "scrim": "#000000",
          "inverseSurface": "#2B3133",
          "inverseOnSurface": "#ECF2F3",
          "inversePrimary": "#87D1EA",
          "primaryFixed": "#B4EBFF",
          "onPrimaryFixed": "#001F28",
          "primaryFixedDim": "#87D1EA",
          "onPrimaryFixedVariant": "#004E5F",
          "secondaryFixed": "#CEE6F0",
          "onSecondaryFixed": "#071E25",
          "secondaryFixedDim": "#B3CAD4",
          "onSecondaryFixedVariant": "#344A52",
          "tertiaryFixed": "#E0E0FF",
          "onTertiaryFixed": "#161937",
          "tertiaryFixedDim": "#C2C4EB",
          "onTertiaryFixedVariant": "#414465",
          "surfaceDim": "#D5DBDC",
          "surfaceBright": "#F5FAFC",
          "surfaceContainerLowest": "#FFFFFF",
          "surfaceContainerLow": "#EFF5F6",
          "surfaceContainer": "#E9EFF0",
          "surfaceContainerHigh": "#E3E9EA",
          "surfaceContainerHighest": "#DEE3E5",
          "remplacement": "#51184a",
          "permutation": "#e6ec5d",
        }
      },
    },
  },
  components: {
    VTimePicker,
    VDateInput,
  },
  locale: {
    locale: 'fr', // Set default locale to French
    messages: { fr }, // Provide French translations
  },
  defaults: {
    VDialog : {
      scrim: '#0F1416',
      class: 'pa-6',
      rounded: 'xl',
      VCardActions: {
        class: 'pa-0',
        VBtn: {
          size: 'large',
          slim: false,
          rounded: 'xl',
        },
      },
    },
  
  
  },
})
