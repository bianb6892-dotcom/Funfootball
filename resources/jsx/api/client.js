import axios from 'axios';

const client = axios.create({
    baseURL: '/api',
    headers: { Accept: 'application/json' },
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('ff_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
            localStorage.removeItem('ff_token');
            localStorage.removeItem('ff_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export const api = {
    // auth
    login: (data) => client.post('/login', data),
    register: (data) => client.post('/register', data),
    logout: () => client.post('/logout'),
    me: () => client.get('/me'),
    // players / roster
    players: (params) => client.get('/players', { params }),
    player: (id) => client.get(`/players/${id}`),
    compare: (ids) => client.get('/players/compare', { params: { ids } }),
    // gacha & collection
    packs: () => client.get('/gacha/packs'),
    draw: (slug, count = 1) => client.post(`/gacha/${slug}/draw`, { count }),
    gachaHistory: () => client.get('/gacha/history'),
    collection: (params) => client.get('/collection', { params }),
    // lineup
    lineup: () => client.get('/lineup'),
    saveLineup: (data) => client.put('/lineup', data),
    // match
    opponents: (page) => client.get('/users/opponents', { params: { page } }),
    challenge: (opponent_id) => client.post('/matches/challenge', { opponent_id }),
    matches: (page) => client.get('/matches', { params: { page } }),
    // fun match (tim CPU upload-an admin + level kesulitan)
    funTeams: () => client.get('/fun-teams'),
    funTeamPlay: (id, difficulty) => client.post(`/fun-teams/${id}/play`, { difficulty }),
    // mail (kotak surat hadiah)
    mails: (page) => client.get('/mails', { params: { page } }),
    mailsUnread: () => client.get('/mails/unread-count'),
    mailRead: (id) => client.post(`/mails/${id}/read`),
    mailUnread: (id) => client.post(`/mails/${id}/unread`),
    mailReadAll: () => client.post('/mails/read-all'),
    mailClaim: (id) => client.post(`/mails/${id}/claim`),
    mailClaimAll: () => client.post('/mails/claim-all'),
    // event (tantangan XI admin + rules + hadiah)
    events: (params) => client.get('/events', { params }),
    eventDetail: (id) => client.get(`/events/${id}`),
    eventChallenge: (id) => client.post(`/events/${id}/challenge`),
    eventMyAttempts: (page) => client.get('/events/my-attempts', { params: { page } }),
    // token event + klaim harian
    dailyStatus: () => client.get('/daily/status'),
    dailyClaim: () => client.post('/daily/claim'),
    // admin
    adminDashboard: () => client.get('/admin/dashboard'),
    adminPacks: () => client.get('/gacha/packs', { params: { all: 1 } }),
    // multipart: JANGAN set Content-Type manual — browser mengisi boundary otomatis.
    // Jika di-set manual tanpa boundary, PHP tidak bisa parse body (422 + foto hilang).
    adminPlayersStore: (formData) => client.post('/admin/players', formData),
    adminPlayersUpdate: (id, formData) => client.post(`/admin/players/${id}`, formData),
    adminPlayersDelete: (id) => client.delete(`/admin/players/${id}`),
    adminUsers: (params) => client.get('/admin/users', { params }),
    adminUserDetail: (id) => client.get(`/admin/users/${id}`),
    adminAdjustCoins: (id, data) => client.post(`/admin/users/${id}/coins`, data),
    adminAdjustTokens: (id, data) => client.post(`/admin/users/${id}/tokens`, data),
    adminToggleUser: (id) => client.post(`/admin/users/${id}/toggle`),
    adminMatches: () => client.get('/admin/matches'),
    adminUpdatePack: (id, data) => client.put(`/admin/gacha/packs/${id}`, data),
    adminStorePack: (formData) => client.post('/admin/gacha/packs', formData),
    adminSavePack: (id, formData) => client.post(`/admin/gacha/packs/${id}`, formData),
    adminDeletePack: (id) => client.delete(`/admin/gacha/packs/${id}`),
    adminTogglePool: (id) => client.post(`/admin/players/${id}/toggle-pool`),
    adminToggleVisibility: (id) => client.post(`/admin/players/${id}/toggle-visibility`),
    adminTogglePotw: (id) => client.post(`/admin/players/${id}/toggle-potw`),
    adminMails: (params) => client.get('/admin/mails', { params }),
    adminSendMail: (data) => client.post('/admin/mails', data),
    adminDeleteMail: (id) => client.delete(`/admin/mails/${id}`),
    adminEvents: (params) => client.get('/admin/events', { params }),
    adminEventDetail: (id) => client.get(`/admin/events/${id}`),
    adminStoreEvent: (data) => client.post('/admin/events', data),
    adminUpdateEvent: (id, data) => client.put(`/admin/events/${id}`, data),
    adminToggleEventActive: (id) => client.post(`/admin/events/${id}/toggle-active`),
    adminDeleteEvent: (id) => client.delete(`/admin/events/${id}`),
    adminFunTeams: () => client.get('/admin/fun-teams'),
    adminStoreFunTeam: (data) => client.post('/admin/fun-teams', data),
    adminUpdateFunTeam: (id, data) => client.put(`/admin/fun-teams/${id}`, data),
    adminDeleteFunTeam: (id) => client.delete(`/admin/fun-teams/${id}`),
    adminToggleFunTeam: (id) => client.post(`/admin/fun-teams/${id}/toggle-active`),
    adminAssignFunTeam: (id, data) => client.post(`/admin/fun-teams/${id}/assign-category`, data),
    adminFunCategories: () => client.get('/admin/fun-categories'),
    adminStoreFunCategory: (data) => client.post('/admin/fun-categories', data),
    adminUpdateFunCategory: (id, data) => client.put(`/admin/fun-categories/${id}`, data),
    adminDeleteFunCategory: (id) => client.delete(`/admin/fun-categories/${id}`),
    adminToggleFunCategory: (id) => client.post(`/admin/fun-categories/${id}/toggle-active`),
    adminStoreFunLeague: (data) => client.post('/admin/fun-leagues', data),
    adminUpdateFunLeague: (id, data) => client.put(`/admin/fun-leagues/${id}`, data),
    adminDeleteFunLeague: (id) => client.delete(`/admin/fun-leagues/${id}`),
    adminToggleFunLeague: (id) => client.post(`/admin/fun-leagues/${id}/toggle-active`),
};

export default client;
