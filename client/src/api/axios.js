import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

// Add auth token to every request
api.interceptors.request.use((config) => {
    if (!config.headers.Authorization) {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle 401 errors — redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthRoute = error.config?.url?.includes('/auth/');
        if (error.response?.status === 401 && !isAuthRoute) {
            if (window.location.pathname.startsWith('/admin')) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin/login';
            } else if (window.location.pathname.startsWith('/hr')) {
                localStorage.removeItem('hrToken');
                localStorage.removeItem('hrUser');
                window.location.href = '/hr/login';
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
