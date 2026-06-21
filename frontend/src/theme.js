import { createTheme } from '@mantine/core';

const theme = createTheme({
  primaryColor: 'teal',
  colors: {
    dark: [
      '#d4d4d8',
      '#a1a1aa',
      '#71717a',
      '#52525b',
      '#3f3f46',
      '#27272a',
      '#18181b',
      '#09090b',
      '#09090b',
      '#09090b',
    ],
  },
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Paper: {
      defaultProps: {
        bg: '#27272a',
      },
    },
    AppShell: {
      styles: {
        main: {
          backgroundColor: '#18181b',
        },
      },
    },
  },
});

export default theme;
