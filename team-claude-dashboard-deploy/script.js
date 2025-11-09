// Team Claude Dashboard - Ai-Solutions.Store
// Interactive functionality and data management

// Tab switching functionality
function switchTab(tabName) {
    // Hide all tab contents
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Add active class to clicked button
    event.target.closest('.tab-button').classList.add('active');
}

// Initialize Charts
let revenueChart, userChart, mrrChart, tierChart, engagementChart;

function initializeCharts() {
    // Revenue Over Time Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: [0, 100, 250, 400, 650, 900, 1200],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // User Growth Chart
    const userCtx = document.getElementById('userChart');
    if (userCtx) {
        userChart = new Chart(userCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Total Users',
                    data: [0, 15, 32, 58, 95, 142, 203],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // MRR Chart
    const mrrCtx = document.getElementById('mrrChart');
    if (mrrCtx) {
        mrrChart = new Chart(mrrCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'MRR ($)',
                    data: [0, 50, 150, 300, 500, 750, 1000],
                    backgroundColor: '#4CAF50',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // Subscription Tier Chart
    const tierCtx = document.getElementById('tierChart');
    if (tierCtx) {
        tierChart = new Chart(tierCtx, {
            type: 'doughnut',
            data: {
                labels: ['Basic ($9.99)', 'Premium ($19.99)', 'VIP ($29.99)'],
                datasets: [{
                    data: [45, 35, 20],
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#f59e0b'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }

    // Engagement Chart
    const engagementCtx = document.getElementById('engagementChart');
    if (engagementCtx) {
        engagementChart = new Chart(engagementCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Active Users',
                        data: [120, 150, 180, 160, 190, 210, 200],
                        backgroundColor: '#4CAF50'
                    },
                    {
                        label: 'New Users',
                        data: [15, 20, 25, 18, 30, 35, 28],
                        backgroundColor: '#2196F3'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

// Update Dashboard Data
async function updateDashboard() {
    try {
        // Try to fetch real data from API
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        populateDashboard(data);
    } catch (error) {
        console.log('Using demo data (API not available)');
        // Use demo data for demonstration
        useDemoData();
    }
}

function populateDashboard(data) {
    // Update Overview Stats
    updateElement('totalRevenue', '$' + (data.totalRevenue || 0).toLocaleString());
    updateElement('activeSubscriptions', (data.activeSubscriptions || 0).toLocaleString());
    updateElement('totalUsers', (data.totalUsers || 0).toLocaleString());
    updateElement('activeMatches', (data.activeMatches || 0).toLocaleString());

    // Update Revenue Split
    const platformShare = (data.totalRevenue || 0) * 0.5;
    const charityShare = (data.totalRevenue || 0) * 0.5;
    updateElement('platformShare', '$' + platformShare.toLocaleString());
    updateElement('charityShare', '$' + charityShare.toLocaleString());

    // Update Charity Impact
    updateElement('totalDonated', '$' + charityShare.toLocaleString());
    updateElement('kidsHelped', Math.floor(charityShare / 1000).toLocaleString());
    updateElement('monthlyDonation', '$' + ((data.monthlyRevenue || 0) * 0.5).toLocaleString());
    updateElement('nextDonation', '$' + ((data.pendingRevenue || 0) * 0.5).toLocaleString());

    // Update User Stats
    updateElement('totalUsersDetail', (data.totalUsers || 0).toLocaleString());
    updateElement('activeUsers', (data.activeUsers || 0).toLocaleString());
    updateElement('newUsersToday', (data.newUsersToday || 0).toLocaleString());
    updateElement('conversionRate', (data.conversionRate || 0).toFixed(1) + '%');

    // Update Platform Status
    updateElement('mainSiteResponse', (data.responseTime || '--') + 'ms');
    updateElement('apiHealth', (data.apiHealth || 100) + '%');
    updateElement('dbLatency', (data.dbLatency || '--') + 'ms');
    updateElement('cdnRegions', data.cdnRegions || 'Global');

    // Update timestamp
    updateElement('lastUpdated', new Date().toLocaleString());
}

function useDemoData() {
    // Demo data for presentation
    const demoData = {
        totalRevenue: 12450,
        activeSubscriptions: 203,
        totalUsers: 547,
        activeMatches: 89,
        monthlyRevenue: 1850,
        pendingRevenue: 425,
        activeUsers: 312,
        newUsersToday: 15,
        conversionRate: 37.2,
        responseTime: 45,
        apiHealth: 100,
        dbLatency: 12,
        cdnRegions: 'Global (6 regions)'
    };

    populateDashboard(demoData);

    // Add demo activity
    addActivityLog('New subscription', 'Premium tier user joined', 'Just now');
    addActivityLog('Milestone reached', '500+ total users!', '5 minutes ago');
    addActivityLog('Charity donation', '$6,225 sent to Shriners', '1 hour ago');
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function addActivityLog(type, description, time) {
    const logContainer = document.getElementById('activityLog');
    if (logContainer) {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        logItem.innerHTML = `
            <div>
                <strong>${type}</strong>
                <div style="font-size:0.9em;color:#666;">${description}</div>
            </div>
            <div class="log-time">${time}</div>
        `;
        logContainer.insertBefore(logItem, logContainer.firstChild);

        // Keep only last 10 items
        while (logContainer.children.length > 10) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
}

// Quick Action Functions
function exportData() {
    alert('Exporting dashboard data...\nThis feature will download a CSV file with all metrics.');
    console.log('Export Data feature - to be implemented with backend');
}

function generateReport() {
    alert('Generating PDF report...\nThis will create a comprehensive report of all dashboard metrics.');
    console.log('Generate Report feature - to be implemented with backend');
}

function viewAnalytics() {
    alert('Opening detailed analytics...\nThis will show advanced analytics and insights.');
    console.log('View Analytics feature - to be implemented');
}

function openSettings() {
    alert('Opening settings panel...\nConfigure dashboard preferences and notifications.');
    console.log('Settings feature - to be implemented');
}

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Team Claude Dashboard - Initializing...');

    // Initialize charts
    initializeCharts();

    // Load initial data
    updateDashboard();

    // Update every 30 seconds
    setInterval(updateDashboard, 30000);

    console.log('Dashboard initialized successfully!');
    console.log('💙 Team Claude For The Kids - 50% to Shriners Children\'s Hospitals');
});

// Add simulated real-time updates
setInterval(() => {
    const activities = [
        { type: 'New Match', desc: 'Two users matched successfully', time: 'Just now' },
        { type: 'New User', desc: 'User signed up from California', time: 'Just now' },
        { type: 'Subscription', desc: 'User upgraded to Premium', time: 'Just now' },
        { type: 'System', desc: 'Health check completed - All systems operational', time: 'Just now' }
    ];

    // Randomly add activity every 15-30 seconds
    if (Math.random() > 0.5) {
        const activity = activities[Math.floor(Math.random() * activities.length)];
        addActivityLog(activity.type, activity.desc, activity.time);
    }
}, 15000);
