// ui.js

const ui = {
    state: {
        currentView: 'dashboard',
        data: {
            today: [],
            range: [],
            category: [],
            item: []
        },
        pagination: {
            today: { page: 1, limit: 10 },
            range: { page: 1, limit: 10 },
            category: { page: 1, limit: 10 },
            item: { page: 1, limit: 10 }
        },
        search: {
            today: '',
            range: '',
            category: '',
            item: ''
        }
    },

    init() {
        this.setupNavigation();
        this.setupSidebarToggle();
        this.updateDateDisplay();
        this.setupSearchInputs();
    },

    updateDateDisplay() {
        const opts = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-US', opts);
    },

    setupNavigation() {
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                if (view) this.navigateTo(view);
            });
        });
    },

    setupSidebarToggle() {
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('sidebar');
        const closeMobileBtn = document.getElementById('closeSidebarMobile');
        
        // Desktop Toggle
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth >= 768) {
                sidebar.classList.toggle('collapsed');
            } else {
                sidebar.classList.toggle('-translate-x-full');
            }
        });

        // Mobile Close
        closeMobileBtn.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
        });
    },

    navigateTo(viewId) {
        // Update state
        this.state.currentView = viewId;

        // Update nav active states
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-view') === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Hide all views, show targeted
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('active');
        });

        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('active');
        }

        // Update titles
        const titles = {
            'dashboard': 'Dashboard Overview',
            'today': 'Orders Today',
            'range': 'Date Range Analysis',
            'category': 'Category Summary',
            'item': 'Item Performance'
        };
        document.getElementById('pageTitle').textContent = titles[viewId] || 'Dashboard';

        // Load data on demand if empty
        if (window.app && typeof window.app.loadViewData === 'function') {
            window.app.loadViewData(viewId);
        }
        
        // Close sidebar on mobile after navigation
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.add('-translate-x-full');
        }
        
        // Reset scroll position to top whenever navigating to a new tab
        const mainContainer = document.getElementById('mainContainer');
        if (mainContainer) {
             mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    },

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    },

    showToast(message, type = 'success') {
        const toastId = 'toast-' + Date.now();
        const toastClass = type === 'success' ? 'toast-success bg-white text-gray-800' : 'toast-error bg-white text-gray-800';
        const icon = type === 'success' ? '<i class="fas fa-check-circle text-green-500"></i>' : '<i class="fas fa-exclamation-circle text-red-500"></i>';
        
        const toastHtml = `
            <div id="${toastId}" class="flex items-center gap-3 px-4 py-3 shadow-lg rounded-lg ${toastClass} transform transition-all duration-300 translate-y-2 opacity-0 mb-3 border border-gray-100">
                ${icon}
                <span class="text-sm font-medium">${message}</span>
            </div>
        `;
        
        // Ensure container exists
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-4 right-4 z-[110] flex flex-col items-end';
            document.body.appendChild(container);
        }
        
        container.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastEl = document.getElementById(toastId);
        // Trigger reflow & animate in
        setTimeout(() => {
            toastEl.classList.remove('translate-y-2', 'opacity-0');
        }, 10);
        
        // Remove after 3s
        setTimeout(() => {
            toastEl.classList.add('opacity-0', 'scale-95');
            setTimeout(() => toastEl.remove(), 300);
        }, 3000);
    },

    // -------------------------------------------------------------
    // Table Rendering & Pagination Helpers
    // -------------------------------------------------------------

    setupSearchInputs() {
        const views = ['today', 'range', 'category', 'item'];
        views.forEach(view => {
            const el = document.getElementById(`search-${view}`);
            if (el) {
                el.addEventListener('input', (e) => {
                    this.state.search[view] = e.target.value.toLowerCase();
                    this.state.pagination[view].page = 1; // reset page on search
                    this.renderTable(view);
                });
            }
        });
    },

    renderTable(view, overrideData = null) {
        let columns = [];
        let rows = [];
        // Support overrideData for dashboard recent orders
        let dataToRender = overrideData || this.state.data[view];
        let searchTerm = this.state.search[view] || '';

        // Filter Data
        if (searchTerm && !overrideData) {
            dataToRender = dataToRender.filter(item => {
                return Object.values(item).some(val => 
                    String(val).toLowerCase().includes(searchTerm)
                );
            });
        }

        // Pagination calculations
        const totalRecords = dataToRender.length;
        let limit = this.state.pagination[view]?.limit || 10;
        let page = this.state.pagination[view]?.page || 1;
        
        // If overrideData is passed (e.g. Dashboard), disable pagination
        if (overrideData) {
            page = 1; limit = dataToRender.length;
        }

        const totalPages = Math.ceil(totalRecords / limit) || 1;
        if (page > totalPages) page = totalPages;
        this.state.pagination[view] = { page, limit };

        const startIdx = (page - 1) * limit;
        const pagedData = dataToRender.slice(startIdx, startIdx + limit);

        // Define generic render function per view
        let tableHtml = `<table class="w-full text-left text-sm text-gray-600 whitespace-nowrap">
                            <thead class="text-xs text-gray-500 uppercase bg-gray-50/50"><tr>`;
        
        switch (view) {
            case 'today':
            case 'range':
            case 'dashboard-recent': 
                columns = ['Order ID', 'Date/Time', 'Item Name', 'Category', 'Qty', 'Price', 'Total'];
                break;
            case 'category':
                columns = ['Category Name', 'Total Amount'];
                break;
            case 'item':
                columns = ['Item Name', 'Category', 'Qty Sold', 'Price', 'Total Revenue'];
                break;
        }

        columns.forEach(col => {
            let alignment = col.toLowerCase().includes('total') || col.toLowerCase().includes('price') || col.toLowerCase().includes('qty') ? 'text-right' : 'text-left';
            tableHtml += `<th class="px-6 py-4 font-semibold ${alignment}">${col}</th>`;
        });
        tableHtml += `</tr></thead><tbody class="divide-y divide-gray-100">`;

        if (pagedData.length === 0) {
            tableHtml += `<tr><td colspan="${columns.length}" class="px-6 py-10 text-center text-gray-400">No data found.</td></tr>`;
        } else {
            pagedData.forEach(row => {
                tableHtml += `<tr class="hover:bg-slate-50 transition-colors">`;
                
                if (view === 'today' || view === 'range' || view === 'dashboard-recent') {
                    // Quick fix for backend shipping local time wrapped in 'GMT' string directly
                    const cleanDateString = (row.created_on && typeof row.created_on === 'string') 
                                            ? row.created_on.replace(' GMT', '') 
                                            : row.created_on;
                    const dt = new Date(cleanDateString);
                    const formattedDate = !isNaN(dt.getTime()) ? dt.toLocaleString('en-US', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : row.created_on;
                    
                    const priceRaw = parseFloat(row.price || 0);
                    const totalRaw = parseFloat(row.item_total || 0);
                    const qty = priceRaw > 0 ? Math.round(totalRaw / priceRaw) : 1;
                    
                    tableHtml += `
                        <td class="px-6 py-4 font-medium text-brand-600">#${row.orderID || '-'}</td>
                        <td class="px-6 py-4 text-xs">${formattedDate}</td>
                        <td class="px-6 py-4">${row.item_name || '-'}</td>
                        <td class="px-6 py-4"><span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">${row.category_name || '-'}</span></td>
                        <td class="px-6 py-4 text-right font-medium text-gray-600">${qty}</td>
                        <td class="px-6 py-4 text-right">₹${priceRaw.toFixed(2)}</td>
                        <td class="px-6 py-4 text-right font-medium text-gray-800">₹${totalRaw.toFixed(2)}</td>
                    `;
                } else if (view === 'category') {
                    tableHtml += `
                        <td class="px-6 py-4 font-medium"><span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">${row.category_name || '-'}</span></td>
                        <td class="px-6 py-4 text-right font-medium text-gray-800">₹${parseFloat(row.total_amount || 0).toFixed(2)}</td>
                    `;
                } else if (view === 'item') {
                    tableHtml += `
                        <td class="px-6 py-4 font-medium text-gray-800">${row.item_name || '-'}</td>
                        <td class="px-6 py-4"><span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">${row.category_name || '-'}</span></td>
                        <td class="px-6 py-4 text-right">${row.quantity_sold || 0}</td>
                        <td class="px-6 py-4 text-right">₹${parseFloat(row.total_price || 0).toFixed(2)}</td>
                        <td class="px-6 py-4 text-right font-medium text-brand-600">₹${parseFloat(row.total_amount || 0).toFixed(2)}</td>
                    `;
                }

                tableHtml += `</tr>`;
            });
        }
        tableHtml += `</tbody></table>`;

        // Inject Table
        let containerId = view === 'dashboard-recent' ? 'dashboard-recent-orders' : `table-container-${view}`;
        let container = document.getElementById(containerId);
        
        if (view === 'dashboard-recent' && container) {
            // For dashboard, we only replace inner tbody part if container is tbody. 
            // Our containerId on HTML is a TBODY. Let's extract just the trs from tableHtml.
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = tableHtml;
            const tbody = tempDiv.querySelector('tbody');
            if (tbody) {
                container.innerHTML = tbody.innerHTML;
            }
        } else if (container) {
            container.innerHTML = tableHtml;
            this.renderPagination(view, totalRecords);
        }
    },

    renderPagination(view, totalRecords) {
        if (view === 'dashboard-recent') return;
        
        const pageEl = document.getElementById(`pagination-${view}`);
        if (!pageEl) return;

        const limit = this.state.pagination[view].limit;
        const currentPage = this.state.pagination[view].page;
        const totalPages = Math.ceil(totalRecords / limit) || 1;
        const startText = totalRecords === 0 ? 0 : ((currentPage - 1) * limit) + 1;
        const endText = Math.min(currentPage * limit, totalRecords);

        let html = `
            <span class="text-xs text-gray-500">Showing <span class="font-semibold text-gray-800">${startText}</span> to <span class="font-semibold text-gray-800">${endText}</span> of <span class="font-semibold text-gray-800">${totalRecords}</span> entries</span>
            <div class="flex items-center gap-1">
                <button onclick="ui.changePage('${view}', -1)" class="px-3 py-1.5 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
                <div class="px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 rounded">${currentPage}</div>
                <button onclick="ui.changePage('${view}', 1)" class="px-3 py-1.5 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;
        pageEl.innerHTML = html;
        pageEl.classList.remove('hidden');
    },

    changePage(view, dir) {
        const totalRecs = this.state.search[view] ? 
            this.state.data[view].filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(this.state.search[view]))).length : 
            this.state.data[view].length;
            
        const totalPages = Math.ceil(totalRecs / this.state.pagination[view].limit) || 1;
        const newPage = this.state.pagination[view].page + dir;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.state.pagination[view].page = newPage;
            this.renderTable(view);
        }
    },

    exportToCsv(view) {
        const data = this.state.data[view];
        if (!data || data.length === 0) {
            this.showToast('No data available to export', 'error');
            return;
        }

        // Get headers
        const headers = Object.keys(data[0]);
        let csvContent = headers.join(',') + '\n';

        csvContent += data.map(row => {
            return headers.map(header => {
                let cell = row[header] === null || row[header] === undefined ? '' : row[header];
                cell = String(cell).replace(/"/g, '""');
                // wrap in quotes if there's a comma or newline
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `export_${view}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast(`${view} data exported successfully!`);
    }
};
