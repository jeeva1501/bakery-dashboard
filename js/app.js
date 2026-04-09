// app.js

const app = {
    // Keep track of what we have loaded to avoid redundant fetches unless forced
    loadedViews: {},

    async init() {
        // Expose ui logic
        window.ui = ui;
        
        // Initialize UI (listeners, nav, etc)
        ui.init();

        // Bind range fetch button
        document.getElementById('btn-fetch-range').addEventListener('click', () => {
             this.fetchRangeData();
        });

        // Load dashboard by default
        await this.loadDashboardData();

        // Start background poller every 5 seconds per user request
        setInterval(() => {
            if (!document.hidden) {
                this.loadViewData(ui.state.currentView, true);
            }
        }, 5000);
    },

    async loadViewData(viewId, force = false) {
        // If data is already loaded for this view, just re-render/re-chart
        if (!force && this.loadedViews[viewId]) {
            if (viewId === 'category' && dashboardCharts.categoryPieInstance) {
                // Resize trick for Chart.js inside hidden divs
                dashboardCharts.categoryPieInstance.resize();
            }
            return;
        }

        switch (viewId) {
            case 'today':
                await this.loadTodayData();
                break;
            case 'category':
                await this.loadCategoryData();
                break;
            case 'item':
                await this.loadItemData();
                break;
            case 'range':
                // Do not fetch immediately, let the user pick dates.
                break;
            case 'dashboard':
                await this.loadDashboardData();
                break;
        }
    },

    async refreshAllData() {
        this.loadedViews = {}; // clear cache
        await this.loadViewData(ui.state.currentView, true);
        ui.showToast('Data refreshed successfully');
    },

    async loadDashboardData() {
        try {
            // Fetch parallel
            const [todayRes, categoryRes] = await Promise.all([
                apiService.getTodayOrders(),
                apiService.getCategorySummary()
            ]);

            // 1. Update KPI Cards
            if (todayRes && todayRes.orders) {
                // Today records
                document.getElementById('kp-today-records').textContent = todayRes.total_records || todayRes.orders.length;
                
                // Today revenue
                const todayRevenue = todayRes.orders.reduce((sum, item) => sum + (parseFloat(item.item_total) || 0), 0);
                document.getElementById('kp-today-revenue').textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(todayRevenue);
                
                // Calculate Top Selling Item by Revenue (Price-wise)
                const itemStats = {};
                todayRes.orders.forEach(order => {
                    const price = parseFloat(order.price) || 0;
                    const total = parseFloat(order.item_total) || 0;
                    let qty = price > 0 ? Math.round(total / price) : 1;
                    
                    const name = order.item_name || 'Unknown';
                    if (!itemStats[name]) itemStats[name] = { qty: 0, revenue: 0 };
                    itemStats[name].qty += qty;
                    itemStats[name].revenue += total;
                });
                
                const sortedItems = Object.entries(itemStats).sort((a,b) => b[1].revenue - a[1].revenue);
                if (sortedItems.length > 0) {
                    const topItem = sortedItems[0];
                    const revenueStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(topItem[1].revenue);
                    document.getElementById('kp-top-item').textContent = `${topItem[0]} (${topItem[1].qty} Qty, ${revenueStr})`;
                } else {
                    document.getElementById('kp-top-item').textContent = "N/A";
                }

                // Store in state & render recent preview
                ui.state.data['dashboard-recent'] = todayRes.orders;
                ui.renderTable('dashboard-recent', todayRes.orders.slice(0, 5));
                
                // Also cache 'today' view and render it so it's not empty
                ui.state.data['today'] = todayRes.orders;
                ui.renderTable('today');
                this.loadedViews['today'] = true;
            }


            // 3. Category Summary -> Pie Chart & Top Category Card
            if (categoryRes && categoryRes.categories) {
                const sorted = categoryRes.categories.sort((a,b) => b.total_amount - a.total_amount);
                
                // Render Chart
                const labels = sorted.map(c => c.category_name);
                const data = sorted.map(c => c.total_amount);
                dashboardCharts.initPieChart('pieChart', labels, data, 'pieChartInstance');
                
                // Also cache 'category' view and render
                ui.state.data['category'] = categoryRes.categories;
                ui.renderTable('category');
                
                const labelsAll = sorted.map(c => c.category_name);
                const dataAll = sorted.map(c => c.total_amount);
                dashboardCharts.initPieChart('categoryViewPieChart', labelsAll, dataAll, 'categoryPieInstance');

                this.loadedViews['category'] = true;
            }

            this.loadedViews['dashboard'] = true;
            
        } catch (error) {
            console.error("Dashboard Load Error:", error);
            // Silently swallow network errors per user request, keep loader spinning if necessary
        }
    },

    async loadTodayData() {
        const res = await apiService.getTodayOrders();
        if (res && res.orders) {
            ui.state.data['today'] = res.orders;
            ui.renderTable('today');
            this.loadedViews['today'] = true;
        }
    },

    async loadCategoryData() {
        const res = await apiService.getCategorySummary();
        if (res && res.categories) {
            ui.state.data['category'] = res.categories;
            ui.renderTable('category');
            
            // Build main view pie chart if it wasn't built in dashboard load
            if (document.getElementById('categoryViewPieChart')) {
                const sorted = res.categories.sort((a,b) => b.total_amount - a.total_amount);
                const labels = sorted.map(c => c.category_name);
                const data = sorted.map(c => c.total_amount);
                dashboardCharts.initPieChart('categoryViewPieChart', labels, data, 'categoryPieInstance');
            }
            
            this.loadedViews['category'] = true;
        }
    },

    async loadItemData() {
        const res = await apiService.getItemSummary();
        if (res && res.items) {
            ui.state.data['item'] = res.items;
            ui.renderTable('item');
            this.loadedViews['item'] = true;
        }
    },

    async fetchRangeData() {
        const fromValRaw = document.getElementById('range-from').value;
        const toValRaw = document.getElementById('range-to').value;
        
        if (!fromValRaw || !toValRaw) {
            ui.showToast('Please enter both From and To dates.', 'error');
            return;
        }

        // Convert YYYY-MM-DD to DD.MM.YYYY
        const [fYear, fMonth, fDay] = fromValRaw.split('-');
        const fromVal = `${fDay}.${fMonth}.${fYear}`;
        
        const [tYear, tMonth, tDay] = toValRaw.split('-');
        const toVal = `${tDay}.${tMonth}.${tYear}`;

        const res = await apiService.getRangeOrders(fromVal, toVal);
        if (res && res.orders) {
            ui.state.data['range'] = res.orders;
            ui.renderTable('range');
            ui.showToast(`Fetched ${res.orders.length} orders for the selected range.`);
            this.loadedViews['range'] = true;
        } else {
             // ensure empty list rendering on failure or zero
            ui.state.data['range'] = [];
            ui.renderTable('range');
        }
    }
};

// Bootstrap application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
