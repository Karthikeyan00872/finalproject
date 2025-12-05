// script.js - Complete Gemini Chatbot Integration with Python Flask Backend (MongoDB Version)

// DOM Elements
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const modal = document.getElementById('loginModal');
const loginFormContainer = document.getElementById('login-form-container');

// NEW DOM Elements for Username Display
// These must be present in your index.html, home.html, and questiontag.html
const loginStatusLink = document.getElementById('login-status-link');
const authDropdownContent = document.getElementById('auth-dropdown-content');

// --- Global Variable for Logged-in User ---
// This stores the username retrieved from login, persisting across tabs/reloads.
let currentUsername = localStorage.getItem('currentUsername') || null; 
// -----------------------------------------

const BACKEND_URL = 'http://localhost:5000'; // Define the backend base URL

// Utility Functions
function showNotification(message) {
    console.log(`[Notification] ${message}`);
}

function closeModal() {
    if (modal) {
        // Changed to 'none' for consistency with original file
        modal.style.display = 'none'; 
    }
}

function addMessage(text, sender) {
    if (!chatBox) return; 

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    if (sender === 'bot') {
        const icon = document.createElement('i');
        icon.className = 'fas fa-robot';
        messageDiv.appendChild(icon);
    } else if (sender === 'user') {
        const icon = document.createElement('i');
        icon.className = 'fas fa-user';
        messageDiv.appendChild(icon);
    }
    
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    messageDiv.appendChild(textSpan);
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// **NEW/MODIFIED: Function to update the Login/Username UI**
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

// **NEW: Function to handle logout**
function handleLogout() {
    localStorage.removeItem('currentUsername');
    currentUsername = null;
    updateLoginUI(); // Update UI to show 'Login' again
    
    // Reload the page to reset chat and other login-dependent views
    window.location.reload();
}

// **MODIFIED: Function to load messages from MongoDB history**
async function loadMessages() {
    if (!currentUsername) {
        addMessage("Please log in to start chatting and see your history.", "bot");
        return;
    }
    
    if (chatBox) chatBox.innerHTML = ''; 
    
    addMessage(`Welcome back, ${currentUsername}! Loading your chat history...`, "bot");

    try {
        const response = await fetch(`${BACKEND_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            chatBox.innerHTML = ''; 
            
            if (data.history.length === 0) {
                 addMessage("Hello! I'm your AI Tutor. How can I help you learn today?", "bot");
            } else {
                data.history.forEach(msg => {
                    addMessage(msg.text, msg.sender);
                });
            }
        } else {
            console.error('Failed to load history:', data.message);
            addMessage(`Error loading history: ${data.message || 'Server error.'}`, "bot");
        }
    } catch (error) {
        console.error('History Server Error:', error);
        addMessage("Could not connect to the chat history server.", "bot");
    }
}

// Chat functions
async function sendMessage() {
    if (!currentUsername) {
        alert("Please log in to use the chat.");
        return;
    }

    const prompt = chatInput.value.trim();
    if (prompt === "") return;

    addMessage(prompt, 'user');
    chatInput.value = ''; 

    addMessage("AI Tutor is thinking...", "bot");
    const typingIndicator = chatBox.lastElementChild;
    
    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt, username: currentUsername })
        });
        
        if (typingIndicator) {
            chatBox.removeChild(typingIndicator);
        }

        const data = await response.json();

        if (response.ok && data.text) {
            addMessage(data.text, 'bot');
        } else {
            addMessage(`Error: ${data.error || 'Unknown server response'}`, 'bot');
            console.error("Gemini API Error:", data.details || data.error);
        }

    } catch (error) {
        if (typingIndicator) {
            chatBox.removeChild(typingIndicator);
        }
        console.error('Chat Server Error:', error);
        addMessage("Sorry, the chat server is currently unavailable.", "bot");
    }
}

// **MODIFIED: The corrected handleLogin function**
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
            
            // --- CRITICAL: Set Global and Local Storage Username for Session ---
            currentUsername = data.username;
            localStorage.setItem('currentUsername', data.username);
            // ------------------------------------------------
            
            // Close modal and update UI
            setTimeout(() => {
                closeModal();
                updateLoginUI(); // <--- This updates the navigation bar to show the name
                
                if (chatBox) {
                    loadMessages(); 
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

// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Expose functions globally so they can be called from HTML onclick attributes
    window.showLogin = showLogin;
    window.closeModal = closeModal;
    window.handleLogin = handleLogin; 
    window.handleLogout = handleLogout; // Expose the new logout function

    // Chat functionality event listeners 
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // **CRITICAL: Initialize the Login UI status on page load**
    updateLoginUI(); 

    // Load initial chat history if a user is already logged in
    if (currentUsername && chatBox) {
        loadMessages();
    } else if (chatBox) {
        addMessage("Hello! I'm your AI Tutor. Please log in to start a session.", "bot");
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // --- Placeholder for other existing logic from the original script.js ---

    const qLevelFilter = document.getElementById('qLevelFilter');
    const qSubjectFilter = document.getElementById('qSubjectFilter');
    
    function filterQuestions() {
        console.log("Filtering questions...");
    }
    
    if (qLevelFilter) qLevelFilter.addEventListener('change', filterQuestions);
    if (qSubjectFilter) qSubjectFilter.addEventListener('change', filterQuestions);
    
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