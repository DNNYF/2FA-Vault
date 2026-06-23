// API utility functions
const api = {
    async request(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(`/api${endpoint}`, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'API request failed');
            }
            
            return result;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },
    
    // Auth
    checkAuth: () => api.request('/auth/check'),
    register: (username, password) => api.request('/auth/register', 'POST', { username, password }),
    login: (username, password) => api.request('/auth/login', 'POST', { username, password }),
    logout: () => api.request('/auth/logout', 'POST'),
    me: () => api.request('/auth/me'),
    
    // Entries
    getEntries: () => api.request('/entries'),
    addEntry: (data) => api.request('/entries', 'POST', data),
    updateEntry: (id, data) => api.request(`/entries/${id}`, 'PUT', data),
    deleteEntry: (id) => api.request(`/entries/${id}`, 'DELETE'),
    
    // Recycle Bin
    getRecycleBin: () => api.request('/recycle'),
    restoreEntry: (id) => api.request(`/recycle/${id}/restore`, 'POST'),
    permanentDelete: (id) => api.request(`/recycle/${id}`, 'DELETE'),
    emptyRecycleBin: () => api.request('/recycle/empty/all', 'DELETE'),
    
    // Backup
    exportEntries: () => api.request('/export'),
    importEntries: (entries) => api.request('/import', 'POST', { entries })
};
