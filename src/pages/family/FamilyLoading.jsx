import React from 'react';
import logo from '../../assets/mst_logo_no_bg.png';
import darkLogo from '../../assets/mst_logo_dark_no_bg.png';
import './familyLoading.css';

/**
 * The parent space while it loads: the shape of the notebook (one header, the chat, the side panel) shimmering softly,
 * so opening Parent mode never shows a bare line of text. Loaded eagerly (it is the Suspense fallback).
 * variant="page" draws the header too; variant="body" draws only what sits under an existing header.
 */
export default function FamilyLoading({ variant = 'page', label = 'Opening the notebook' }) {
  let dark = false;
  try { dark = document.documentElement.getAttribute('data-theme-mode') === 'dark'; } catch { /* default light */ }
  return <div className={`fam-load fam-load-${variant}`} role="status" aria-live="polite" aria-busy="true">
    <span className="fam-load-sr">{label}…</span>
    {variant === 'page' && <div className="fam-load-head" aria-hidden>
      <img src={dark ? darkLogo : logo} alt="" className="fam-load-logo" />
      <i className="fam-load-pill" style={{ width: 92 }} />
      <i className="fam-load-sep" />
      <i className="fam-load-tab" /><i className="fam-load-tab fam-load-tab-2" />
      <span className="fam-load-grow" />
      <i className="fam-load-pill" style={{ width: 72, height: 40 }} /><i className="fam-load-dot" />
    </div>}
    <div className="fam-load-main" aria-hidden>
      <div className="fam-load-chat">
        <i className="fam-load-line" style={{ width: '22%', height: 18 }} />
        <div className="fam-load-msg fam-load-me"><i style={{ width: '46%' }} /></div>
        <div className="fam-load-msg"><i style={{ width: '88%' }} /><i style={{ width: '94%' }} /><i style={{ width: '64%' }} /></div>
        <div className="fam-load-card"><i className="fam-load-tile" /><span><i style={{ width: 160 }} /><i style={{ width: 96, height: 10 }} /></span></div>
        <span className="fam-load-grow" />
        <div className="fam-load-compose"><i style={{ width: '30%' }} /></div>
      </div>
      <div className="fam-load-panel">
        <i className="fam-load-tabs" />
        <div className="fam-load-grid"><i /><i /><i /><i /></div>
        <i className="fam-load-row" /><i className="fam-load-row" /><i className="fam-load-row" />
      </div>
    </div>
    <p className="fam-load-caption">{label}…</p>
  </div>;
}
