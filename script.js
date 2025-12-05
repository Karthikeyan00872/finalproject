// script.js - Complete Gemini Chatbot Integration with Python Flask Backend

// DOM Elements
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const modal = document.getElementById('loginModal');
const loginFormContainer = document.getElementById('login-form-container');

// Chat Functions
function addMessage(text, sender) {
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
    
    const textNode = document.createTextNode(text);
    messageDiv.appendChild(textNode);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // --- START: NEW LOCALSTORAGE LOGIC (Save chat history) ---
    const currentMessages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
    currentMessages.push({ text: text, sender: sender, timestamp: new Date().toISOString() });
    localStorage.setItem('chatMessages', JSON.stringify(currentMessages));
    // --- END: NEW LOCALSTORAGE LOGIC ---
}

// Function to load messages from localStorage
function loadMessages() {
    const savedMessages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
    
    // Clear the initial message added in index.html
    chatBox.innerHTML = ''; 
    
    if (savedMessages.length > 0) {
        savedMessages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.sender}-message`;
            
            if (msg.sender === 'bot') {
                const icon = document.createElement('i');
                icon.className = 'fas fa-robot';
                messageDiv.appendChild(icon);
            } else if (msg.sender === 'user') {
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                messageDiv.appendChild(icon);
            }
            
            const textNode = document.createTextNode(msg.text);
            messageDiv.appendChild(textNode);
            chatBox.appendChild(messageDiv);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        // If no saved messages, add the initial bot welcome message
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'chat-message bot-message';
        welcomeDiv.innerHTML = '<i class="fas fa-robot"></i> Hello! I\'m your AI tutor. How can I help you today?';
        chatBox.appendChild(welcomeDiv);
    }
}


// **MODIFIED: Gemini API Integration (via Flask Server)**
async function queryGemini(message) {
    const backendUrl = 'http://localhost:5000/chat'; // <-- Flask Server Endpoint

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message bot-message';
    typingIndicator.innerHTML = '<i class="fas fa-robot"></i> Typing...';
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    try {
        // Send POST request to the Python backend
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Remove typing indicator
        chatBox.removeChild(typingIndicator);
        
        // Return the 'text' property from the JSON response
        return data.text || "I apologize, but I couldn't generate a response from the AI server.";
        
    } catch (error) {
        console.error('Python Flask Server Error:', error);
        
        // Remove typing indicator on error
        if (chatBox.contains(typingIndicator)) {
            chatBox.removeChild(typingIndicator);
        }
        
        return "Sorry, I can't connect to the AI service. Please make sure the Python Flask server (http://localhost:5000) is running.";
    }
}

// **MODIFIED: Send Message Function**
async function sendMessage() {
    //const message = chatInput.value.trim();
    const message = chatInput.value.trim() + "without any symbols and special character,without bulletpoint,no bold";
    if (!message) return;
    
    // Clear input
    chatInput.value = '';
    
    // Add user message
    addMessage(message, 'user');
    
    // Get AI response using the new Gemini function
    let aiResponse = await queryGemini(message);
    
    // Add AI response
    addMessage(aiResponse, 'bot');
}

// **MODIFIED: Initialize on page load**
document.addEventListener('DOMContentLoaded', function() {
    // Add active class to current page link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const menuLinks = document.querySelectorAll('.menu a');
    
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Initialize animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.course-card, .question-card, .feature-card').forEach(el => {
        observer.observe(el);
    });
    
    // Initialize chatbot if elements exist
    if (chatBox && chatInput && sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // --- NEW: Load saved chat messages on page load ---
        loadMessages();
    }
});


// --- The rest of the original script.js code remains below this point ---
// (filterCourses, filterQuestions, downloadAllQuestions, downloadFile, showNotification, 
// showLogin, closeModal, handleLogin, enrollCourse, and animationStyles functions are unchanged)


// Course filtering
const gradeFilter = document.getElementById('gradeFilter');
const subjectFilter = document.getElementById('subjectFilter');

if (gradeFilter) {
    gradeFilter.addEventListener('change', filterCourses);
}

if (subjectFilter) {
    subjectFilter.addEventListener('change', filterCourses);
}

function filterCourses() {
    const gradeValue = gradeFilter ? gradeFilter.value : 'all';
    const subjectValue = subjectFilter ? subjectFilter.value : 'all';
    const courseCards = document.querySelectorAll('.course-card');
    
    courseCards.forEach(card => {
        const cardGrade = card.getAttribute('data-grade');
        const cardSubject = card.getAttribute('data-subject');
        
        const gradeMatch = gradeValue === 'all' || cardGrade === gradeValue;
        const subjectMatch = subjectValue === 'all' || cardSubject === subjectValue;
        
        if (gradeMatch && subjectMatch) {
            card.style.display = 'block';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
        } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 300);
        }
    });
}

// Question filtering and search
const questionSearch = document.getElementById('questionSearch');
const gradeSelect = document.getElementById('gradeSelect');
const subjectSelect = document.getElementById('subjectSelect');

if (questionSearch) {
    questionSearch.addEventListener('input', filterQuestions);
}

if (gradeSelect) {
    gradeSelect.addEventListener('change', filterQuestions);
}

if (subjectSelect) {
    subjectSelect.addEventListener('change', filterQuestions);
}

function filterQuestions() {
    const searchTerm = questionSearch ? questionSearch.value.toLowerCase() : '';
    const selectedGrade = gradeSelect ? gradeSelect.value : 'all';
    const selectedSubject = subjectSelect ? subjectSelect.value : 'all';
    
    // Filter 10th grade questions
    const grade10Questions = document.querySelectorAll('#grade-10-questions .question-card');
    grade10Questions.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        const cardSubject = card.getAttribute('data-subject');
        
        const matchesSearch = searchTerm === '' || cardText.includes(searchTerm);
        const matchesGrade = selectedGrade === 'all' || selectedGrade === '10th';
        const matchesSubject = selectedSubject === 'all' || cardSubject === selectedSubject;
        
        card.style.display = (matchesSearch && matchesGrade && matchesSubject) ? 'block' : 'none';
    });
    
    // Filter 12th grade questions
    const grade12Questions = document.querySelectorAll('#grade-12-questions .question-card');
    grade12Questions.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        const cardSubject = card.getAttribute('data-subject');
        
        const matchesSearch = searchTerm === '' || cardText.includes(searchTerm);
        const matchesGrade = selectedGrade === 'all' || selectedGrade === '12th';
        const matchesSubject = selectedSubject === 'all' || cardSubject === selectedSubject;
        
        card.style.display = (matchesSearch && matchesGrade && matchesSubject) ? 'block' : 'none';
    });
}

// Download functionality
document.addEventListener('click', function(e) {
    // Handle individual question downloads
    if (e.target.closest('.download-btn')) {
        const btn = e.target.closest('.download-btn');
        const filename = btn.getAttribute('data-filename') || 'question.txt';
        const content = btn.getAttribute('data-content') || '';
        
        // Add timestamp and metadata
        const fullContent = `AI Tutor Question Bank\n${filename}\n\n${content}\n\nDownloaded on: ${new Date().toLocaleString()}\n\nStudy Smart, Learn Better!`;
        
        downloadFile(filename, fullContent);
    }
});

// Download all questions for a grade
function downloadAllQuestions(grade) {
    const containerId = `grade-${grade}-questions`;
    const container = document.getElementById(containerId);
    
    if (!container) {
        alert('No questions found for this grade.');
        return;
    }
    
    const cards = container.querySelectorAll('.question-card');
    if (cards.length === 0) {
        alert('No questions available to download.');
        return;
    }
    
    let combinedContent = `AI Tutor Question Bank\n${grade} Grade - All Questions\n\n`;
    combinedContent += `Total Questions: ${cards.length}\nDownloaded on: ${new Date().toLocaleString()}\n\n`;
    combinedContent += '='.repeat(50) + '\n\n';
    
    cards.forEach((card, index) => {
        const title = card.querySelector('h4') ? card.querySelector('h4').textContent.trim() : `Question ${index + 1}`;
        const content = card.querySelector('p') ? card.querySelector('p').textContent.trim() : '';
        const difficulty = card.querySelector('.difficulty') ? card.querySelector('.difficulty').textContent.trim() : '';
        
        combinedContent += `${title} (${difficulty})\n`;
        combinedContent += `${content}\n\n`;
        combinedContent += '―'.repeat(30) + '\n\n';
    });
    
    combinedContent += '\n\nGood luck with your studies!\nAI Tutor Team';
    
    const filename = `${grade}_grade_all_questions.txt`;
    downloadFile(filename, combinedContent);
}

// File download helper
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show download confirmation
        showNotification(`Downloaded: ${filename}`);
    }, 100);
}

// Notification system
function showNotification(message) {
    // Remove existing notification
    const existingNotification = document.querySelector('.download-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'download-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #2E7D32);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            if (style.parentNode) {
                style.remove();
            }
        }, 300);
    }, 3000);
}

// Modal functionality
function showLogin(userType) {
    if (!modal || !loginFormContainer) return;
    
    // Set form based on user type
    const formTitle = userType.charAt(0).toUpperCase() + userType.slice(1) + ' Login';
    
    loginFormContainer.innerHTML = `
        <div class="login-box">
            <h2>${formTitle}</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" placeholder="Enter your username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" placeholder="Enter your password" required>
                </div>
                <button type="submit" class="login-btn">Login</button>
            </form>
            <p class="signup-link">
                ${userType === 'admin' ? 'Contact support for admin access' : 'Don\'t have an account? <a href="#">Sign up</a>'}
            </p>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Handle form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Call the async function
            handleLogin(userType);
        });
    }
}

function closeModal() {
    if (modal) {
        modal.style.display = 'none';
    }
}

// **MODIFIED: Handle login submission with Flask backend**
async function handleLogin(userType) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (!usernameInput || !passwordInput) return false;
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    // Simple validation
    if (!username || !password) {
        alert('Please fill in all fields');
        return false;
    }
    
    try {
        const backendUrl = 'http://localhost:5000/login'; // Flask Login Endpoint

        // Send POST request to the Python backend
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username, 
                password: password,
                user_type: userType // User type from the clicked dropdown link
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Success response
            showNotification(`Welcome ${data.user_type || userType}! Login Successful.`);
            
            // Close modal after delay
            setTimeout(() => {
                closeModal();
                // Optional: Redirect the user after successful login
                // window.location.href = 'home.html';
            }, 1500);
        } else {
            // Failure response
            alert(`Login failed: ${data.message || 'Invalid credentials or server error.'}`);
        }
    } catch (error) {
        console.error('Login Server Error:', error);
        alert("Sorry, could not connect to the authentication server (http://localhost:5000).");
    }

    return false;
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (modal && e.target === modal) {
        closeModal();
    }
});

// Course enrollment
function enrollCourse(courseName) {
    showNotification(`Enrolled in ${courseName}! Check your email for details.`);
}

// Add animation styles dynamically
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    .course-card, .question-card, .feature-card {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
    }
    
    .course-card.animate-in, .question-card.animate-in, .feature-card.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    @media (prefers-reduced-motion: reduce) {
        .course-card, .question-card, .feature-card {
            opacity: 1;
            transform: none;
            transition: none;
        }
    }
`;
document.head.appendChild(animationStyles);