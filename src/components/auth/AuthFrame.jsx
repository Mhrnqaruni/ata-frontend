import React from "react";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import { useThemeMode } from "../../hooks/useThemeMode";
import logo from "../../assets/mst_logo_no_bg.png";
import GradingLine from "./GradingLine";
import "./auth.css";

/**
 * The sign-in surface, in two halves like the Moby Argus sign-in:
 *   left  — a deep brand panel (the logo's blue → violet) with the grading story drawn tall, sized to the screen
 *           height so the page never scrolls on a laptop or desktop;
 *   right — the theme's ground with the logo and one liquid-glass card.
 * Below 1024px the halves stack: the sign-in first, the story under it. The form comes first in the DOM, so the
 * keyboard reaches it before the animation; the theme switch comes last.
 */
export default function AuthFrame({ title, description, children }) {
  const { mode, toggleThemeMode } = useThemeMode();
  const next = mode === "dark" ? "light" : "dark";
  return (
    <div className="mst-auth" data-mode={mode}>
      <section className="mst-auth-side">
        <main className="mst-auth-main">
          <img alt="MySmartTeach" className="mst-auth-logo" src={logo} />
          <div className="mst-auth-cardwrap">
            <div className="mst-glass mst-auth-card">
              <header className="mst-auth-head">
                <h1>{title}</h1>
                <p>{description}</p>
              </header>
              {children}
            </div>
          </div>
        </main>
      </section>
      <aside aria-label="How marking works in MySmartTeach" className="mst-auth-story">
        <GradingLine tallFrom={1024} />
      </aside>
      <button
        aria-label={`Switch to ${next} mode`}
        className="mst-auth-theme"
        onClick={toggleThemeMode}
        type="button"
      >
        {next === "dark" ? <DarkModeOutlined aria-hidden="true" /> : <LightModeOutlined aria-hidden="true" />}
        <span>{next === "dark" ? "Dark" : "Light"}</span>
      </button>
    </div>
  );
}
