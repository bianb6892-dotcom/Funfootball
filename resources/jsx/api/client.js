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
    draw: (slug) => client.post(`/gacha/${slug}/draw`),
    gachaHistory: () => client.get('/gacha/history'),
    collection: (params) => client.get('/collection', { params }),
    // lineup
    lineup: () => client.get('/lineup'),
    saveLineup: (data) => client.put('/lineup', data),
    // match
    opponents: (page) => client.get('/users/opponents', { params: { page } }),
    challenge: (opponent_id) => client.post('/matches/challenge', { opponent_id }),
    matches: (page) => client.get('/matches', { params: { page } }),
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
    adminToggleUser: (id) => client.post(`/admin/users/${id}/toggle`),
    adminMatches: () => client.get('/admin/matches'),
    adminUpdatePack: (id, data) => client.put(`/admin/gacha/packs/${id}`, data),
    adminTogglePool: (id) => client.post(`/admin/players/${id}/toggle-pool`),
};

export default client;
