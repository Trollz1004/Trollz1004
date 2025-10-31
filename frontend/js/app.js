// YouAndINotAI - Frontend JavaScript
const API_URL = window.location.origin + '/api';
let authToken = localStorage.getItem('authToken');

// Modal functions
function openModal(type) {
    document.getElementById(`${type}-modal`).classList.add('active');
}

function closeModal(type) {
    document.getElementById(`${type}-modal`).classList.remove('active');
}

// API Helper
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        alert(error.message);
        throw error;
    }
}

// Signup
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const firstName = document.getElementById('signup-firstname').value;

    try {
        const data = await apiRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, firstName })
        });

        authToken = data.token;
        localStorage.setItem('authToken', authToken);

        alert('Account created successfully!');
        closeModal('signup');
        window.location.href = '/dashboard.html';
    } catch (error) {
        // Error already handled in apiRequest
    }
});

// Login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        authToken = data.token;
        localStorage.setItem('authToken', authToken);

        alert('Login successful!');
        closeModal('login');
        window.location.href = '/dashboard.html';
    } catch (error) {
        // Error already handled in apiRequest
    }
});

// Select plan
function selectPlan(planName) {
    if (!authToken) {
        alert('Please sign up or login first');
        openModal('signup');
        return;
    }

    // Redirect to payment page (to be implemented)
    alert(`Selected ${planName} plan. Payment integration coming soon!`);
}

// Check if user is already logged in
if (authToken && window.location.pathname === '/') {
    // Verify token is still valid
    apiRequest('/users/profile')
        .then(() => {
            // Token is valid, could redirect to dashboard
        })
        .catch(() => {
            // Token is invalid, clear it
            localStorage.removeItem('authToken');
            authToken = null;
        });
}
