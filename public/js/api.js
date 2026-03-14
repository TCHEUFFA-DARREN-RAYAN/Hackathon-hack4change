// CommonGround — API client
const API_BASE = '/api';

async function api(path, options = {}) {
    const res = await fetch(API_BASE + path, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
    return data;
}

const auth = {
    me:     ()              => api('/auth/me'),
    login:  (email, password, role) => api('/auth/login',  { method: 'POST', body: JSON.stringify({ email, password, role }) }),
    logout: ()              => api('/auth/logout', { method: 'POST' }),
    refresh: ()             => api('/auth/refresh', { method: 'POST' })
};

const pub = {
    orgsWithNeeds: ()       => api('/public/orgs-with-needs'),
    needs:  (params = {})   => api('/public/needs?' + new URLSearchParams(params)),
    organizations: ()       => api('/public/organizations'),
    submitDonation: (data)  => api('/public/donations', { method: 'POST', body: JSON.stringify(data) }),
    applyMatch: (id, orgId, reasoning) =>
        api(`/public/donations/${id}/match`, { method: 'PATCH', body: JSON.stringify({ org_id: orgId, reasoning }) })
};

const staff = {
    org:                  ()        => api('/staff/org'),
    inventory:            ()        => api('/staff/inventory'),
    addInventory:         (data)    => api('/staff/inventory',      { method: 'POST',  body: JSON.stringify(data) }),
    updateInventory:      (id, data)=> api(`/staff/inventory/${id}`,{ method: 'PATCH', body: JSON.stringify(data) }),
    deleteInventory:      (id)      => api(`/staff/inventory/${id}`,{ method: 'DELETE' }),
    needs:                ()        => api('/staff/needs'),
    addNeed:              (data)    => api('/staff/needs',          { method: 'POST',  body: JSON.stringify(data) }),
    updateNeed:           (id, data)=> api(`/staff/needs/${id}`,    { method: 'PATCH', body: JSON.stringify(data) }),
    fulfillNeed:          (id)      => api(`/staff/needs/${id}/fulfill`, { method: 'POST' }),
    deleteNeed:           (id)      => api(`/staff/needs/${id}`,    { method: 'DELETE' }),
    donations:            ()        => api('/staff/donations'),
    confirmDonation:      (id)      => api(`/staff/donations/${id}/confirm`, { method: 'POST' })
};

const coordinator = {
    overview:             ()        => api('/coordinator/overview'),
    orgs:                 ()        => api('/coordinator/orgs'),
    needs:                (params)  => api('/coordinator/needs?' + new URLSearchParams(params || {})),
    donations:            (params)  => api('/coordinator/donations?' + new URLSearchParams(params || {})),
    updateDonationStatus: (id, status) => api(`/coordinator/donations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    surplus:              ()        => api('/coordinator/surplus'),
    exportNeeds:          ()        => window.open('/api/coordinator/export/needs'),
    exportInventory:      ()        => window.open('/api/coordinator/export/inventory')
};

const aiApi = {
    matchDonation:   (data)  => api('/ai/match-donation',    { method: 'POST', body: JSON.stringify(data) }),
    networkInsights: ()      => api('/ai/network-insights',  { method: 'POST' })
};
