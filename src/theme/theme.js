// /src/theme/theme.js

import { createTheme } from '@mui/material/styles';
import { grey } from '@mui/material/colors'; // Import the grey color palette

const lightPalette = {
  mode: 'light',
  primary: {
    main: '#5403FF',
    light: '#7636FF',
    dark: '#3A02B2',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#D7D0F2',
    light: '#E9E4F8',
    dark: '#B9AEE0',
    contrastText: '#121926',
  },
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#121926',
    secondary: '#6C737F',
    disabled: '#A0A6AE',
  },
  error: { main: '#D32F2F', contrastText: '#FFFFFF' },
  warning: { main: '#FFAB00', contrastText: '#FFFFFF' },
  success: { main: '#00C853', contrastText: '#FFFFFF' },
  divider: '#E0E3E7',
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#9D78FF',
    light: '#B092FF',
    dark: '#8A5CFF',
    contrastText: '#121926',
  },
  secondary: {
    main: '#4A4458',
    light: '#635C74',
    dark: '#352F40',
    contrastText: '#E0E0E0',
  },
  background: {
    default: '#121212',
    paper: '#1E1E1E',
  },
  text: {
    primary: '#E0E0E0',
    secondary: '#B0B0B0',
    disabled: '#757575',
  },
  error: { main: '#EF5350', contrastText: '#121212' },
  warning: { main: '#FFCA28', contrastText: '#121212' },
  success: { main: '#66BB6A', contrastText: '#121212' },
  divider: 'rgba(255, 255, 255, 0.12)',
};

export const getTheme = (mode) => createTheme({
  palette: mode === 'light' ? lightPalette : darkPalette,
  
  typography: {
    fontFamily: '"Inter", -apple-system, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.25rem',
      lineHeight: 1.2,
      '@media (max-width:600px)': { fontSize: '1.75rem' },
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.0rem',
      lineHeight: 1.5,
    },
    body1: {
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        sizeLarge: {
          padding: '12px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          // We will use the MuiPaper override for the default shadow now
          boxShadow: 'none', 
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    // --- [THE FIX IS APPLIED HERE] ---
    MuiTableCell: {
      styleOverrides: {
        head: {
          // In dark mode, MUI's gray scale is inverted, so a higher number is darker.
          backgroundColor: mode === 'light' ? grey[100] : grey[900], 
          fontWeight: 600,
        },
      },
    },
    // --- [END OF FIX] ---
    MuiPaper: {
        styleOverrides: {
            root: {
                // This applies a default shadow to all Paper components (Cards, Menus, etc.)
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
            },
            // We use variants to apply specific styles. Dropdown menus use the 'elevation' variant.
            elevation: {
                // This will specifically target dropdowns from Selects, Autocompletes, and Menus
                border: '1px solid',
                borderColor: mode === 'light' ? lightPalette.divider : darkPalette.divider,
            }
        }
    }
  },
});