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
