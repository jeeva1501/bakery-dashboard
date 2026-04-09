// charts.js
const dashboardCharts = {
    lineChartInstance: null,
    pieChartInstance: null,
    categoryPieInstance: null,

    initLineChart(canvasId, labels, dataPoints) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.lineChartInstance) {
            this.lineChartInstance.destroy();
        }

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.5)'); // brand-600
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

        this.lineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Revenue',
                    data: dataPoints,
                    borderColor: '#2563eb',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1e293b',
                        padding: 10,
                        titleFont: { family: 'Inter', size: 13 },
                        bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { family: 'Inter', size: 12 }, color: '#64748b' }
                    },
                    y: {
                        grid: { color: '#f1f5f9', drawBorder: false },
                        ticks: {
                            font: { family: 'Inter', size: 12 },
                            color: '#64748b',
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    },

    initPieChart(canvasId, labels, dataPoints, instanceKey = 'pieChartInstance') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this[instanceKey]) {
            this[instanceKey].destroy();
        }

            const colors = [
            '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', 
            '#0ea5e9', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
            '#a855f7', '#64748b', '#d946ef', '#06b6d4', '#eab308',
            '#f43f5e', '#84cc16', '#10b981', '#3b82f6', '#f59e0b',
            '#ec4899', '#8b5cf6', '#14b8a6', '#0ea5e9', '#f97316'
        ];

        this[instanceKey] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataPoints,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Inter', size: 12 },
                            usePointStyle: true,
                            padding: 20,
                            color: '#475569'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 10,
                        titleFont: { family: 'Inter', size: 13 },
                        bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed !== null) {
                                    label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
};
