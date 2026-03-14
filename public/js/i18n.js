/**
 * CommonGround — Bilingual (EN/FR) support for public HTML pages
 * Uses same localStorage key as React frontend: commonground-locale
 */
(function () {
  const LOCALE_KEY = 'commonground-locale';

  const translations = {
    en: {
      // Nav
      navBrand: 'GMHSC Network',
      navNeedsBoard: 'Needs Board',
      navDonate: 'Donate',
      navStaffLogin: 'Staff login',

      // Index / Needs board
      pageTitle: 'What shelters need right now',
      pageDescription: "28 organizations in the Greater Moncton area, coordinated in one place. See what's urgently needed and donate directly.",
      heroCta: 'I have something to donate',
      searchPlaceholder: 'Search by item or organization...',
      filterUrgency: 'All urgency levels',
      filterCategory: 'All organizations',
      urgencyCritical: 'Critical',
      urgencyHigh: 'High',
      urgencyMedium: 'Medium',
      urgencyLow: 'Low',
      catShelterHousing: 'Shelter & Housing',
      catFoodNutrition: 'Food & Nutrition',
      catGoodsEssentials: 'Goods & Essentials',
      catMentalHealth: 'Mental Health',
      catOutreach: 'Outreach',
      noActiveNeeds: 'No active needs match your filters',
      tryClearingFilters: 'Try clearing the filters or check back later.',
      noActiveNeedsPosted: 'No active needs posted',
      updated: 'Updated',
      donate: 'Donate',
      organizations: 'organization',
      organizationsPlural: 'organizations',
      prev: 'Prev',
      next: 'Next',
      failedToLoad: 'Failed to load the needs board. Please refresh the page.',

      // Donate page
      donateTitle: 'Make a donation',
      donateSubtitle: 'Your donation will be matched to the organization with the greatest need.',
      step1Label: 'What are<br>you donating?',
      step2Label: 'Your<br>contact info',
      step3Label: 'Match<br>preview',
      step4Label: 'Confirmation',
      whatDonating: 'What are you donating?',
      itemDesc: 'Item description',
      itemPlaceholder: "e.g. Men's winter jackets, canned soup, sleeping bags",
      errItem: 'Please describe the item.',
      category: 'Category',
      selectCategory: 'Select a category',
      condition: 'Condition',
      quantity: 'Quantity',
      unit: 'Unit',
      errCategory: 'Please select a category.',
      errQuantity: 'Please enter a quantity.',
      clothing: 'Clothing',
      bedding: 'Bedding & Linens',
      food: 'Food & Beverages',
      hygiene: 'Hygiene Products',
      babySupplies: 'Baby Supplies',
      goods: 'Household Goods',
      furniture: 'Furniture',
      other: 'Other',
      items: 'Items',
      pairs: 'Pairs',
      bags: 'Bags',
      boxes: 'Boxes',
      cans: 'Cans',
      bottles: 'Bottles',
      packs: 'Packs',
      kg: 'Kilograms',
      sets: 'Sets',
      newCondition: 'New',
      goodCondition: 'Good',
      fairCondition: 'Fair',
      nextBtn: 'Next',
      backBtn: 'Back',
      contactInfo: 'Your contact information',
      contactNotice: 'Your contact details are only shared with the matched organization to arrange pickup or drop-off.',
      fullName: 'Full name',
      emailAddress: 'Email address',
      phoneNumber: 'Phone number',
      optional: '(optional)',
      preferredOrg: 'Preferred organization',
      letSystemMatch: 'Let the system find the best match',
      contactHint: 'Leave blank to have the system match your donation to the organization with the greatest need.',
      nextSeeMatch: 'Next — see match',
      whereDonationGoes: 'Where your donation goes',
      findingMatch: 'Finding the best match for your donation...',
      topMatches: 'Based on current needs across the network, here are the top matches for your donation. Select one to proceed.',
      orChooseDifferent: 'Or choose a different organization',
      selectOrg: 'Select an organization',
      chooseDifferentInstead: 'Choose a different organization instead',
      useSystemRecommendation: 'Use system recommendation instead',
      noMatchingNeeds: 'No matching needs found. Please select an organization manually below.',
      selectOrgRequired: 'Select an organization',
      confirmMatch: 'Confirm this match',
      donationSubmitted: 'Your donation has been submitted',
      thankYou: 'Thank you. The organization has been notified and will be in touch to arrange collection.',
      nextSteps: 'Next steps',
      nextStepsDesc: "The organization's staff will review your donation and contact you at the email or phone number you provided to arrange pickup or drop-off.",
      questionsContact: "Questions? Contact the organization directly using the details above.",
      backToNeedsBoard: 'Back to needs board',
      donateAnother: 'Donate another item',
      matchedTo: 'Matched to:',
      item: 'Item:',
      yourName: 'Your name:',
      yourEmail: 'Your email:',
      orgContact: 'Organization contact:',
      address: 'Address:',
      selectedByYou: 'Selected by you.',
      selectedDirectly: 'Organization selected directly by donor.',
      manuallySelected: 'Manually selected by donor.',
      pleaseSelectOrg: 'Please select an organization.',
      submitting: 'Submitting...',
      submissionFailed: 'Submission failed. Please try again.',
      errName: 'Please enter your name.',
      errEmail: 'Please enter a valid email address.',
      yourNamePlaceholder: 'Your name',
      emailPlaceholder: 'you@email.com',
      phonePlaceholder: '506-000-0000',

      // Language
      langEn: 'English',
      langFr: 'Français',
    },
    fr: {
      // Nav
      navBrand: 'Réseau GMHSC',
      navNeedsBoard: 'Tableau des besoins',
      navDonate: 'Donner',
      navStaffLogin: 'Connexion personnel',

      // Index / Needs board
      pageTitle: 'Ce dont les refuges ont besoin maintenant',
      pageDescription: '28 organismes de la région du Grand Moncton, coordonnés en un seul endroit. Voyez ce qui est urgent et donnez directement.',
      heroCta: "J'ai quelque chose à donner",
      searchPlaceholder: 'Rechercher par article ou organisme...',
      filterUrgency: 'Tous les niveaux d\'urgence',
      filterCategory: 'Tous les organismes',
      urgencyCritical: 'Critique',
      urgencyHigh: 'Élevé',
      urgencyMedium: 'Moyen',
      urgencyLow: 'Faible',
      catShelterHousing: 'Hébergement et logement',
      catFoodNutrition: 'Alimentation et nutrition',
      catGoodsEssentials: 'Biens et essentiels',
      catMentalHealth: 'Santé mentale',
      catOutreach: 'Intervention de rue',
      noActiveNeeds: 'Aucun besoin actif ne correspond à vos filtres',
      tryClearingFilters: 'Essayez d\'effacer les filtres ou revenez plus tard.',
      noActiveNeedsPosted: 'Aucun besoin actif publié',
      updated: 'Mis à jour',
      donate: 'Donner',
      organizations: 'organisme',
      organizationsPlural: 'organismes',
      prev: 'Préc.',
      next: 'Suiv.',
      failedToLoad: 'Échec du chargement du tableau. Veuillez actualiser la page.',

      // Donate page
      donateTitle: 'Faire un don',
      donateSubtitle: 'Votre don sera jumelé à l\'organisme qui en a le plus besoin.',
      step1Label: 'Que<br>donnez-vous?',
      step2Label: 'Vos<br>coordonnées',
      step3Label: 'Aperçu du<br>jumelage',
      step4Label: 'Confirmation',
      whatDonating: 'Que donnez-vous?',
      itemDesc: 'Description de l\'article',
      itemPlaceholder: 'p. ex. Manteaux d\'hiver pour hommes, soupe en conserve, sacs de couchage',
      errItem: 'Veuillez décrire l\'article.',
      category: 'Catégorie',
      selectCategory: 'Sélectionner une catégorie',
      condition: 'État',
      quantity: 'Quantité',
      unit: 'Unité',
      errCategory: 'Veuillez sélectionner une catégorie.',
      errQuantity: 'Veuillez entrer une quantité.',
      clothing: 'Vêtements',
      bedding: 'Literie et draps',
      food: 'Aliments et boissons',
      hygiene: 'Produits d\'hygiène',
      babySupplies: 'Fournitures pour bébé',
      goods: 'Articles ménagers',
      furniture: 'Meubles',
      other: 'Autre',
      items: 'Articles',
      pairs: 'Paires',
      bags: 'Sacs',
      boxes: 'Boîtes',
      cans: 'Boîtes',
      bottles: 'Bouteilles',
      packs: 'Paquets',
      kg: 'Kilogrammes',
      sets: 'Ensembles',
      newCondition: 'Neuf',
      goodCondition: 'Bon',
      fairCondition: 'Passable',
      nextBtn: 'Suivant',
      backBtn: 'Retour',
      contactInfo: 'Vos coordonnées',
      contactNotice: 'Vos coordonnées ne sont partagées qu\'avec l\'organisme jumelé pour organiser la collecte ou la livraison.',
      fullName: 'Nom complet',
      emailAddress: 'Adresse courriel',
      phoneNumber: 'Numéro de téléphone',
      optional: '(optionnel)',
      preferredOrg: 'Organisme préféré',
      letSystemMatch: 'Laisser le système trouver la meilleure correspondance',
      contactHint: 'Laissez vide pour que le système jumelle votre don à l\'organisme qui en a le plus besoin.',
      nextSeeMatch: 'Suivant — voir le jumelage',
      whereDonationGoes: 'Où va votre don',
      findingMatch: 'Recherche de la meilleure correspondance pour votre don...',
      topMatches: 'Selon les besoins actuels du réseau, voici les meilleures correspondances. Sélectionnez-en une pour continuer.',
      orChooseDifferent: 'Ou choisir un autre organisme',
      selectOrg: 'Sélectionner un organisme',
      chooseDifferentInstead: 'Choisir un autre organisme',
      useSystemRecommendation: 'Utiliser la recommandation du système',
      noMatchingNeeds: 'Aucun besoin correspondant. Veuillez sélectionner un organisme manuellement ci-dessous.',
      selectOrgRequired: 'Sélectionner un organisme',
      confirmMatch: 'Confirmer ce jumelage',
      donationSubmitted: 'Votre don a été soumis',
      thankYou: 'Merci. L\'organisme a été avisé et vous contactera pour organiser la collecte.',
      nextSteps: 'Prochaines étapes',
      nextStepsDesc: 'Le personnel de l\'organisme examinera votre don et vous contactera au courriel ou au téléphone fourni pour organiser la collecte ou la livraison.',
      questionsContact: 'Des questions? Contactez l\'organisme directement avec les coordonnées ci-dessus.',
      backToNeedsBoard: 'Retour au tableau des besoins',
      donateAnother: 'Donner un autre article',
      matchedTo: 'Jumelé à:',
      item: 'Article:',
      yourName: 'Votre nom:',
      yourEmail: 'Votre courriel:',
      orgContact: 'Contact de l\'organisme:',
      address: 'Adresse:',
      selectedByYou: 'Sélectionné par vous.',
      selectedDirectly: 'Organisme sélectionné directement par le donateur.',
      manuallySelected: 'Sélectionné manuellement par le donateur.',
      pleaseSelectOrg: 'Veuillez sélectionner un organisme.',
      submitting: 'Envoi en cours...',
      submissionFailed: 'Échec de l\'envoi. Veuillez réessayer.',
      errName: 'Veuillez entrer votre nom.',
      errEmail: 'Veuillez entrer une adresse courriel valide.',
      yourNamePlaceholder: 'Votre nom',
      emailPlaceholder: 'vous@courriel.com',
      phonePlaceholder: '506-000-0000',

      langEn: 'English',
      langFr: 'Français',
    },
  };

  function getLocale() {
    try {
      const stored = localStorage.getItem(LOCALE_KEY);
      if (stored) return stored;
      return navigator.language.startsWith('fr') ? 'fr' : 'en';
    } catch {
      return 'en';
    }
  }

  function setLocale(locale) {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {}
  }

  let currentLocale = getLocale();

  function applyTranslations() {
    document.documentElement.lang = currentLocale === 'fr' ? 'fr' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = window.i18n.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = window.i18n.t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = window.i18n.t(key);
    });
  }

  window.i18n = {
    t: function (key) {
      const dict = translations[currentLocale] || translations.en;
      return dict[key] || translations.en[key] || key;
    },
    apply: applyTranslations,
    getLocale: getLocale,
    setLocale: function (locale) {
      currentLocale = locale;
      setLocale(locale);
    },
    switchLocale: function () {
      currentLocale = currentLocale === 'fr' ? 'en' : 'fr';
      setLocale(currentLocale);
      window.location.reload();
    },
    CAT_LABELS: function () {
      return {
        shelter_housing: this.t('catShelterHousing'),
        food_nutrition: this.t('catFoodNutrition'),
        goods_essentials: this.t('catGoodsEssentials'),
        mental_health: this.t('catMentalHealth'),
        outreach: this.t('catOutreach'),
      };
    },
    URGENCY_LABELS: function () {
      return {
        critical: this.t('urgencyCritical'),
        high: this.t('urgencyHigh'),
        medium: this.t('urgencyMedium'),
        low: this.t('urgencyLow'),
      };
    },
  };
})();
