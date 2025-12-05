// script.js - Complete Gemini Chatbot Integration with Python Flask Backend (MongoDB Version)

// DOM Elements
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const modal = document.getElementById('loginModal');
const loginFormContainer = document.getElementById('login-form-container');

// --- Global Variable for Logged-in User ---
// This is used to track the current user for MongoDB history
let currentUsername = localStorage.getItem('currentUsername') || null; 
// -----------------------------------------

const BACKEND_URL = 'http://localhost:5000'; // Define the backend base URL

// Utility Functions
function showNotification(message) {
    // In a full application, this would be a custom notification bar, 
    // but for simplicity, we log it to the console here.
    console.log(`[Notification] ${message}`);
}

function closeModal() {
    if (modal) {
        modal.style.display = 'none';
    }
}

function addMessage(text, sender) {
    if (!chatBox) return; // Guard clause if not on the chat page

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
    
    // Create a span for the text content to allow proper styling separation from the icon
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    messageDiv.appendChild(textSpan);
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// **MODIFIED: Function to load messages from MongoDB history**
async function loadMessages() {
    if (!currentUsername) {
        addMessage("Please log in to start chatting and see your history.", "bot");
        return;
    }
    
    if (chatBox) chatBox.innerHTML = ''; // Clear existing messages
    
    addMessage(`Welcome back, ${currentUsername}! Loading your chat history...`, "bot");

    try {
        const response = await fetch(`${BACKEND_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Remove the loading message
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

    // 1. Add user message to UI
    addMessage(prompt, 'user');
    chatInput.value = ''; // Clear input

    // Simulate AI typing indicator
    addMessage("AI Tutor is thinking...", "bot");
    
    // Remove the typing indicator before adding the real response
    const typingIndicator = chatBox.lastElementChild;
    
    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt, username: currentUsername })
        });
        
        // Remove typing indicator before processing response
        if (typingIndicator) {
            chatBox.removeChild(typingIndicator);
        }

        const data = await response.json();

        if (response.ok && data.text) {
            // 2. Add AI response to UI
            addMessage(data.text, 'bot');
        } else {
            addMessage(`Error: ${data.error || 'Unknown server response'}`, 'bot');
            console.error("Gemini API Error:", data.details || data.error);
        }

    } catch (error) {
        // Remove typing indicator if an error occurred
        if (typingIndicator) {
            chatBox.removeChild(typingIndicator);
        }
        console.error('Chat Server Error:', error);
        addMessage("Sorry, the chat server is currently unavailable.", "bot");
    }
}

// **MODIFIED: The corrected handleLogin function**
async function handleLogin(userType) {
    // FIX: Ensure correct input IDs are targeted ('username' and 'password' are assumed from HTML modal)
    const usernameInput = document.getElementById('username'); 
    const passwordInput = document.getElementById('password');
    
    // NOTE: Using custom modal/dialog instead of alert() for better UX is recommended.
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
        const backendUrl = `${BACKEND_URL}/login`; // Flask Login Endpoint

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username, 
                password: password,
                // --- CRITICAL FIX: Send the user_type to the backend ---
                user_type: userType 
                // ----------------------------------------------------
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification(`Welcome ${data.user_type || userType}! Login Successful.`);
            
            // --- NEW: Set Global and Local Storage Username for Session ---
            currentUsername = data.username;
            localStorage.setItem('currentUsername', data.username);
            // ------------------------------------------------
            
            // Close modal and then load the user's chat history
            setTimeout(() => {
                closeModal();
                // Check if we are on the page that has the chatBox element
                if (chatBox) {
                    loadMessages(); // Load the specific user's chat history
                }
                
                // OPTIONAL: Redirect to a main page like 'home.html' after login
                // if (window.location.pathname.endsWith('index.html')) {
                //     window.location.href = 'home.html';
                // }
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
    
    // Note: The form action is set to call the JS function handleLogin(userType)
    // The 'username' and 'password' IDs are CRITICAL for handleLogin to work.
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
            <button type="submit" class="btn btn-primary">Login</button>
        </form>
    `;
}

function showLogin(userType) {
    if (loginFormContainer && modal) {
        loginFormContainer.innerHTML = getLoginForm(userType);
        modal.style.display = 'block';
    }
}

// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Expose functions globally so they can be called from HTML onclick attributes
    window.showLogin = showLogin;
    window.closeModal = closeModal;
    window.handleLogin = handleLogin; 
    
    // Chat functionality event listeners (only on pages where they exist)
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

    // Example: Question Tag functionality placeholders
    const qLevelFilter = document.getElementById('qLevelFilter');
    const qSubjectFilter = document.getElementById('qSubjectFilter');
    
    function filterQuestions() {
        console.log("Filtering questions...");
        // This is where your filtering logic would go
    }
    
    if (qLevelFilter) qLevelFilter.addEventListener('change', filterQuestions);
    if (qSubjectFilter) qSubjectFilter.addEventListener('change', filterQuestions);
    
    // Add animation classes on scroll (example from previous versions)
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