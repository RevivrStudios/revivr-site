/*
 * Revivr Studios — shared behaviour for redesigned pages (Site Redesign v2).
 * Same DOM contract as the legacy main.js: #current-year, #accessibility-toggle,
 * #hamburger-btn, #nav-links, #nav-backdrop, #nav-close-btn, body.accessibility-mode.
 */

import '../css/tokens.css';
import '../css/components.css';

// Footer year
const yearSpan = document.getElementById('current-year');
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}

/* ── Reader preferences ────────────────────────────────────────────────────
 * Four independent settings, stored per-visitor and re-applied on load.
 * State lives on <html> (contrast also on <body>, where the token override
 * is defined) so CSS can react without a repaint flash.
 * ------------------------------------------------------------------------ */
const PREFS = {
    textsize: { key: 'a11yTextSize', def: '1' },
    contrast: { key: 'accessibilityMode', def: 'false' },   // legacy key: keep returning visitors' setting
    motion: { key: 'a11yReduceMotion', def: 'false' },
    underline: { key: 'a11yUnderlineLinks', def: 'false' }
};

function readPref(name) {
    try {
        return localStorage.getItem(PREFS[name].key) ?? PREFS[name].def;
    } catch (e) {
        return PREFS[name].def;          // private mode, blocked storage
    }
}

function writePref(name, value) {
    try {
        localStorage.setItem(PREFS[name].key, value);
    } catch (e) { /* setting still applies for this page view */ }
}

const root = document.documentElement;

function applyTextSize(step) {
    if (step === '1') root.removeAttribute('data-textsize');
    else root.setAttribute('data-textsize', step);
    document.querySelectorAll('.a11y__btn[data-textsize]').forEach((b) => {
        b.setAttribute('aria-checked', String(b.dataset.textsize === step));
    });
}

function applyContrast(on) {
    document.body.classList.toggle('accessibility-mode', on);
    setToggle('a11y-contrast', on);
}

function applyMotion(on) {
    if (on) root.setAttribute('data-motion', 'off');
    else root.removeAttribute('data-motion');
    setToggle('a11y-motion', on);
}

function applyUnderline(on) {
    if (on) root.setAttribute('data-underline', 'on');
    else root.removeAttribute('data-underline');
    setToggle('a11y-underline', on);
}

function setToggle(id, on) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(on));
    const state = btn.querySelector('.a11y__state');
    if (state) state.textContent = on ? 'On' : 'Off';
}

// Restore on load.
applyTextSize(readPref('textsize'));
applyContrast(readPref('contrast') === 'true');
applyMotion(readPref('motion') === 'true');
applyUnderline(readPref('underline') === 'true');

// Text size — a radiogroup, so arrow keys move between options.
const sizeButtons = Array.from(document.querySelectorAll('.a11y__btn[data-textsize]'));
sizeButtons.forEach((btn, i) => {
    btn.addEventListener('click', () => {
        applyTextSize(btn.dataset.textsize);
        writePref('textsize', btn.dataset.textsize);
    });
    btn.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
            : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = sizeButtons[(i + dir + sizeButtons.length) % sizeButtons.length];
        next.focus();
        next.click();
    });
});

function bindToggle(id, name, apply) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
        const on = btn.getAttribute('aria-pressed') !== 'true';
        apply(on);
        writePref(name, String(on));
    });
}
bindToggle('a11y-contrast', 'contrast', applyContrast);
bindToggle('a11y-motion', 'motion', applyMotion);
bindToggle('a11y-underline', 'underline', applyUnderline);

const resetBtn = document.getElementById('a11y-reset');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        applyTextSize('1'); writePref('textsize', '1');
        applyContrast(false); writePref('contrast', 'false');
        applyMotion(false); writePref('motion', 'false');
        applyUnderline(false); writePref('underline', 'false');
    });
}

// Panel open/close
const a11yBtn = document.getElementById('accessibility-toggle');
const a11yPanel = document.getElementById('a11y-panel');

function closeA11y(refocus) {
    if (!a11yPanel) return;
    a11yPanel.setAttribute('hidden', '');
    if (a11yBtn) a11yBtn.setAttribute('aria-expanded', 'false');
    if (refocus && a11yBtn) a11yBtn.focus();
}

if (a11yBtn && a11yPanel) {
    a11yBtn.addEventListener('click', () => {
        const open = a11yPanel.hasAttribute('hidden');
        if (open) {
            a11yPanel.removeAttribute('hidden');
            a11yBtn.setAttribute('aria-expanded', 'true');
            const first = a11yPanel.querySelector('button');
            if (first) first.focus();
        } else {
            closeA11y(false);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !a11yPanel.hasAttribute('hidden')) closeA11y(true);
    });

    // Click outside dismisses, but only once the panel is actually open.
    document.addEventListener('click', (e) => {
        if (a11yPanel.hasAttribute('hidden')) return;
        if (a11yPanel.contains(e.target) || a11yBtn.contains(e.target)) return;
        closeA11y(false);
    });

    // Leaving the panel by keyboard closes it, so focus never lands behind it.
    //
    // This has to be checked asynchronously. Safari and Firefox on macOS do not
    // focus a <button> when it is clicked, so a mouse click inside the panel
    // fires focusout with relatedTarget = null. Closing synchronously there hid
    // the panel on mousedown, mouseup then landed on nothing, and the click
    // never fired - every control looked dead to mouse users.
    a11yPanel.addEventListener('focusout', () => {
        setTimeout(() => {
            const active = document.activeElement;
            // Focus fell back to the document: a mouse click, not a tab-out.
            if (!active || active === document.body) return;
            if (a11yPanel.contains(active) || active === a11yBtn) return;
            closeA11y(false);
        }, 0);
    });
}

// Mobile navigation drawer
const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinks = document.getElementById('nav-links');
const navBackdrop = document.getElementById('nav-backdrop');
const navCloseBtn = document.getElementById('nav-close-btn');

function openMobileMenu() {
    if (!navLinks) return;
    navLinks.classList.add('active');
    if (navBackdrop) navBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
    if (navCloseBtn) navCloseBtn.focus();
}

function closeMobileMenu() {
    if (!navLinks) return;
    navLinks.classList.remove('active');
    if (navBackdrop) navBackdrop.classList.remove('active');
    document.body.style.overflow = '';
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
}

if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileMenu);
if (navCloseBtn) navCloseBtn.addEventListener('click', () => {
    closeMobileMenu();
    hamburgerBtn?.focus();
});
if (navBackdrop) navBackdrop.addEventListener('click', closeMobileMenu);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks && navLinks.classList.contains('active')) {
        closeMobileMenu();
        hamburgerBtn?.focus();
    }
});

if (navLinks) {
    navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeMobileMenu);
    });
}
