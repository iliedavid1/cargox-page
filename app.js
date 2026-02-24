const body = document.body;
const isLandingPage = body?.dataset?.page === 'landing';

const scrollLinks = document.querySelectorAll('[data-scroll-target]');
const revealItems = document.querySelectorAll('.reveal-on-scroll');
const menuToggle = document.getElementById('menu-toggle');
const menuClose = document.getElementById('menu-close');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');
const themeToggle = document.getElementById('theme-toggle');
const leadForm = document.getElementById('lead-form');
const leadStatus = document.getElementById('lead-status');
const mobileCta = document.querySelector('.mobile-sticky-cta');
const header = document.querySelector('.site-header');

const THEME_KEY = 'cargox-theme';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const initialTheme = localStorage.getItem(THEME_KEY) || (prefersDark.matches ? 'dark' : 'light');
const SHEETDB_ENDPOINT = 'https://sheetdb.io/api/v1/4e275366nz4kw';

function applyTheme(theme) {
    const isDark = theme === 'dark';
    if (body) {
        body.dataset.theme = theme;
    }
    if (themeToggle) {
        themeToggle.setAttribute('aria-pressed', isDark.toString());
        themeToggle.setAttribute('aria-label', isDark ? 'Comută pe modul luminos' : 'Comută pe modul întunecat');
    }
}

applyTheme(initialTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const nextTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, nextTheme);
        applyTheme(nextTheme);
    });
}

const handlePrefersChange = (event) => {
    if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(event.matches ? 'dark' : 'light');
    }
};

if (prefersDark?.addEventListener) {
    prefersDark.addEventListener('change', handlePrefersChange);
}

const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }) : null;

if (revealObserver) {
    revealItems.forEach(item => revealObserver.observe(item));
}

if (mobileCta && isLandingPage && 'IntersectionObserver' in window) {
    const hero = document.querySelector('.hero');
    if (hero) {
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    mobileCta.classList.add('is-visible');
                } else {
                    mobileCta.classList.remove('is-visible');
                }
            });
        }, { rootMargin: '-100px 0px 0px 0px' });
        heroObserver.observe(hero);
    }
}

function smoothScrollTo(selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    const headerHeight = header ? header.offsetHeight : 0;
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = Math.max(targetPosition - headerHeight - 16, 0);

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

function setMenuState(isOpen) {
    if (!sideMenu || !menuToggle || !menuOverlay) return;
    sideMenu.classList.toggle('open', isOpen);
    menuOverlay.classList.toggle('open', isOpen);
    menuToggle.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-pressed', isOpen.toString());
    sideMenu.setAttribute('aria-hidden', (!isOpen).toString());
    menuOverlay.setAttribute('aria-hidden', (!isOpen).toString());
    document.body.classList.toggle('menu-open', isOpen);
}

menuToggle?.addEventListener('click', () => {
    const nextState = !sideMenu?.classList.contains('open');
    setMenuState(nextState);
});

menuClose?.addEventListener('click', () => setMenuState(false));
menuOverlay?.addEventListener('click', () => setMenuState(false));

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuState(false);
});

if (sideMenu) {
    sideMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setMenuState(false));
    });
}

scrollLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        if (!isLandingPage) return;
        const targetSelector = link.dataset.scrollTarget;
        if (!targetSelector) return;
        event.preventDefault();
        smoothScrollTo(targetSelector);
    });
});

function simulateSubmission(formElement, statusElement) {
    formElement.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(formElement);
        const requiredFields = ['fullname', 'company', 'email', 'phone', 'role'];
        const hasEmpty = requiredFields.some(fieldName => {
            const value = formData.get(fieldName);
            return !value || !String(value).trim();
        });
        if (hasEmpty) {
            statusElement.textContent = 'Te rugăm să completezi toate câmpurile obligatorii.';
            statusElement.style.color = '#d32f2f';
            return;
        }
        const phonePrefix = (formData.get('phone-prefix') || '').trim().replace(/^\+/, '');
        const phoneNumber = (formData.get('phone') || '').trim().replace(/\s/g, '');
        const phoneFull = phonePrefix + phoneNumber;
        const payload = {
            data: [{
                Name: (formData.get('fullname') || '').trim(),
                Company: (formData.get('company') || '').trim(),
                Email: (formData.get('email') || '').trim(),
                Phone: phoneFull,
                Role: formData.get('role'),
                SubmittedAt: new Date().toISOString()
            }]
        };

        const btn = formElement.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Se trimite...';
        btn.disabled = true;
        statusElement.style.color = 'var(--muted)';
        statusElement.textContent = 'Trimitem datele către Google Sheets...';

        try {
            const response = await fetch(SHEETDB_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok || !(result?.created >= 1)) {
                throw new Error('SheetDB submission failed');
            }

            statusElement.style.color = 'var(--green)';
            statusElement.textContent = 'Mulțumim! Te-am adăugat pe lista de priorități.';
            formElement.reset();
        } catch (error) {
            console.error(error);
            statusElement.style.color = '#d32f2f';
            statusElement.textContent = 'Ups! Nu am reușit să salvăm datele. Încearcă din nou.';
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

if (isLandingPage && leadForm && leadStatus) {
    simulateSubmission(leadForm, leadStatus);
}

