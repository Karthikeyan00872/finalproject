// [file name]: common.js
// common.js - Core functionalities shared across all pages

// --- Global DOM Elements ---
const modal = document.getElementById('loginModal');
const loginFormContainer = document.getElementById('login-form-container');

// --- Global Variable for Logged-in User ---
let currentUsername = localStorage.getItem('currentUsername') || null; 
let userType = localStorage.getItem('userType') || null; // 添加 userType 变量

const BACKEND_URL = 'http://localhost:5000'; // Define the backend base URL

console.log('Common.js loaded. Current username:', currentUsername, 'User Type:', userType); // Debug log

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

// **Helper functions for login error messages**
function showLoginError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field ? field.closest('.form-group') : null;
    
    if (!formGroup) {
        // If field not found or general error, show at top
        let errorDiv = document.getElementById('login-error-general');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'login-error-general';
            errorDiv.style.cssText = `
                background-color: #ffebee;
                color: #c62828;
                padding: 10px 15px;
                border-radius: 5px;
                margin-bottom: 15px;
                border-left: 4px solid #c62828;
                font-size: 0.9rem;
            `;
            const form = document.querySelector('#login-form-container form');
            if (form) {
                document.querySelector('#login-form-container').insertBefore(errorDiv, form);
            }
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        return;
    }
    
    // Remove existing error for this field
    const existingError = formGroup.querySelector('.login-error');
    if (existingError) existingError.remove();
    
    // Add error styling to input
    field.style.borderColor = '#e74c3c';
    
    // Create and append error message
    const errorSpan = document.createElement('span');
    errorSpan.className = 'login-error';
    errorSpan.style.cssText = `
        display: block;
        color: #e74c3c;
        font-size: 0.85rem;
        margin-top: 5px;
    `;
    errorSpan.textContent = message;
    formGroup.appendChild(errorSpan);
}

function clearLoginErrors() {
    // Clear all error messages
    document.querySelectorAll('.login-error').forEach(el => el.remove());
    
    // Reset input borders
    const loginContainer = document.getElementById('login-form-container');
    if (loginContainer) {
        loginContainer.querySelectorAll('input, select').forEach(input => {
            input.style.borderColor = '';
        });
    }
    
    // Clear general error
    const generalError = document.getElementById('login-error-general');
    if (generalError) {
        generalError.style.display = 'none';
        generalError.textContent = '';
    }
}

// **Function to update the Login/Username UI**
function updateLoginUI() {
    console.log('Updating login UI. Current user:', currentUsername, 'Type:', userType); // Debug log
    
    // Re-fetch elements inside function to ensure they are available on all pages
    const loginStatusLink = document.getElementById('login-status-link');
    const authDropdownContent = document.getElementById('auth-dropdown-content');

    if (loginStatusLink && authDropdownContent) {
        if (currentUsername) {
            // User is logged in: Show Username
            console.log('Setting UI to logged in state for:', currentUsername);
            loginStatusLink.innerHTML = `<i class="fas fa-user-circle"></i> ${currentUsername}`;
            
            if (userType === 'admin') {
                // Admin shows admin-specific options
                authDropdownContent.innerHTML = `
                    <a href="admin.html"><i class="fas fa-user-shield"></i> Admin Dashboard</a>
                    <a href="#" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</a>
                `;
            } else {
                // Regular users show normal logout
                authDropdownContent.innerHTML = `
                    <a href="#" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</a>
                `;
            }
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
            ${userType !== 'register' ? `<input type="hidden" id="userTypeField" name="userType" value="${userType}">` : ''}
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
        // Clear any previous errors
        clearLoginErrors();
        // Focus on username field
        setTimeout(() => {
            const usernameField = document.getElementById('username');
            if (usernameField) usernameField.focus();
        }, 100);
    }
}

function showRegistration() {
    console.log('Showing registration form');
    if (loginFormContainer && modal) {
        loginFormContainer.innerHTML = getLoginForm('register');
        modal.style.display = 'flex';
        // Clear any previous errors
        clearLoginErrors();
        setTimeout(() => {
            const usernameField = document.getElementById('username');
            if (usernameField) usernameField.focus();
        }, 100);
    }
}

async function handleAuth(event, endpoint, formType) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Clear previous error messages
    clearLoginErrors();

    // Validate required fields
    let hasError = false;
    
    if (!data.username || data.username.trim() === '') {
        showLoginError('username', 'Please enter a username');
        hasError = true;
    }
    
    if (!data.password || data.password.trim() === '') {
        showLoginError('password', 'Please enter a password');
        hasError = true;
    }
    
    if (hasError) return;

    // For login, the userType is from the hidden field
    if (formType !== 'register') {
        data.userType = form.querySelector('input[name="userType"]').value;
    } else {
        // For registration, get userType from the select box
        data.userType = document.getElementById('reg-usertype').value;
        if (!data.userType) {
            showLoginError('reg-usertype', 'Please select a user type');
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
                userType = result.userType;
                localStorage.setItem('currentUsername', result.username);
                localStorage.setItem('userType', result.userType);
                
                console.log('User logged in:', currentUsername, 'Type:', result.userType);
                
                // 触发登录状态变更事件
                const loginEvent = new CustomEvent('loginStateChange', { 
                    detail: { 
                        username: result.username, 
                        userType: result.userType 
                    } 
                });
                window.dispatchEvent(loginEvent);
                
                // Check if user is admin and redirect to admin page
                if (result.userType === 'admin') {
                    setTimeout(() => {
                        closeModal();
                        updateLoginUI();
                        window.location.href = "admin.html";
                        return; // Stop further execution
                    }, 300);
                }
            }
            
            // Close modal and update UI for non-admin users
            setTimeout(() => { 
                closeModal(); 
                updateLoginUI();
                
                // Reload page to update all components
                setTimeout(() => {
                    if (formType === 'register') {
                        // After registration, show login form
                        showLogin('student');
                    } else {
                        // After login, reload page (for non-admin users)
                        location.reload();
                    }
                }, 500);
            }, 300);

        } else {
            const errorMessage = result.message || 'Authentication failed';
            showLoginError('general', errorMessage);
        }

    } catch (error) {
        console.error('Authentication error:', error);
        showLoginError('general', 'Could not connect to the server. Please check:\n1. Backend server is running\n2. MongoDB is running\n3. No CORS errors');
    }
}

function handleLogout() {
    console.log('Logging out user:', currentUsername);
    const oldUsername = currentUsername;
    const oldUserType = userType;
    
    currentUsername = null;
    userType = null;
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('userType');
    
    // 触发登出事件
    const logoutEvent = new CustomEvent('loginStateChange', { 
        detail: { 
            username: null, 
            userType: null 
        } 
    });
    window.dispatchEvent(logoutEvent);
    
    updateLoginUI();
    showNotification(`Goodbye ${oldUsername}! You have been logged out.`);
    
    // Clear chat on index page
    if (window.clearChat) {
        window.clearChat();
    }
    
    // Reload page to reset all states
    setTimeout(() => location.reload(), 1000);
}

// 新增：检查并显示导师UI的函数
function checkAndShowTutorUI() {
    console.log('Checking tutor UI - currentUsername:', currentUsername, 'userType:', userType);
    
    if (currentUsername && userType === 'tutor') {
        console.log('Tutor detected, showing upload button');
        const uploadBtn = document.getElementById('tutorUploadBtn');
        if (uploadBtn) {
            uploadBtn.style.display = 'block';
        }
        
        const myUploads = document.getElementById('myUploads');
        if (myUploads) {
            myUploads.style.display = 'block';
        }
    } else {
        console.log('Not a tutor or not logged in');
        const uploadBtn = document.getElementById('tutorUploadBtn');
        if (uploadBtn) {
            uploadBtn.style.display = 'none';
        }
        
        const uploadForm = document.getElementById('tutorUploadForm');
        if (uploadForm) {
            uploadForm.style.display = 'none';
        }
        
        const myUploads = document.getElementById('myUploads');
        if (myUploads) {
            myUploads.style.display = 'none';
        }
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded. Initializing common.js');
    
    // 确保从 localStorage 读取最新状态
    currentUsername = localStorage.getItem('currentUsername') || null;
    userType = localStorage.getItem('userType') || null;
    
    // Expose functions globally
    window.showLogin = showLogin;
    window.closeModal = closeModal;
    window.handleAuth = handleAuth;
    window.handleLogout = handleLogout;
    window.showRegistration = showRegistration;
    window.currentUsername = currentUsername;
    window.userType = userType;
    window.BACKEND_URL = BACKEND_URL;
    window.checkAndShowTutorUI = checkAndShowTutorUI;

    // Initialize the Login UI
    updateLoginUI();
    
    // 立即检查并显示导师UI（如果适用）
    checkAndShowTutorUI();
    
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