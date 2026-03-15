// CommonGround — shared UI utilities

// ---- Toast notifications ----
window.toast = function (message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        Object.assign(container.style, {
            position: 'fixed', bottom: '1.5rem', right: '1.5rem',
            zIndex: '9999', display: 'flex', flexDirection: 'column',
            gap: '.5rem', pointerEvents: 'none', maxWidth: '380px'
        });
        document.body.appendChild(container);
    }
    const icons = { success: '\u2713', error: '\u2717', info: '\u2139', warning: '\u26A0' };
    const bg = { success: '#059669', error: '#dc2626', info: '#2563eb', warning: '#d97706' };
    const el = document.createElement('div');
    Object.assign(el.style, {
        background: bg[type] || bg.info, color: '#fff', padding: '.75rem 1.15rem',
        borderRadius: '10px', fontSize: '.92rem', fontWeight: '500',
        boxShadow: '0 4px 16px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center',
        gap: '.6rem', pointerEvents: 'auto', opacity: '0',
        transform: 'translateY(12px)', transition: 'all .25s ease'
    });
    el.innerHTML = `<span style="font-size:1.1rem">${icons[type] || icons.info}</span><span>${window.escHtml(message)}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        el.style.opacity = '0'; el.style.transform = 'translateY(12px)';
        setTimeout(() => el.remove(), 300);
    }, duration);
};

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
