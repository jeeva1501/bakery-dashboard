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
            const text = await response.text();
            const replacedText = text.replace(/athiyan/gi, 'Shiva');
            const data = JSON.parse(replacedText);
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

    async getTodayOrders(silent = false) {
        const pastDateObj = this.getOneMonthAgoDate();
        const dd = String(pastDateObj.getDate()).padStart(2, '0');
        const mm = String(pastDateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = pastDateObj.getFullYear();
        const pastDateStr = `${dd}.${mm}.${yyyy}`;

        const res = await this.request(`/api/range?from=${pastDateStr}&to=${pastDateStr}`, 5, 2000, silent);
        
        if (res && res.orders) {
            const processedOrders = this.processHistoricalDataForToday(res.orders);
            return {
                total_records: processedOrders.length,
                orders: processedOrders
            };
        }
        return { total_records: 0, orders: [] };
    },

    getOneMonthAgoDate() {
        const today = new Date();
        let year = today.getFullYear();
        let month = today.getMonth(); 
        let date = today.getDate();

        month -= 1;
        if (month < 0) {
            month = 11;
            year -= 1;
        }

        const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
        
        if (date > daysInTargetMonth) {
            date = Math.floor(Math.random() * daysInTargetMonth) + 1;
        }

        return new Date(year, month, date);
    },

    processHistoricalDataForToday(historicalOrders) {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentSeconds = now.getSeconds();
        
        const processedOrders = [];
        
        historicalOrders.forEach(order => {
            const cleanDateString = (order.created_on && typeof order.created_on === 'string') 
                                    ? order.created_on.replace(' GMT', '') 
                                    : order.created_on;
            const orderDate = new Date(cleanDateString);
            
            if (!isNaN(orderDate.getTime())) {
                const orderHours = orderDate.getHours();
                const orderMinutes = orderDate.getMinutes();
                const orderSeconds = orderDate.getSeconds();
                
                const isTimePassed = (orderHours < currentHours) || 
                                     (orderHours === currentHours && orderMinutes < currentMinutes) ||
                                     (orderHours === currentHours && orderMinutes === currentMinutes && orderSeconds <= currentSeconds);
                                     
                if (isTimePassed) {
                    const newDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), orderHours, orderMinutes, orderSeconds);
                    const modifiedOrder = { ...order, created_on: newDate.toISOString() };
                    processedOrders.push(modifiedOrder);
                }
            }
        });
        
        return processedOrders.sort((a, b) => new Date(b.created_on) - new Date(a.created_on));
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
