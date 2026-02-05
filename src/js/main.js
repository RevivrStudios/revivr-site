import '../css/style.css';
import '../css/layout.css';

console.log('Revivr Studios site loaded.');

// Dynamic Year for Footer
const yearSpan = document.getElementById('current-year');
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}

// Accessibility Toggle Logic
const toggleBtn = document.getElementById('accessibility-toggle');
if (toggleBtn) {
    // Check for saved preference
    const isHighContrast = localStorage.getItem('accessibilityMode') === 'true';
    if (isHighContrast) {
        document.body.classList.add('accessibility-mode');
        toggleBtn.setAttribute('aria-pressed', 'true');
    }

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('accessibility-mode');
        const isActive = document.body.classList.contains('accessibility-mode');

        // Save preference
        localStorage.setItem('accessibilityMode', isActive);
        toggleBtn.setAttribute('aria-pressed', isActive);

        console.log('Accessibility Mode:', isActive ? 'ON' : 'OFF');
    });
}

// Mobile Navigation Menu Toggle
const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinks = document.getElementById('nav-links');
const navBackdrop = document.getElementById('nav-backdrop');
const navCloseBtn = document.getElementById('nav-close-btn');

function openMobileMenu() {
    navLinks.classList.add('active');
    navBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    hamburgerBtn.setAttribute('aria-expanded', 'true');
}

function closeMobileMenu() {
    navLinks.classList.remove('active');
    navBackdrop.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll
    hamburgerBtn.setAttribute('aria-expanded', 'false');
}

if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', openMobileMenu);
}

if (navCloseBtn) {
    navCloseBtn.addEventListener('click', closeMobileMenu);
}

if (navBackdrop) {
    navBackdrop.addEventListener('click', closeMobileMenu);
}

// Close menu on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        closeMobileMenu();
    }
});

// Close menu when clicking a navigation link (for smooth page navigation)
if (navLinks) {
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
}
