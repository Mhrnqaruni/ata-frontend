import "./fonts.css";
import "./app.css";
import { createTheme } from "@mui/material/styles";
import { light, dark, font, displayFont, monoFont } from "./tokens";

// Surfaces, glass and motion live in app.css (CSS variables switch with <html data-theme-mode>);
// this theme maps MUI components onto them. Type: five sizes app-wide (30 / 17 / 15 / 14 / 12),
// weights 400 / 500 / 600.
const ease = "cubic-bezier(.2,.8,.2,1)";

export const getTheme = (mode) => {
  const c = mode === "dark" ? dark : light;
  const isDark = mode === "dark";
  const display = {
    fontFamily: displayFont,
    fontSize: 30,
    lineHeight: "36px",
    fontWeight: 600,
    letterSpacing: "-.03em",
  };
  const cardTitle = {
    fontSize: 17,
    lineHeight: "24px",
    fontWeight: 600,
    letterSpacing: "-.01em",
  };
  const glass1 = {
    backgroundColor: "transparent",
    backgroundImage: "var(--mst-g1-fill)",
    border: "1px solid var(--mst-g1-edge)",
    boxShadow: "var(--mst-g1-hi), var(--mst-shadow-rest)",
  };
  const glass2 = {
    backgroundColor: "transparent",
    backgroundImage: "var(--mst-g2-sheen), linear-gradient(var(--mst-g2-fill), var(--mst-g2-fill))",
    backdropFilter: "var(--mst-g2-blur)",
    WebkitBackdropFilter: "var(--mst-g2-blur)",
    border: "1px solid var(--mst-g1-edge)",
    boxShadow: "var(--mst-g1-hi), var(--mst-shadow-float)",
  };
  return createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary: {
        main: c.accentSolid,
        dark: c.accentHover,
        light: c.accentInk,
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: c.teal,
        light: c.tint,
        dark: c.teal,
        contrastText: isDark ? c.ground : "#FFFFFF",
      },
      background: { default: c.ground, paper: c.solid },
      text: { primary: c.ink, secondary: c.ink2, disabled: c.ink3 },
      divider: c.edge,
      action: {
        hover: isDark ? "rgba(255,255,255,.06)" : "rgba(61,91,219,.05)",
        selected: c.tint,
      },
      success: { main: c.ok, light: c.okTint, lighter: c.okTint },
      warning: { main: c.warn, light: c.warnTint, lighter: c.warnTint },
      error: { main: c.bad, light: c.badTint },
      info: { main: c.accentInk, light: c.tint },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: font,
      fontSize: 14,
      h1: display,
      h2: display,
      h3: cardTitle,
      h4: cardTitle,
      h5: cardTitle,
      h6: cardTitle,
      subtitle1: cardTitle,
      subtitle2: { fontSize: 14, lineHeight: "20px", fontWeight: 600 },
      body1: { fontSize: 15, lineHeight: "24px" },
      body2: { fontSize: 14, lineHeight: "20px" },
      caption: { fontSize: 12, lineHeight: "16px", fontWeight: 500 },
      overline: {
        fontSize: 12,
        lineHeight: "16px",
        fontWeight: 600,
        letterSpacing: ".06em",
        textTransform: "uppercase",
      },
      button: {
        fontSize: 14,
        lineHeight: "20px",
        fontWeight: 600,
        textTransform: "none",
        letterSpacing: 0,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            "--font-ui": font,
            "--font-display": displayFont,
            "--font-mono": monoFont,
          },
          "code,pre,kbd": { fontFamily: monoFont },
          "h1,h2": { fontFamily: displayFont },
          body: {
            colorScheme: mode,
            backgroundColor: "transparent",
            fontVariantNumeric: "tabular-nums",
            overflowWrap: "break-word",
            WebkitFontSmoothing: "antialiased",
          },
          "strong,b": { fontWeight: 600 },
          ":where(button,a,input,select,textarea,[tabindex]):focus-visible": {
            outline: `3px solid ${c.accentInk}`,
            outlineOffset: 3,
          },
          "::selection": { background: c.tint, color: c.ink },
          "@media (max-width:600px)": {
            "input, textarea, select": { fontSize: "16px !important" },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 999,
            padding: "8px 18px",
            transition: `background-color 200ms ${ease}, box-shadow 200ms ${ease}, transform 120ms ${ease}, filter 200ms ${ease}`,
            "&:active": { transform: "scale(.98)" },
            "@media (prefers-reduced-motion: reduce)": {
              transition: "none",
              "&:active": { transform: "none" },
            },
          },
          containedPrimary: {
            backgroundColor: c.accentSolid,
            color: "#FFFFFF",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 8px 20px -10px rgba(61,91,219,.55)",
            "&:hover": {
              backgroundColor: c.accentHover,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 10px 24px -10px rgba(61,91,219,.6)",
            },
          },
          outlined: {
            borderColor: "var(--mst-edge-control)",
            backgroundColor: "var(--mst-well)",
            color: c.ink,
            "&:hover": {
              borderColor: c.accentInk,
              backgroundColor: isDark ? "rgba(255,255,255,.08)" : "#FFFFFF",
            },
          },
          outlinedPrimary: { color: c.ink },
          textPrimary: { color: c.accentInk },
          sizeSmall: { minHeight: 36, padding: "6px 14px", fontSize: 14 },
          sizeLarge: { minHeight: 48, padding: "12px 24px", fontSize: 15 },
          startIcon: { "& > *:nth-of-type(1)": { fontSize: 18 } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          colorPrimary: { color: c.accentInk },
          root: {
            minWidth: 40,
            minHeight: 40,
            borderRadius: 12,
            transition: `background-color 200ms ${ease}`,
            "@media (pointer: coarse)": { minWidth: 44, minHeight: 44 },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: ({ ownerState }) =>
            ownerState.component === "h1" ? display : {},
        },
      },
      MuiCheckbox: { styleOverrides: { root: { padding: 10, color: "var(--mst-edge-control)" } } },
      MuiRadio: { styleOverrides: { root: { padding: 10, color: "var(--mst-edge-control)" } } },
      MuiSwitch: {
        styleOverrides: {
          root: { width: 58, height: 42, padding: 8 },
          switchBase: {
            padding: 11,
            "&.Mui-checked": {
              transform: "translateX(16px)",
              color: "#FFFFFF",
              "& + .MuiSwitch-track": { backgroundColor: c.accentSolid, opacity: 1 },
            },
          },
          thumb: { width: 20, height: 20, boxShadow: "0 1px 3px rgba(16,24,40,.3)" },
          track: {
            borderRadius: 999,
            opacity: 1,
            backgroundColor: isDark ? "rgba(255,255,255,.22)" : "rgba(16,24,40,.22)",
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: { color: c.accentInk, textUnderlineOffset: 3 },
        },
      },
      // Every Paper reads as glass-1; floating layers (menus, popovers, dialogs) are glass-2 below.
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { ...glass1, borderRadius: 20, color: c.ink },
          outlined: { borderColor: "var(--mst-g1-edge)" },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { ...glass1, borderRadius: 20, position: "relative", overflow: "hidden" },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 24, "&:last-child": { paddingBottom: 24 } },
        },
      },
      MuiCardActionArea: {
        styleOverrides: {
          root: { borderRadius: "inherit" },
          focusHighlight: { backgroundColor: c.accent },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: { ...glass1, borderRadius: 20, "&:before": { display: "none" }, "&.Mui-expanded": { margin: "0 0 16px" } },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: "none",
            borderRadius: 14,
            fontSize: 14,
            border: "1px solid transparent",
            backdropFilter: "none",
          },
          standardError: { backgroundColor: c.badTint, color: isDark ? "#FFB3B3" : "#A32317", borderColor: isDark ? "rgba(255,107,107,.3)" : "rgba(196,43,28,.22)" },
          standardWarning: { backgroundColor: c.warnTint, color: isDark ? "#FFD79A" : "#8A3E00", borderColor: isDark ? "rgba(255,181,69,.3)" : "rgba(178,80,0,.22)" },
          standardSuccess: { backgroundColor: c.okTint, color: isDark ? "#86F0C0" : "#176B2E", borderColor: isDark ? "rgba(61,220,151,.3)" : "rgba(30,122,53,.22)" },
          standardInfo: { backgroundColor: c.tint, color: c.accentInk, borderColor: isDark ? "rgba(124,156,255,.3)" : "rgba(61,91,219,.22)" },
          icon: { color: "inherit !important" },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            ...glass2,
            borderRadius: 24,
            "@media (prefers-reduced-motion: no-preference)": {
              animation: `mst-dialog-in 220ms cubic-bezier(.32,.72,0,1)`,
            },
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            "&:not(.MuiBackdrop-invisible)": {
              backgroundColor: "var(--mst-scrim)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            },
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { ...cardTitle, fontSize: 20, lineHeight: "28px", padding: "28px 28px 12px" },
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { padding: "12px 28px 20px" } },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: "12px 28px 28px", gap: 8, flexWrap: "wrap" },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { borderRadius: 0, color: c.ink, backgroundImage: "none", boxShadow: "none", border: 0 },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            border: 0,
            backgroundColor: "transparent",
            backgroundImage: "none",
            boxShadow: "none",
            backdropFilter: "none",
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: { ...glass2, borderRadius: 14 },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { ...glass2, borderRadius: 14, minWidth: 180 },
          list: { padding: 6 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 40,
            fontSize: 14,
            borderRadius: 10,
            "&.Mui-selected": { backgroundColor: c.tint },
            "&.Mui-selected:hover": { backgroundColor: c.tint },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 32, color: "inherit" } } },
      // Labels sit above every field (no floating label, no notch cut into the border).
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          size: "small",
          InputLabelProps: { shrink: true },
        },
      },
      MuiFormControl: {
        styleOverrides: { root: { "& > .MuiInputLabel-root + .MuiInputBase-root": { marginTop: 0 } } },
      },
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            position: "relative",
            transform: "none",
            maxWidth: "100%",
            marginBottom: 6,
            fontSize: 14,
            lineHeight: "20px",
            fontWeight: 500,
            color: c.ink,
            whiteSpace: "normal",
            overflow: "visible",
            pointerEvents: "auto",
            "&.Mui-focused": { color: c.ink },
            "&.Mui-error": { color: isDark ? "#FFB3B3" : "#A32317" },
            "&.Mui-disabled": { color: c.ink3 },
          },
          asterisk: { color: c.ink3 },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: { fontSize: 14, lineHeight: "20px", fontWeight: 500, color: c.ink, "&.Mui-focused": { color: c.ink } },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 12,
            fontSize: 15,
            backgroundColor: "var(--mst-well)",
            transition: `box-shadow 150ms ${ease}`,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--mst-edge-control)", top: 0 },
            "& .MuiOutlinedInput-notchedOutline legend": { display: "none" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: c.accentInk },
            "&.Mui-focused": { boxShadow: `0 0 0 4px ${c.tint}` },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: c.accentInk, borderWidth: 1.5 },
            "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: c.bad },
            "&.Mui-disabled": { opacity: 0.7 },
            "&.MuiInputBase-multiline": { padding: "11px 14px" },
          },
          input: { padding: "11px 14px", "&::placeholder": { color: c.ink3, opacity: 1 } },
          inputSizeSmall: { padding: "11px 14px" },
          inputMultiline: { padding: 0 },
        },
      },
      MuiSelect: {
        defaultProps: { MenuProps: { PaperProps: { sx: { mt: 0.5 } } } },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: { fontSize: 12, lineHeight: "16px", fontWeight: 500, margin: "6px 2px 0", color: c.ink3 },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: { label: { fontSize: 14, lineHeight: "20px" } },
      },
      MuiTableContainer: {
        styleOverrides: { root: { borderRadius: 20 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: "var(--mst-edge)", fontSize: 14, lineHeight: "20px", padding: "14px 16px" },
          head: {
            height: 44,
            padding: "10px 16px",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            backgroundColor: "var(--mst-well)",
            color: c.ink2,
            fontWeight: 600,
            fontSize: 12,
            lineHeight: "16px",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: `background-color 150ms ${ease}`,
            "&:hover": { backgroundColor: "var(--mst-row-hover)" },
            "&:last-child > td, &:last-child > th": { borderBottom: 0 },
          },
          head: { "&:hover": { backgroundColor: "transparent" } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontSize: 12,
            fontWeight: 600,
            height: 24,
            borderRadius: 999,
          },
          label: { paddingLeft: 9, paddingRight: 9 },
          icon: { fontSize: 14, marginLeft: 7, marginRight: -3 },
          filled: ({ ownerState }) => {
            const tones = {
              success: [c.okTint, isDark ? "#86F0C0" : "#176B2E"],
              warning: [c.warnTint, isDark ? "#FFD79A" : "#8A3E00"],
              error: [c.badTint, isDark ? "#FFB3B3" : "#A32317"],
              primary: [c.tint, c.accentInk],
              info: [c.tint, c.accentInk],
              secondary: [isDark ? "rgba(56,199,204,.16)" : "rgba(15,159,184,.12)", isDark ? "#7FDCEC" : "#0B6C7D"],
            };
            const [bg, fg] = tones[ownerState.color] || ["var(--mst-neutral)", c.ink2];
            return {
              color: fg,
              backgroundColor: bg,
              border: 0,
              "& .MuiChip-icon": { color: "inherit" },
              "&.MuiChip-clickable:hover": { backgroundColor: bg, filter: "brightness(.97)" },
            };
          },
          outlined: {
            borderColor: "var(--mst-edge)",
            backgroundColor: "var(--mst-neutral)",
            color: c.ink2,
          },
        },
      },
      MuiTooltip: {
        defaultProps: { enterDelay: 400, arrow: false },
        styleOverrides: {
          tooltip: {
            fontSize: 12,
            lineHeight: "16px",
            fontWeight: 500,
            borderRadius: 8,
            padding: "6px 10px",
            backgroundColor: isDark ? "#E8ECF8" : "#15181D",
            color: isDark ? "#15181D" : "#FFFFFF",
          },
        },
      },
      // Tabs: a segmented pill; the selected tab is a raised white pill that slides.
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
            padding: 4,
            borderRadius: 999,
            backgroundColor: "var(--mst-well)",
            border: "1px solid var(--mst-edge)",
            width: "fit-content",
            maxWidth: "100%",
          },
          flexContainer: { gap: 2 },
          indicator: {
            height: "100%",
            top: 0,
            borderRadius: 999,
            backgroundColor: "var(--mst-active-fill)",
            boxShadow: "var(--mst-shadow-rest)",
            zIndex: 0,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            zIndex: 1,
            minHeight: 32,
            minWidth: 0,
            padding: "6px 16px",
            borderRadius: 999,
            textTransform: "none",
            fontSize: 14,
            lineHeight: "20px",
            fontWeight: 500,
            color: c.ink2,
            "&.Mui-selected": { color: c.ink, fontWeight: 600 },
          },
        },
      },
      MuiStepper: { styleOverrides: { root: { padding: "4px 0 28px" } } },
      MuiStepIcon: {
        styleOverrides: {
          root: {
            width: 28,
            height: 28,
            borderRadius: "50%",
            color: isDark ? "rgba(255,255,255,.08)" : "rgba(16,24,40,.06)",
            boxShadow: "inset 0 0 0 1.5px var(--mst-edge-control)",
            transition: `box-shadow 200ms ${ease}, color 200ms ${ease}`,
            "&.Mui-active": { color: c.accentSolid, boxShadow: `0 0 0 4px ${c.tint}` },
            "&.Mui-completed": { color: c.accentSolid, boxShadow: "none" },
          },
          text: { fill: c.ink2, fontSize: 11, fontWeight: 600, fontFamily: font },
        },
      },
      MuiStepLabel: {
        styleOverrides: {
          label: {
            fontSize: 14,
            lineHeight: "20px",
            fontWeight: 500,
            color: c.ink3,
            "&.Mui-active": { color: c.ink, fontWeight: 600 },
            "&.Mui-completed": { color: c.ink2, fontWeight: 500 },
          },
          iconContainer: { "& .Mui-active .MuiStepIcon-text": { fill: "#FFFFFF" } },
        },
      },
      MuiStepConnector: {
        styleOverrides: {
          line: { borderTopWidth: 2, borderColor: "var(--mst-edge)", borderRadius: 2 },
          root: {
            "&.Mui-active .MuiStepConnector-line, &.Mui-completed .MuiStepConnector-line": { borderColor: c.accent },
          },
          alternativeLabel: { top: 13 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 4, borderRadius: 999, backgroundColor: c.tint },
          bar: { borderRadius: 999, backgroundImage: "var(--mst-ai-stroke)" },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: "wave" },
        styleOverrides: {
          root: { backgroundColor: "var(--mst-neutral)", borderRadius: 12 },
          rectangular: { borderRadius: 20 },
          wave: {
            "&::after": {
              background: "linear-gradient(90deg, transparent, var(--mst-shimmer), transparent)",
              animationDuration: "2s",
            },
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: "var(--mst-edge)" } } },
      MuiBreadcrumbs: {
        styleOverrides: {
          root: { fontSize: 14, color: c.ink2 },
          separator: { marginLeft: 6, marginRight: 6, color: c.ink3 },
        },
      },
      MuiSnackbarContent: {
        styleOverrides: { root: { ...glass2, borderRadius: 999, color: c.ink, padding: "4px 16px" } },
      },
      MuiFab: {
        styleOverrides: { root: { boxShadow: "var(--mst-shadow-rest)" } },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: { padding: 3, gap: 2, borderRadius: 999, backgroundColor: "var(--mst-well)", border: "1px solid var(--mst-edge)" },
          grouped: { border: "0 !important", borderRadius: "999px !important", margin: 0 },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            minHeight: 32,
            padding: "6px 14px",
            textTransform: "none",
            fontSize: 14,
            fontWeight: 500,
            color: c.ink2,
            "&.Mui-selected": { backgroundColor: "var(--mst-active-fill)", color: c.ink, fontWeight: 600, boxShadow: "var(--mst-shadow-rest)" },
            "&.Mui-selected:hover": { backgroundColor: "var(--mst-active-fill)" },
          },
        },
      },
    },
  });
};
