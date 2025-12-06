// common.js - Core functionalities shared across all pages

// --- Global DOM Elements ---
const modal = document.getElementById('loginModal');
const loginFormContainer = document.getElementById('login-form-container');

// NEW DOM Elements for Username Display
const loginStatusLink = document.getElementById('login-status-link');
const authDropdownContent = document.getElementById('auth-dropdown-content');

// --- Global Variable for Logged-in User ---
// This stores the username retrieved from login, persisting across tabs/reloads.
let currentUsername = localStorage.getItem('currentUsername') || null; 
// -----------------------------------------

const BACKEND_URL = 'http://localhost:5000'; // Define the backend base URL

// --- Utility Functions ---

function showNotification(message) {
    console.log(`[Notification] ${message}`);
}

function closeModal() {
    if (modal) {
        modal.style.display = 'none'; 
    }
}

// **Function to update the Login/Username UI**
function updateLoginUI() {
    // Re-fetch elements inside function to ensure they are available on all pages
    const loginStatusLink = document.getElementById('login-status-link');
    const authDropdownContent = document.getElementById('auth-dropdown-content');

    if (loginStatusLink && authDropdownContent) {
        if (currentUsername) {
            // User is logged in: Show Username
            loginStatusLink.innerHTML = `<i class="fas fa-user-circle"></i> Hello, ${currentUsername}`;
            loginStatusLink.style.fontWeight = 'bold'; 
            loginStatusLink.onclick = null; // Prevent default action

            // Show Logout button in the dropdown content
            authDropdownContent.innerHTML = `
                <a href="#" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
        } else {
            // User is logged out: Show Login options
            loginStatusLink.innerHTML = `Login`;
            loginStatusLink.style.fontWeight = '500'; 
            loginStatusLink.onclick = null; 

            // Restore original dropdown content
            authDropdownContent.innerHTML = `
                <a href="#" onclick="showLogin('student')">Student Login</a>
                <a href="#" onclick="showLogin('tutor')">Tutor Login</a>
                <a href="#" onclick="showLogin('admin')">Admin Login</a>
            `;
        }
    }
}

// **Function to handle logout**
function handleLogout() {
    localStorage.removeItem('currentUsername');
    currentUsername = null;
    updateLoginUI(); // Update UI to show 'Login' again
    
    // Reload the page to reset login-dependent views (like chat or question bank access)
    window.location.reload();
}

// **Function to handle user login**
async function handleLogin(userType) {
    const usernameInput = document.getElementById('username'); 
    const passwordInput = document.getElementById('password');
    
    if (!usernameInput || !passwordInput) {
        alert("Error: Login form inputs not found. Check HTML structure.");
        return false;
    }
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    if (!username || !password) {
        alert('Please fill in both username and password fields.');
        return false;
    }
    
    try {
        const backendUrl = `${BACKEND_URL}/login`;

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username, 
                password: password,
                user_type: userType 
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification(`Welcome ${data.user_type || userType}! Login Successful.`);
            
            // CRITICAL: Set Global and Local Storage Username for Session
            currentUsername = data.username;
            localStorage.setItem('currentUsername', data.username);
            
            // Close modal and update UI
            setTimeout(() => {
                closeModal();
                updateLoginUI(); // Updates the navigation bar to show the name
                
                // If on the index page, start loading chat history
                if (window.loadMessages) {
                    window.loadMessages(); 
                } else {
                    // Otherwise, just reload to update the logged-in state on the current page
                    window.location.reload();
                }
            }, 500);
            
        } else {
            alert(`Login failed: ${data.message || 'Invalid credentials or server error.'}`);
        }
    } catch (error) {
        console.error('Login Server Error:', error);
        alert("Sorry, could not connect to the authentication server (http://localhost:5000). Please check if api_server.py is running.");
    }

    return false;
}

// --- Login Modal Handling ---
function getLoginForm(userType) {
    const capitalizedType = userType.charAt(0).toUpperCase() + userType.slice(1);
    
    return `
        <h2>${capitalizedType} Login</h2>
        <form id="loginForm" onsubmit="event.preventDefault(); handleLogin('${userType}');">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="cta-button login-btn">Login</button>
        </form>
    `;
}

function showLogin(userType) {
    if (loginFormContainer && modal) {
        loginFormContainer.innerHTML = getLoginForm(userType);
        modal.style.display = 'flex'; // Changed to flex to center the modal
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Expose functions globally so they can be called from HTML onclick attributes
    window.showLogin = showLogin;
    window.closeModal = closeModal;
    window.handleLogin = handleLogin; 
    window.handleLogout = handleLogout; 

    // CRITICAL: Initialize the Login UI status on page load
    updateLoginUI(); 

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Observer for card animations (used on all pages)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.course-card, .question-card, .feature-card').forEach(card => {
        observer.observe(card);
    });
});