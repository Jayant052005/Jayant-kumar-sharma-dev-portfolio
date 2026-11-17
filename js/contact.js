/**
 * Contact Module
 * Client-side validation and form handling
 */

export function initContact() {
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formStatus = document.getElementById('form-status');

    const name = document.getElementById('contact-name')?.value.trim();
    const email = document.getElementById('contact-email')?.value.trim();
    const message = document.getElementById('contact-message')?.value.trim();

    if (!name || !email || !message) {
      if (formStatus) {
        formStatus.textContent = 'Please fill out all required fields.';
        formStatus.className = 'form-status text-accent';
      }
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (formStatus) {
        formStatus.textContent = 'Please enter a valid email address.';
        formStatus.className = 'form-status text-accent';
      }
      return;
    }

    // Default development fallback / mailto notice
    if (formStatus) {
      formStatus.textContent = 'Thank you for your message. Contact service configuration in progress.';
      formStatus.className = 'form-status text-muted';
    }
  });
}

