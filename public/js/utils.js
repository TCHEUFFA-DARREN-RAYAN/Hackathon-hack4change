// CommonGround — shared UI utilities

// ---- Toast notifications (disabled — no pop-ups in system) ----
window.toast = function () { /* no-op */ };

// ---- Badge helpers ----
window.urgencyBadge = function (urgency) {
    return `<span class="badge badge-${urgency}">${urgency}</span>`;
};

window.statusBadge = function (status) {
    return `<span class="badge badge-${status}">${status}</span>`;
};

window.categoryBadge = function (cat) {
    const labels = {
        shelter_housing:  'Shelter & Housing',
        food_nutrition:   'Food & Nutrition',
        goods_essentials: 'Goods & Essentials',
        mental_health:    'Mental Health',
        outreach:         'Outreach'
    };
    return `<span class="badge badge-${cat}">${labels[cat] || cat}</span>`;
};

// ---- Time helpers ----
window.timeAgo = function (dateStr) {
    if (!dateStr) return 'never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString('en-CA');
};

window.formatDate = function (dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ---- Auth guard ----
window.requireAuth = async function (role) {
    try {
        const res = await auth.me();
        if (role === 'coordinator' && !res.data.isAdmin) {
            window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
            return null;
        }
        if (role === 'staff' && res.data.role !== 'staff' && !res.data.isAdmin) {
            window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
            return null;
        }
        return res.data;
    } catch {
        window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
        return null;
    }
};

// ---- Active nav link ----
window.setActiveNav = function () {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-links a, .portal-sidebar a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && (path === href || (href !== '/' && path.startsWith(href)))) {
            a.classList.add('active');
        }
    });
};

// ---- Skeleton rows ----
window.skeletonRows = function (count, cols) {
    return Array.from({ length: count }, () =>
        `<tr>${Array.from({ length: cols }, () =>
            `<td><div class="skeleton skeleton-text" style="width:${60 + Math.random() * 30}%"></div></td>`
        ).join('')}</tr>`
    ).join('');
};

// ---- Escape HTML ----
window.escHtml = function (str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

// ---- Form field validation helper ----
window.validateField = function (inputEl, message) {
    const errEl = inputEl.parentElement.querySelector('.form-error');
    if (!inputEl.value.trim()) {
        inputEl.classList.add('error');
        if (errEl) { errEl.textContent = message; errEl.classList.add('visible'); }
        return false;
    }
    inputEl.classList.remove('error');
    if (errEl) errEl.classList.remove('visible');
    return true;
};
