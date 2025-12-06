// index.js - Specific logic for the Home page (Chatbot)

// DOM Elements specific to index.html
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

// Utility to add a message to the chat
function addMessage(text, sender) {
    if (!chatBox) return; 

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    const icon = document.createElement('i');
    if (sender === 'bot') {
        icon.className = 'fas fa-robot';
    } else if (sender === 'user') {
        icon.className = 'fas fa-user';
    }
    messageDiv.appendChild(icon);
    
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    messageDiv.appendChild(textSpan);
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to load messages from MongoDB history
async function loadMessages() {
    console.log("loadMessages called for user:", window.currentUsername);
    
    // currentUsername and BACKEND_URL are from common.js
    if (!window.currentUsername) {
        if (chatBox) chatBox.innerHTML = ''; 
        addMessage("Hello! I'm your AI Tutor. Please log in to start a session.", "bot");
        return;
    }
    
    if (chatBox) chatBox.innerHTML = ''; 
    
    addMessage(`Welcome back, ${window.currentUsername}! Loading your chat history...`, "bot");

    try {
        console.log("Fetching history from:", `${window.BACKEND_URL}/history`);
        const response = await fetch(`${window.BACKEND_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: window.currentUsername })
        });

        console.log("History response status:", response.status);
        const data = await response.json();
        console.log("History response data:", data);

        if (response.ok && data.success) {
            chatBox.innerHTML = ''; 
            
            if (data.history && data.history.length === 0) {
                 addMessage("Hello! I'm your AI Tutor. How can I help you learn today?", "bot");
            } else if (data.history) {
                console.log("Loading", data.history.length, "messages");
                data.history.forEach(msg => {
                    addMessage(msg.text, msg.sender);
                });
            } else {
                addMessage("Hello! I'm your AI Tutor. How can I help you learn today?", "bot");
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
    if (!window.currentUsername) {
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
        const response = await fetch(`${window.BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt, username: window.currentUsername })
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

// Initialization for index.html
document.addEventListener('DOMContentLoaded', () => {
    // Expose loadMessages globally so common.js can call it after successful login
    window.loadMessages = loadMessages;

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
    if (window.currentUsername && chatBox) {
        loadMessages();
    } else if (chatBox) {
        addMessage("Hello! I'm your AI Tutor. Please log in to start a session.", "bot");
    }
});