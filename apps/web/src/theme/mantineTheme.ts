import type {CSSVariablesResolver} from '@mantine/core';

import {createTheme, defaultVariantColorsResolver} from '@mantine/core';

const INTERFACE_FONT = '\'Schibsted Grotesk\', system-ui, sans-serif';
const SCRIPTURE_FONT = '\'Literata\', Georgia, serif';

/** Maps the design language in `docs/UI.md` onto Mantine. `styles/main.scss` holds the matching CSS tokens. */
export const mantineTheme = createTheme({
  primaryColor: 'lapis',
  primaryShade: {light: 7, dark: 3},
  // The accent is dark in light mode and light in dark mode, so text on it must switch too.
  variantColorResolver: (input) => {
    const colors = defaultVariantColorsResolver(input);
    const color = input.color ?? input.theme.primaryColor;

    return input.variant === 'filled' && color === input.theme.primaryColor
      ? {...colors, color: 'var(--bc-on-accent)'}
      : colors;
  },
  fontFamily: INTERFACE_FONT,
  headings: {fontFamily: SCRIPTURE_FONT, fontWeight: '400'},
  defaultRadius: 'sm',
  colors: {
    lapis: ['#EEF1FA', '#DCE3F5', '#C5D2F7', '#9DB4F5', '#7B95E3', '#5472CC', '#3656AE', '#1F3F94', '#193279', '#13265D'],
    dark: ['#E8EAF0', '#C5D2F7', '#A5AEC4', '#7C87A3', '#3A4668', '#2A3556', '#1C2A52', '#16213F', '#0F1830', '#0A1124'],
  },
});

/** Mantine's own page and text colors. These must come through here to take priority over the variables it injects. */
export const mantineCssVariables: CSSVariablesResolver = () => ({
  variables: {},
  light: {'--mantine-color-body': '#F6F7F5', '--mantine-color-text': '#16213A'},
  dark: {'--mantine-color-body': '#0F1830', '--mantine-color-text': '#E8EAF0'},
});
