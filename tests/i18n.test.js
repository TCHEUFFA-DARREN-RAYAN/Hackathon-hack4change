/**
 * i18n translation system tests
 * Since i18n.js runs in the browser (IIFE), we simulate the DOM environment.
 */
const fs = require('fs');
const path = require('path');

describe('i18n translation system', () => {
    let i18nSource;

    beforeAll(() => {
        i18nSource = fs.readFileSync(
            path.join(__dirname, '../public/js/i18n.js'),
            'utf8'
        );
    });

    test('i18n.js file exists and is non-empty', () => {
        expect(i18nSource).toBeTruthy();
        expect(i18nSource.length).toBeGreaterThan(100);
    });

    test('contains English translations', () => {
        expect(i18nSource).toContain("en: {");
        expect(i18nSource).toContain("navBrand:");
        expect(i18nSource).toContain("pageTitle:");
        expect(i18nSource).toContain("heroCta:");
    });

    test('contains French translations', () => {
        expect(i18nSource).toContain("fr: {");
        expect(i18nSource).toContain("navBrand: 'Réseau GMHSC'");
        expect(i18nSource).toContain("pageTitle: 'Tableau des besoins communautaires'");
    });

    test('all EN keys have FR equivalents', () => {
        const extractKeys = (block) => {
            const matches = block.match(/^\s+(\w+):/gm);
            return matches ? matches.map(m => m.trim().replace(':', '')) : [];
        };

        const enMatch = i18nSource.match(/en:\s*\{([\s\S]*?)\},\s*fr:/);
        const frMatch = i18nSource.match(/fr:\s*\{([\s\S]*?)\},?\s*\};/);

        expect(enMatch).toBeTruthy();
        expect(frMatch).toBeTruthy();

        const enKeys = extractKeys(enMatch[1]);
        const frKeys = extractKeys(frMatch[1]);

        const missingInFr = enKeys.filter(k => !frKeys.includes(k));
        expect(missingInFr).toEqual([]);
    });

    test('exposes window.i18n with required methods', () => {
        expect(i18nSource).toContain('window.i18n =');
        expect(i18nSource).toContain('t: function');
        expect(i18nSource).toContain('apply: applyTranslations');
        expect(i18nSource).toContain('switchLocale:');
        expect(i18nSource).toContain('CAT_LABELS:');
        expect(i18nSource).toContain('URGENCY_LABELS:');
    });

    test('handles data-i18n attribute translation', () => {
        expect(i18nSource).toContain("data-i18n");
        expect(i18nSource).toContain("data-i18n-placeholder");
        expect(i18nSource).toContain("data-i18n-html");
    });

    test('falls back to EN when key is missing', () => {
        expect(i18nSource).toContain("translations.en[key] || key");
    });

    test('stores locale preference in localStorage', () => {
        expect(i18nSource).toContain("localStorage.setItem(LOCALE_KEY, locale)");
        expect(i18nSource).toContain("localStorage.getItem(LOCALE_KEY)");
    });

    test('detects browser language for default locale', () => {
        expect(i18nSource).toContain("navigator.language.startsWith('fr')");
    });

    test('sets document.documentElement.lang correctly', () => {
        expect(i18nSource).toContain("document.documentElement.lang = currentLocale");
    });

    test('contains all 5 organization category translations', () => {
        const categories = ['catShelterHousing', 'catFoodNutrition', 'catGoodsEssentials', 'catMentalHealth', 'catOutreach'];
        categories.forEach(cat => {
            expect(i18nSource).toContain(cat);
        });
    });

    test('contains all 4 urgency level translations', () => {
        const urgencies = ['urgencyCritical', 'urgencyHigh', 'urgencyMedium', 'urgencyLow'];
        urgencies.forEach(u => {
            expect(i18nSource).toContain(u);
        });
    });

    test('donate form has all step translations in both languages', () => {
        ['step1Label', 'step2Label', 'step3Label', 'step4Label'].forEach(key => {
            const matches = i18nSource.match(new RegExp(key, 'g'));
            expect(matches.length).toBeGreaterThanOrEqual(2);
        });
    });
});

describe('i18n data-i18n attributes in HTML pages', () => {
    const publicDir = path.join(__dirname, '../public');

    test('index.html uses data-i18n attributes', () => {
        const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
        expect(html).toContain('data-i18n=');
    });

    test('donate.html uses data-i18n attributes', () => {
        const html = fs.readFileSync(path.join(publicDir, 'donate.html'), 'utf8');
        expect(html).toContain('data-i18n=');
    });

    test('public pages include i18n.js script', () => {
        const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
        expect(indexHtml).toContain('i18n.js');
    });
});
