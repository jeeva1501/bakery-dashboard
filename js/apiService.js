// apiService.js

const apiService = {
    // Show/hide loader via UI (we'll inject ui dependency or dispatch event, but for simplicity call ui directly)
    async request(endpoint, retries = 5, delay = 2000, silent = false) {
        if(!silent && window.ui) ui.showLoading();
        try {
            const response = await fetch(`${CONFIG.BASE_URL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Request Failed:", error);
            if (retries > 0) {
                console.warn(`Retrying... (${retries} attempts left)`);
                await new Promise(res => setTimeout(res, delay));
                return this.request(endpoint, retries - 1, delay * 1.5, silent);
            }
            // Fail silently after all retries to avoid annoying toasts
            return null;
        } finally {
            if(!silent && window.ui) ui.hideLoading();
        }
    },

    getTodayOrders(silent = false) {
        return this.request('/api/today', 5, 2000, silent);
    },

    getRangeOrders(from, to, silent = false) {
        return this.request(`/api/range?from=${from}&to=${to}`, 5, 2000, silent);
    },

    getDailyTotal() {
        return this.request('/api/daily-total');
    },

    getCategorySummary(silent = false) {
        return this.request('/api/category-summary', 5, 2000, silent);
    },

    getItemSummary(silent = false) {
        return this.request('/api/item-summary', 5, 2000, silent);
    }
};
