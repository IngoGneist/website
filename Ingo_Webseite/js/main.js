/* ============================================
   Wärmepumpen Service Ingo Gneist
   Main JavaScript
   ============================================ */

(function () {
    'use strict';

    // --- EmailJS Configuration ---
    // Replace these with your actual EmailJS credentials
    var EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
    var EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
    var EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

    // --- DOM Elements ---
    var header = document.getElementById('header');
    var navToggle = document.getElementById('nav-toggle');
    var navMenu = document.getElementById('nav-menu');
    var contactForm = document.getElementById('contact-form');
    var submitBtn = document.getElementById('submit-btn');
    var formMessage = document.getElementById('form-message');
    var yearSpan = document.getElementById('current-year');

    // --- Set current year ---
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // ============================================
    // COOKIE CONSENT BANNER
    // ============================================
    var COOKIE_CONSENT_KEY = 'wsgi_cookie_consent_v1';

    function setCookieConsent(value) {
        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, value);
        } catch (e) {
            // no-op fallback if storage is blocked
        }
    }

    function getCookieConsent() {
        try {
            return localStorage.getItem(COOKIE_CONSENT_KEY);
        } catch (e) {
            return null;
        }
    }

    function removeCookieBanner() {
        var existing = document.getElementById('cookie-banner');
        if (existing) {
            existing.remove();
        }
        document.body.classList.remove('cookie-banner-open');
    }

    function showCookieBanner() {
        if (document.getElementById('cookie-banner')) return;

        var banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'cookie-banner';
        banner.innerHTML =
            '<div class="cookie-banner__inner">' +
            '<p class="cookie-banner__text">Wir verwenden Cookies, um die Website technisch bereitzustellen und Ihre Nutzung zu verbessern. Details finden Sie in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.</p>' +
            '<div class="cookie-banner__actions">' +
            '<button type="button" class="btn btn--outline cookie-btn" id="cookie-reject">Nur notwendige</button>' +
            '<button type="button" class="btn btn--primary cookie-btn" id="cookie-accept">Alle akzeptieren</button>' +
            '</div>' +
            '</div>';

        document.body.appendChild(banner);
        document.body.classList.add('cookie-banner-open');

        var acceptBtn = document.getElementById('cookie-accept');
        var rejectBtn = document.getElementById('cookie-reject');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', function () {
                setCookieConsent('accepted');
                removeCookieBanner();
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', function () {
                setCookieConsent('necessary');
                removeCookieBanner();
            });
        }
    }

    if (!getCookieConsent()) {
        showCookieBanner();
    }

    // --- Initialize EmailJS ---
    if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }

    // ============================================
    // MOBILE NAVIGATION
    // ============================================

    var overlay = document.createElement('div');
    overlay.className = 'nav__overlay';
    document.body.appendChild(overlay);

    function openMenu() {
        navMenu.classList.add('open');
        navToggle.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        navMenu.classList.remove('open');
        navToggle.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (navToggle) {
        navToggle.addEventListener('click', function () {
            if (navMenu.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    overlay.addEventListener('click', closeMenu);

    var navLinks = document.querySelectorAll('.nav__link');
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', closeMenu);
    }

    // ============================================
    // STICKY HEADER SHADOW
    // ============================================

    var lastScroll = 0;

    function onScroll() {
        var scrollY = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScroll = scrollY;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ============================================
    // HERO PARALLAX & SCROLL ANIMATION
    // ============================================

    var heroBg = document.getElementById('hero-bg');
    var heroContent = document.getElementById('hero-content');
    var heroSection = document.getElementById('hero');
    var ticking = false;

    function updateHeroParallax() {
        var scrollY = window.pageYOffset || document.documentElement.scrollTop;
        if (!heroSection) return;

        var heroH = heroSection.offsetHeight;
        if (scrollY > heroH) {
            ticking = false;
            return;
        }

        var progress = scrollY / heroH;

        if (heroBg) {
            heroBg.style.transform = 'translateY(' + (scrollY * 0.4) + 'px) scale(' + (1 + progress * 0.1) + ')';
        }

        if (heroContent) {
            if (window.innerWidth > 768) {
                var opacity = 1 - progress * 1.8;
                var translateY = scrollY * 0.5;
                if (opacity < 0) opacity = 0;
                heroContent.style.transform = 'translateY(' + translateY + 'px)';
                heroContent.style.opacity = opacity;
            } else {
                heroContent.style.transform = 'none';
                heroContent.style.opacity = 1;
            }
        }

        ticking = false;
    }

    function onHeroScroll() {
        if (!ticking) {
            window.requestAnimationFrame(updateHeroParallax);
            ticking = true;
        }
    }

    if (heroSection) {
        window.addEventListener('scroll', onHeroScroll, { passive: true });
        updateHeroParallax();
    }

    // ============================================
    // SCROLL REVEAL ANIMATION
    // ============================================

    var revealElements = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            for (var j = 0; j < entries.length; j++) {
                if (entries[j].isIntersecting) {
                    entries[j].target.classList.add('visible');
                    revealObserver.unobserve(entries[j].target);
                }
            }
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        for (var k = 0; k < revealElements.length; k++) {
            revealObserver.observe(revealElements[k]);
        }
    } else {
        for (var l = 0; l < revealElements.length; l++) {
            revealElements[l].classList.add('visible');
        }
    }

    // ============================================
    // ACTIVE NAV LINK HIGHLIGHTING
    // ============================================

    var sections = document.querySelectorAll('section[id]');

    function highlightNav() {
        var scrollPos = window.pageYOffset + 120;

        for (var m = 0; m < sections.length; m++) {
            var section = sections[m];
            var sectionTop = section.offsetTop;
            var sectionHeight = section.offsetHeight;
            var sectionId = section.getAttribute('id');

            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                for (var n = 0; n < navLinks.length; n++) {
                    navLinks[n].classList.remove('active');
                    if (navLinks[n].getAttribute('href') === '#' + sectionId) {
                        navLinks[n].classList.add('active');
                    }
                }
            }
        }
    }

    window.addEventListener('scroll', highlightNav, { passive: true });

    // ============================================
    // FORM VALIDATION & SUBMISSION
    // ============================================

    var requiredFields = [
        { id: 'vorname', name: 'Vorname' },
        { id: 'nachname', name: 'Nachname' },
        { id: 'telefon', name: 'Telefon' },
        { id: 'email', name: 'E-Mail' },
        { id: 'thema', name: 'Thema' }
    ];

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function clearErrors() {
        var errorFields = document.querySelectorAll('.error');
        for (var p = 0; p < errorFields.length; p++) {
            errorFields[p].classList.remove('error');
        }
    }

    function showMessage(type, text) {
        formMessage.hidden = false;
        formMessage.className = 'contact-form__message ' + type;
        formMessage.textContent = text;
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideMessage() {
        formMessage.hidden = true;
        formMessage.className = 'contact-form__message';
        formMessage.textContent = '';
    }

    function setLoading(loading) {
        var btnText = submitBtn.querySelector('.btn__text');
        var btnLoader = submitBtn.querySelector('.btn__loader');

        if (loading) {
            submitBtn.disabled = true;
            btnText.textContent = 'Wird gesendet...';
            btnLoader.hidden = false;
        } else {
            submitBtn.disabled = false;
            btnText.textContent = 'Anfrage absenden';
            btnLoader.hidden = true;
        }
    }

    function getFieldValue(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    }

    function updateTechnicalFieldsRequirement() {
        var themaField = document.getElementById('thema');
        var herstellerField = document.getElementById('hersteller');
        var typenField = document.getElementById('typenbezeichnung');
        if (!themaField) return;

        // Remove unwanted topics from dropdown everywhere.
        var blockedTopics = ['Unsere Partner', 'Über uns'];
        for (var i = themaField.options.length - 1; i >= 0; i--) {
            if (blockedTopics.indexOf(themaField.options[i].text) !== -1) {
                themaField.remove(i);
            }
        }

        var isWartung = themaField.value === 'Wärmepumpen Wartung';

        if (herstellerField) {
            herstellerField.required = isWartung;
            herstellerField.setAttribute('aria-required', isWartung ? 'true' : 'false');
            var hReq = document.querySelector('label[for="hersteller"] .required');
            if (hReq) hReq.style.display = isWartung ? '' : 'none';
        }

        if (typenField) {
            typenField.required = isWartung;
            typenField.setAttribute('aria-required', isWartung ? 'true' : 'false');
            var tReq = document.querySelector('label[for="typenbezeichnung"] .required');
            if (tReq) tReq.style.display = isWartung ? '' : 'none';
        }
    }

    if (contactForm) {
        updateTechnicalFieldsRequirement();
        var themaSelect = document.getElementById('thema');
        if (themaSelect) {
            themaSelect.addEventListener('change', updateTechnicalFieldsRequirement);
        }

        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearErrors();
            hideMessage();

            var isValid = true;
            var firstErrorField = null;

            for (var q = 0; q < requiredFields.length; q++) {
                var field = document.getElementById(requiredFields[q].id);
                if (field && !field.value.trim()) {
                    field.classList.add('error');
                    isValid = false;
                    if (!firstErrorField) firstErrorField = field;
                }
            }

            var selectedTopic = getFieldValue('thema').trim();
            var needsTechnicalData = selectedTopic === 'Wärmepumpen Wartung';
            if (needsTechnicalData) {
                var conditionalFields = ['hersteller', 'typenbezeichnung'];
                for (var c = 0; c < conditionalFields.length; c++) {
                    var conditionalField = document.getElementById(conditionalFields[c]);
                    if (conditionalField && !conditionalField.value.trim()) {
                        conditionalField.classList.add('error');
                        isValid = false;
                        if (!firstErrorField) firstErrorField = conditionalField;
                    }
                }
            }

            var emailField = document.getElementById('email');
            if (emailField && emailField.value.trim() && !validateEmail(emailField.value.trim())) {
                emailField.classList.add('error');
                isValid = false;
                if (!firstErrorField) firstErrorField = emailField;
            }

            var datenschutzField = document.getElementById('datenschutz');
            if (datenschutzField && !datenschutzField.checked) {
                isValid = false;
                if (!firstErrorField) firstErrorField = datenschutzField;
            }

            if (!isValid) {
                showMessage('error', 'Bitte füllen Sie alle Pflichtfelder korrekt aus und akzeptieren Sie die Datenschutzerklärung.');
                if (firstErrorField) {
                    firstErrorField.focus();
                }
                return;
            }

            var templateParams = {
                firma: getFieldValue('firma'),
                anrede: getFieldValue('anrede'),
                vorname: getFieldValue('vorname'),
                nachname: getFieldValue('nachname'),
                telefon: getFieldValue('telefon'),
                wunschdatum: getFieldValue('wunschdatum'),
                uhrzeit_von: getFieldValue('uhrzeit_von'),
                uhrzeit_bis: getFieldValue('uhrzeit_bis'),
                email: getFieldValue('email'),
                thema: getFieldValue('thema'),
                nachricht: getFieldValue('nachricht'),
                hersteller: getFieldValue('hersteller'),
                typenbezeichnung: getFieldValue('typenbezeichnung')
            };

            if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
                setLoading(true);

                emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                    .then(function () {
                        setLoading(false);
                        showMessage('success', 'Vielen Dank! Ihre Anfrage wurde erfolgreich gesendet. Wir melden uns schnellstmöglich bei Ihnen.');
                        contactForm.reset();
                    })
                    .catch(function () {
                        setLoading(false);
                        showMessage('error', 'Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns telefonisch.');
                    });
            } else {
                var mailtoSubject = encodeURIComponent('Anfrage: ' + templateParams.thema);
                var mailtoBody = encodeURIComponent(
                    'Anrede: ' + templateParams.anrede + '\n' +
                    'Name: ' + templateParams.vorname + ' ' + templateParams.nachname + '\n' +
                    'Firma: ' + templateParams.firma + '\n' +
                    'Telefon: ' + templateParams.telefon + '\n' +
                    'E-Mail: ' + templateParams.email + '\n' +
                    'Wunschdatum: ' + templateParams.wunschdatum + '\n' +
                    'Uhrzeit: ' + templateParams.uhrzeit_von + ' - ' + templateParams.uhrzeit_bis + '\n' +
                    'Hersteller: ' + templateParams.hersteller + '\n' +
                    'Typ: ' + templateParams.typenbezeichnung + '\n\n' +
                    'Nachricht:\n' + templateParams.nachricht
                );

                window.location.href = 'mailto:ingogneist@xn--service-wrmepumpen-ttb.de?subject=' + mailtoSubject + '&body=' + mailtoBody;
                showMessage('success', 'Ihr E-Mail-Programm wird geöffnet. Bitte senden Sie die vorbereitete E-Mail ab.');
            }
        });

        var inputs = contactForm.querySelectorAll('input, select, textarea');
        for (var r = 0; r < inputs.length; r++) {
            inputs[r].addEventListener('input', function () {
                this.classList.remove('error');
            });
        }
    }

    // ============================================
    // SMOOTH SCROLL (fallback for older browsers)
    // ============================================

    var anchorLinks = document.querySelectorAll('a[href^="#"]');

    for (var s = 0; s < anchorLinks.length; s++) {
        anchorLinks[s].addEventListener('click', function (e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;

            var targetEl = document.querySelector(targetId);
            if (!targetEl) return;

            if (!('scrollBehavior' in document.documentElement.style)) {
                e.preventDefault();
                var targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    }

})();
