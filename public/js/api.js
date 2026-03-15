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
    stats: ()               => api('/public/stats'),
    submitDonation: (data)  => api('/public/donations', { method: 'POST', body: JSON.stringify(data) }),
    applyMatch: (id, orgId, reasoning) =>
        api(`/public/donations/${id}/match`, { method: 'PATCH', body: JSON.stringify({ org_id: orgId, reasoning }) })
};

const staff = {
    org:                  ()        => api('/staff/org'),
    chatThreads:          ()        => api('/staff/chat/threads'),
    chatMessages:        (threadId)=> api(`/staff/chat/threads/${threadId}/messages`),
    sendChatMessage:     (threadId, content) => api(`/staff/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
    startCrossOrgThread: (peerOrgId) => api('/staff/chat/cross-org', { method: 'POST', body: JSON.stringify({ peer_org_id: peerOrgId }) }),
    inventory:            ()        => api('/staff/inventory'),
    addInventory:         (data)    => api('/staff/inventory',      { method: 'POST',  body: JSON.stringify(data) }),
    updateInventory:      (id, data)=> api(`/staff/inventory/${id}`,{ method: 'PATCH', body: JSON.stringify(data) }),
    deleteInventory:      (id)      => api(`/staff/inventory/${id}`,{ method: 'DELETE' }),
    needs:                (params)  => api('/staff/needs?' + new URLSearchParams(params || {})),
    addNeed:              (data)    => api('/staff/needs',          { method: 'POST',  body: JSON.stringify(data) }),
    updateNeed:           (id, data)=> api(`/staff/needs/${id}`,    { method: 'PATCH', body: JSON.stringify(data) }),
    fulfillNeed:          (id)      => api(`/staff/needs/${id}/fulfill`, { method: 'POST' }),
    receiveNeed:          (id, amount) => api(`/staff/needs/${id}/receive`, { method: 'POST', body: JSON.stringify({ amount }) }),
    fulfillOffer:         (data)    => api('/staff/fulfill-offer',   { method: 'POST', body: JSON.stringify(data) }),
    deleteNeed:           (id)      => api(`/staff/needs/${id}`,    { method: 'DELETE' }),
    donations:            (params)  => api('/staff/donations?' + new URLSearchParams(params || {})),
    confirmDonation:      (id)      => api(`/staff/donations/${id}/confirm`, { method: 'POST' }),
    surplus:              ()        => api('/staff/surplus'),
    surplusRequests:      (params)  => api('/staff/surplus-requests?' + new URLSearchParams(params || {})),
    requestSurplus:       (data)    => api('/staff/surplus-requests', { method: 'POST', body: JSON.stringify(data) }),
    transfers:            (params)  => api('/staff/transfers?' + new URLSearchParams(params || {})),
    completeTransfer:     (id)      => api(`/staff/transfers/${id}/complete`, { method: 'POST' }),
    expiring:             (days)    => api('/staff/expiring?' + new URLSearchParams(days ? { days } : {}))
};

const coordinator = {
    overview:             ()        => api('/coordinator/overview'),
    orgs:                 ()        => api('/coordinator/orgs'),
    createOrg:             (data)    => api('/coordinator/orgs', { method: 'POST', body: JSON.stringify(data) }),
    updateOrg:             (id, data)=> api(`/coordinator/orgs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    staff:                (params)  => api('/coordinator/staff?' + new URLSearchParams(params || {})),
    createStaff:          (data)    => api('/coordinator/staff', { method: 'POST', body: JSON.stringify(data) }),
    updateStaff:          (id, data)=> api(`/coordinator/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteStaff:          (id)      => api(`/coordinator/staff/${id}`, { method: 'DELETE' }),
    needs:                (params)  => api('/coordinator/needs?' + new URLSearchParams(params || {})),
    donations:            (params)  => api('/coordinator/donations?' + new URLSearchParams(params || {})),
    updateDonationStatus: (id, status) => api(`/coordinator/donations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    inventory:            (params)  => api('/coordinator/inventory?' + new URLSearchParams(params || {})),
    surplus:              ()        => api('/coordinator/surplus'),
    expiring:             (days)   => api('/coordinator/expiring?' + new URLSearchParams(days ? { days } : {})),
    surplusRequests:      (status)  => api('/coordinator/surplus-requests?' + new URLSearchParams(status ? { status } : {})),
    updateSurplusRequest:  (id, status) => api(`/coordinator/surplus-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    transfers:            (params) => api('/coordinator/transfers?' + new URLSearchParams(params || {})),
    createTransfer:       (data)   => api('/coordinator/transfers', { method: 'POST', body: JSON.stringify(data) }),
    updateTransferStatus: (id, status) => api(`/coordinator/transfers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    analytics:             (params)  => api('/coordinator/analytics?' + new URLSearchParams(params || {})),
    exportNeeds:           (params)  => window.open('/api/coordinator/export/needs?' + new URLSearchParams(params || {})),
    exportInventory:       (params)  => window.open('/api/coordinator/export/inventory?' + new URLSearchParams(params || {})),
    exportDonations:       (params)  => window.open('/api/coordinator/export/donations?' + new URLSearchParams(params || {})),
    exportOrganizations:   ()        => window.open('/api/coordinator/export/organizations'),
    exportStaff:           (params)  => window.open('/api/coordinator/export/staff?' + new URLSearchParams(params || {})),
    exportSurplusRequests: (params)  => window.open('/api/coordinator/export/surplus-requests?' + new URLSearchParams(params || {})),
    exportTransfers:       (params)  => window.open('/api/coordinator/export/transfers?' + new URLSearchParams(params || {})),
    exportMeetingReport:   (params)  => window.open('/api/coordinator/export/meeting-report?' + new URLSearchParams(params || {})),
    chatThreads:          ()        => api('/coordinator/chat/threads'),
    chatMessages:         (threadId)=> api(`/coordinator/chat/threads/${threadId}/messages`),
    createDirectThread:   (staffId) => api('/coordinator/chat/threads', { method: 'POST', body: JSON.stringify({ staff_id: staffId }) }),
    sendChatMessage:      (threadId, content) => api(`/coordinator/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ content }) })
};

const aiApi = {
    matchDonation:   (data)  => api('/ai/match-donation',    { method: 'POST', body: JSON.stringify(data) }),
    networkInsights: ()      => api('/ai/network-insights',  { method: 'POST' })
};
