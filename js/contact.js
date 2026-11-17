/**
 * Contact Form Module
 * Modern Editorial Developer Portfolio
 *
 * Implements robust client-side validation, accessible error announcements,
 * and a secure fallback mailto integration without exposing private credentials.
 */

// Configuration for optional EmailJS or direct mail delivery
const CONTACT_CONFIG = {
  recipientEmail: "developer@example.com",
  // If EmailJS is configured later, service IDs can be supplied here without exposing secrets:
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: ""
};

export function initContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const subjectInput = document.getElementById('contact-subject');
  const messageInput = document.getElementById('contact-message');
  const formStatus = document.getElementById('form-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const subjectError = document.getElementById('subject-error');
  const messageError = document.getElementById('message-error');

  // Email format verification regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

  function validateField(input, errorEl, validator, errorMsg) {
    if (!input || !errorEl) return false;
    const val = input.value.trim();
    const isValid = validator(val);

    if (!isValid) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = errorMsg;
      return false;
    } else {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      input.setAttribute('aria-invalid', 'false');
      errorEl.textContent = '';
      return true;
    }
  }

  // Real-time input event listeners
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      validateField(nameInput, nameError, val => val.length >= 2, 'Please enter your name (at least 2 characters).');
    });
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      validateField(emailInput, emailError, val => emailRegex.test(val), 'Please enter a valid email address.');
    });
  }

  if (subjectInput) {
    subjectInput.addEventListener('input', () => {
      validateField(subjectInput, subjectError, val => val.length >= 3, 'Please enter a subject (at least 3 characters).');
    });
  }

  if (messageInput) {
    messageInput.addEventListener('input', () => {
      validateField(messageInput, messageError, val => val.length >= 10, 'Please write a message of at least 10 characters.');
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Clear previous status
    if (formStatus) {
      formStatus.textContent = '';
      formStatus.className = 'form-status';
    }

    const isNameValid = validateField(
      nameInput,
      nameError,
      val => val.length >= 2,
      'Please enter your name (at least 2 characters).'
    );

    const isEmailValid = validateField(
      emailInput,
      emailError,
      val => emailRegex.test(val),
      'Please enter a valid email address.'
    );

    const isSubjectValid = validateField(
      subjectInput,
      subjectError,
      val => val.length >= 3,
      'Please enter a subject (at least 3 characters).'
    );

    const isMessageValid = validateField(
      messageInput,
      messageError,
      val => val.length >= 10,
      'Please write a message of at least 10 characters.'
    );

    // If any field is invalid, set error message and focus first invalid input
    if (!isNameValid || !isEmailValid || !isSubjectValid || !isMessageValid) {
      if (formStatus) {
        formStatus.textContent = 'Please review and fix the highlighted fields above.';
        formStatus.className = 'form-status is-error';
      }

      if (!isNameValid && nameInput) nameInput.focus();
      else if (!isEmailValid && emailInput) emailInput.focus();
      else if (!isSubjectValid && subjectInput) subjectInput.focus();
      else if (!isMessageValid && messageInput) messageInput.focus();

      return;
    }

    // All fields are valid
    const nameVal = nameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const subjectVal = subjectInput.value.trim();
    const messageVal = messageInput.value.trim();

    // Disable button to prevent duplicate submissions
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    // Construct safe mailto URI as direct client fallback
    const mailSubject = encodeURIComponent(`[Portfolio Inquiry] ${subjectVal}`);
    const mailBody = encodeURIComponent(
      `Hello,\n\nYou have received a new inquiry from your portfolio website:\n\n` +
      `From: ${nameVal} (${emailVal})\n` +
      `Subject: ${subjectVal}\n\n` +
      `Message:\n${messageVal}\n\n---\nSent from Modern Editorial Developer Portfolio`
    );

    const mailtoUrl = `mailto:${CONTACT_CONFIG.recipientEmail}?subject=${mailSubject}&body=${mailBody}`;

    setTimeout(() => {
      // Trigger user's mail client safely
      window.location.href = mailtoUrl;

      if (formStatus) {
        formStatus.textContent = 'Thank you! Your email client has been prepared with your message.';
        formStatus.className = 'form-status is-success';
      }

      // Reset form controls
      form.reset();
      [nameInput, emailInput, subjectInput, messageInput].forEach(inp => {
        if (inp) {
          inp.classList.remove('is-valid', 'is-invalid');
          inp.removeAttribute('aria-invalid');
        }
      });

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    }, 400);
  });
}
