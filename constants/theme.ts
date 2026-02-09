// constants/Colors.ts

export const SSIL = {
  // Official SSIL Orange from your logo & invoice
  orange: '#ff6b00',
  orangeDark: '#e65100',
  red: '#d32f2f',        // Used for "Net Amount" in your real invoice
  redDark: '#b71c1c',
  gray: '#212121',
  grayLight: '#666666',
  grayLighter: '#999999',
  background: '#fafafa',
  surface: '#ffffff',
  border: '#e0e0e0',
  success: '#2e7d32',
  warning: '#ff8f00',
  error: '#d32f2f',
};

const tintColorLight = SSIL.orange;
const tintColorDark = '#ffffff';

export const Colors = {
  light: {
    text: SSIL.gray,
    background: SSIL.background,
    surface: SSIL.surface,
    tint: tintColorLight,
    primary: SSIL.orange,
    primaryDark: SSIL.orangeDark,
    accent: SSIL.red,
    icon: SSIL.grayLight,
    tabIconDefault: SSIL.grayLighter,
    tabIconSelected: SSIL.orange,
    border: SSIL.border,
    success: SSIL.success,
    warning: SSIL.warning,
    error: SSIL.error,
    card: '#ffffff',
    notification: SSIL.orange,
  },
  dark: {
    text: '#ffffff',
    background: '#121212',
    surface: '#1e1e1e',
    tint: tintColorDark,
    primary: SSIL.orange,
    primaryDark: SSIL.orangeDark,
    accent: SSIL.red,
    icon: '#cccccc',
    tabIconDefault: '#888888',
    tabIconSelected: SSIL.orange,
    border: '#333333',
    success: '#4caf50',
    warning: '#ffb300',
    error: '#ef5350',
    card: '#1e1e1e',
    notification: SSIL.orange,
  },
};

// Optional: Export for easy use across app
export const Theme = {
  ...Colors.light,
  ...SSIL,
};