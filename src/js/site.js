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

// High-contrast accessibility mode
const toggleBtn = document.getElementById('accessibility-toggle');
if (toggleBtn) {
    const isHighContrast = localStorage.getItem('accessibilityMode') === 'true';
    if (isHighContrast) {
        document.body.classList.add('accessibility-mode');
    }
    toggleBtn.setAttribute('aria-pressed', String(isHighContrast));

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('accessibility-mode');
        const isActive = document.body.classList.contains('accessibility-mode');
        localStorage.setItem('accessibilityMode', isActive);
        toggleBtn.setAttribute('aria-pressed', String(isActive));
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
