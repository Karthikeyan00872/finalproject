// common.js - Core functionalities shared across all pages

// --- Global DOM Elements ---
const modal = document.getElementById('loginModal');
const loginFormContainer = document.getElementById('login-form-container');

// --- Global Variable for Logged-in User ---
let currentUsername = localStorage.getItem('currentUsername') || null; 

const BACKEND_URL = 'http://localhost:5000'; // Define the backend base URL

console.log('Common.js loaded. Current username:', currentUsername); // Debug log

// --- Utility Functions ---

function showNotification(message) {
    console.log(`[Notification] ${message}`);
    // Optional: You can add a toast notification UI here
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function closeModal() {
    if (modal) {
        modal.style.display = 'none'; 
    }
}

// **Function to update the Login/Username UI**
function updateLoginUI() {
    console.log('Updating login UI. Current user:', currentUsername); // Debug log
    
    // Re-fetch elements inside function to ensure they are available on all pages
    const loginStatusLink = document.getElementById('login-status-link');
    const authDropdownContent = document.getElementById('auth-dropdown-content');

    if (loginStatusLink && authDropdownContent) {
        if (currentUsername) {
            // User is logged in: Show Username
            console.log('Setting UI to logged in state for:', currentUsername);
            loginStatusLink.innerHTML = `<i class="fas fa-user-circle"></i> ${currentUsername}`;
            authDropdownContent.innerHTML = `
                <a href="#" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</a>
            `;
        } else {
            // User is logged out: Show Login options
            console.log('Setting UI to logged out state');
            loginStatusLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            authDropdownContent.innerHTML = `
                <a href="#" onclick="showLogin('student')"><i class="fas fa-user-graduate"></i> Student Login</a>
                <a href="#" onclick="showLogin('tutor')"><i class="fas fa-chalkboard-teacher"></i> Tutor Login</a>
                <a href="#" onclick="showLogin('admin')"><i class="fas fa-user-shield"></i> Admin Login</a>
                <a href="#" onclick="showRegistration()"><i class="fas fa-user-plus"></i> Register</a>
            `;
        }
    } else {
        console.log('Login UI elements not found on this page');
    }
}

// **Utility function to trigger file download**
function downloadFile(filename, content) {
    if (!currentUsername) {
        alert("Please log in to download files.");
        showLogin('student');
        return;
    }
    
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
window.downloadFile = downloadFile;

// --- Authentication Handlers ---

function getLoginForm(userType) {
    const action = userType === 'register' ? 'Register' : 'Login';
    const endpoint = userType === 'register' ? '/register' : '/login';
    const formHtml = `
        <span class="close-btn" onclick="closeModal()">&times;</span>
        <h2>${action} ${userType !== 'register' ? 'as ' + userType.charAt(0).toUpperCase() + userType.slice(1) : ''}</h2>
        <form onsubmit="event.preventDefault(); handleAuth(event, '${endpoint}', '${userType}')">
            ${userType !== 'register' ? `<input type="hidden" name="userType" value="${userType}">` : ''}
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required placeholder="Enter username">
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required placeholder="Enter password">
            </div>
            ${userType === 'register' ? `
                <div class="form-group">
                    <label for="reg-usertype">I am a:</label>
                    <select id="reg-usertype" name="userType" required>
                        <option value="">Select user type</option>
                        <option value="student">Student</option>
                        <option value="tutor">Tutor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            ` : ''}
            <button type="submit" class="cta-button login-btn">
                <i class="fas ${userType === 'register' ? 'fa-user-plus' : 'fa-sign-in-alt'}"></i> ${action}
            </button>
            ${userType !== 'register' ? `
                <p style="margin-top: 15px; text-align: center; font-size: 14px;">
                    Don't have an account? <a href="#" onclick="showRegistration()" style="color: #4CAF50;">Register here</a>
                </p>
            ` : `
                <p style="margin-top: 15px; text-align: center; font-size: 14px;">
                    Already have an account? <a href="#" onclick="showLogin('student')" style="color: #4CAF50;">Login here</a>
                </p>
            `}
        </form>
    `;
    return formHtml;
}

function showLogin(userType) {
    console.log('Showing login form for:', userType);
    if (loginFormContainer && modal) {
        loginFormContainer.innerHTML = getLoginForm(userType);
        modal.style.display = 'flex';
        // Focus on username field
        setTimeout(() => document.getElementById('username')?.focus(), 100);
    }
}

function showRegistration() {
    console.log('Showing registration form');
    if (loginFormContainer && modal) {
        loginFormContainer.innerHTML = getLoginForm('register');
        modal.style.display = 'flex';
        setTimeout(() => document.getElementById('username')?.focus(), 100);
    }
}

async function handleAuth(event, endpoint, formType) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Validate required fields
    if (!data.username || !data.password) {
        alert('Please fill in all required fields');
        return;
    }

    // For login, the userType is from the hidden field
    if (formType !== 'register') {
        data.userType = form.querySelector('input[name="userType"]').value;
    } else {
        // For registration, get userType from the select box
        data.userType = document.getElementById('reg-usertype').value;
        if (!data.userType) {
            alert('Please select a user type');
            return;
        }
    }
    
    console.log('Sending auth request to:', BACKEND_URL + endpoint);
    console.log('Request data:', { ...data, password: '***' }); // Hide password in logs
    
    try {
        const response = await fetch(BACKEND_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);

        if (result.success) {
            const successMessage = formType === 'register' 
                ? `Registration successful! Welcome ${data.username}!`
                : `Login successful! Welcome back ${result.username}!`;
            
            showNotification(successMessage);
            
            // Set user data on successful login (not on registration)
            if (formType !== 'register') {
                currentUsername = result.username;
                localStorage.setItem('currentUsername', result.username);
                localStorage.setItem('userType', result.userType);
                
                console.log('User logged in:', currentUsername, 'Type:', result.userType);
            }
            
            // Close modal and update UI
            setTimeout(() => { 
                closeModal(); 
                updateLoginUI();
                
                // Reload page to update all components
                setTimeout(() => {
                    if (formType === 'register') {
                        // After registration, show login form
                        showLogin('student');
                    } else {
                        // After login, reload page
                        location.reload();
                    }
                }, 500);
            }, 300);

        } else {
            const errorMessage = result.message || 'Authentication failed';
            alert(`Error: ${errorMessage}`);
            showNotification(`Authentication failed: ${errorMessage}`);
        }

    } catch (error) {
        console.error('Authentication error:', error);
        alert('Could not connect to the server. Please check:\n1. Backend server is running\n2. MongoDB is running\n3. No CORS errors');
        showNotification('Server connection error');
    }
}

function handleLogout() {
    console.log('Logging out user:', currentUsername);
    const username = currentUsername;
    currentUsername = null;
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('userType');
    updateLoginUI();
    showNotification(`Goodbye ${username}! You have been logged out.`);
    
    // Clear chat on index page
    if (window.clearChat) {
        window.clearChat();
    }
    
    // Reload page to reset all states
    setTimeout(() => location.reload(), 1000);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded. Initializing common.js');
    
    // Expose functions globally
    window.showLogin = showLogin;
    window.closeModal = closeModal;
    window.handleAuth = handleAuth;
    window.handleLogout = handleLogout;
    window.showRegistration = showRegistration;
    window.currentUsername = currentUsername;
    window.BACKEND_URL = BACKEND_URL;

    // Initialize the Login UI
    updateLoginUI();
    
    // Check if backend is reachable
    fetch(BACKEND_URL + '/test')
        .then(response => {
            if (response.ok) {
                console.log('Backend server is reachable');
            } else {
                console.warn('Backend server returned error:', response.status);
            }
        })
        .catch(error => {
            console.error('Backend server is not reachable:', error);
            showNotification('Warning: Backend server is not reachable');
        });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Add animation observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.course-card, .feature-card, .question-card').forEach(card => {
        observer.observe(card);
    });
    
    console.log('Common.js initialization complete');
});