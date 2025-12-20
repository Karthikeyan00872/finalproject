const modal = document.getElementById('loginModal');
const loginFormContainer = document.getElementById('login-form-container');

// --- Global Variable for Logged-in User ---
let currentUsername = localStorage.getItem('currentUsername') || null;
let userType = localStorage.getItem('userType') || null; // Add userType variable
let tutorApprovalStatus = localStorage.getItem('tutorApprovalStatus') || null; // Add tutor approval status

const BACKEND_URL = 'http://localhost:5000'; // Define the backend base URL

console.log('Common.js loaded. Current username:', currentUsername, 'User Type:', userType, 'Tutor Approval:', tutorApprovalStatus); // Debug log

// --- Utility Functions ---

function showNotification(message, type = 'success') {
    console.log(`[Notification] ${message}`);

    // Remove existing notifications to prevent stacking (optional "try your style")
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type === 'error' ? 'error' : ''}`;

    // Choose icon based on type
    const iconClass = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';

    notification.innerHTML = `
        <i class="fas ${iconClass}" style="font-size: 1.2rem;"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Remove after 4 seconds with animation
    setTimeout(() => {
        notification.style.animation = 'fadeOutSlideRight 0.4s forwards';
        setTimeout(() => notification.remove(), 400);
    }, 4000);
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
        loginContainer.querySelectorAll('input, select, textarea').forEach(input => {
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
    console.log('Updating login UI. Current user:', currentUsername, 'Type:', userType, 'Approval:', tutorApprovalStatus); // Debug log

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
        showNotification("Please log in to download files.", "error");
        showLogin('student');
        return;
    }

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
window.downloadFile = downloadFile;

// **Confirmation Modal**
function showConfirmModal(title, message, type = 'confirm') {
    return new Promise((resolve) => {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'confirm-modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(5px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease-out;
        `;

        // Determine button colors based on type
        let primaryColor = '#4CAF50';
        let secondaryColor = '#6c757d';
        let iconClass = 'fa-question-circle';

        if (type === 'delete') {
            primaryColor = '#ff4757';
            iconClass = 'fa-trash-alt';
        } else if (type === 'logout') {
            primaryColor = '#f39c12';
            iconClass = 'fa-sign-out-alt';
        } else if (type === 'approve') {
            primaryColor = '#2ed573';
            iconClass = 'fa-check';
        }

        modal.innerHTML = `
            <div class="confirm-modal-content" style="
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                padding: 30px;
                border-radius: 20px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 15px 35px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.2);
                transform: scale(0.9);
                animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            ">
                <h3 style="
                    margin-top: 0;
                    color: #2c3e50;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <i class="fas ${iconClass}" style="color: ${primaryColor};"></i>
                    ${title}
                </h3>
                
                <div style="margin-bottom: 25px; color: #555; line-height: 1.6; font-size: 1rem;">
                    ${message}
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: flex-end;">
                    <button id="confirmCancel" style="
                        background: #f1f2f6;
                        color: #57606f;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">
                        Cancel
                    </button>
                    <button id="confirmOk" style="
                        background: ${primaryColor};
                        color: white;
                        border: none;
                        padding: 10px 25px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                        box-shadow: 0 4px 15px ${primaryColor}40;
                        transition: all 0.2s;
                    ">
                        ${type === 'delete' ? 'Delete' : type === 'logout' ? 'Logout' : 'Confirm'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles for animations if not exists
        if (!document.getElementById('confirm-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'confirm-modal-styles';
            style.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `;
            document.head.appendChild(style);
        }

        const cancelBtn = modal.querySelector('#confirmCancel');
        const okBtn = modal.querySelector('#confirmOk');

        // Hover effects
        cancelBtn.onmouseenter = () => cancelBtn.style.background = '#dfe4ea';
        cancelBtn.onmouseleave = () => cancelBtn.style.background = '#f1f2f6';

        okBtn.onmouseenter = () => {
            okBtn.style.transform = 'translateY(-2px)';
            okBtn.style.boxShadow = `0 6px 20px ${primaryColor}60`;
        };
        okBtn.onmouseleave = () => {
            okBtn.style.transform = 'translateY(0)';
            okBtn.style.boxShadow = `0 4px 15px ${primaryColor}40`;
        };

        // Handlers
        const close = (value) => {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                resolve(value);
            }, 200);
        };

        cancelBtn.onclick = () => close(false);
        okBtn.onclick = () => close(true);
        modal.onclick = (e) => { if (e.target === modal) close(false); };
    });
}

// --- Authentication Handlers ---

// Toggle Password Visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

function getLoginForm(userType) {
    const action = userType === 'register' ? 'Register' : 'Login';
    const endpoint = userType === 'register' ? '/register' : '/login';
    const formHtml = `
        <span class="close-btn" onclick="closeModal()">&times;</span>
        <h2>${action} ${userType !== 'register' ? 'as ' + userType.charAt(0).toUpperCase() + userType.slice(1) : ''}</h2>
        <form onsubmit="event.preventDefault(); handleAuth(event, '${endpoint}', '${userType}')">
            ${userType !== 'register' ? `<input type="hidden" id="userTypeField" name="userType" value="${userType}">` : ''}
            <div class="form-content-wrapper" id="${userType === 'register' ? 'form-content-scrollable' : 'form-content-normal'}">
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required placeholder="Enter username">
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <div class="password-wrapper" style="position: relative;">
                        <input type="password" id="password" name="password" required placeholder="Enter password" class="password-input">
                        <i class="fas fa-eye password-toggle-icon" onclick="togglePasswordVisibility('password')" title="Toggle password visibility"></i>
                    </div>
                </div>
                ${userType === 'register' ? `
                    <div class="form-group">
                        <label for="reg-usertype">I am a:</label>
                        <select id="reg-usertype" name="userType" required onchange="toggleTutorRegistrationFields(this.value)">
                            <option value="">Select user type</option>
                            <option value="student">Student</option>
                            <option value="tutor">Tutor</option>
                        </select>
                    </div>
                    <div id="tutor-registration-fields" style="display: none;">
                        <div class="form-group">
                            <label for="fullName">Full Name*</label>
                            <input type="text" id="fullName" name="fullName" placeholder="Enter your full name">
                        </div>
                        <div class="form-group">
                            <label for="email">Email Address*</label>
                            <input type="email" id="email" name="email" placeholder="Enter your email">
                        </div>
                        <div class="form-group">
                            <label for="qualification">Educational Qualification*</label>
                            <textarea id="qualification" name="qualification" rows="3" placeholder="Enter your educational qualifications (e.g., M.Sc Physics, B.Ed)"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="experience">Teaching Experience (Description)</label>
                            <textarea id="experience" name="experience" rows="2" placeholder="Describe your teaching experience"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="yearsOfExperience">Years of Experience*</label>
                            <input type="number" id="yearsOfExperience" name="yearsOfExperience" min="0" step="1" placeholder="Enter years of experience (e.g., 2)">
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="form-footer">
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
            </div>
        </form>
    `;
    return formHtml;
}

// Toggle tutor registration fields
function toggleTutorRegistrationFields(userType) {
    const tutorFields = document.getElementById('tutor-registration-fields');
    if (tutorFields) {
        if (userType === 'tutor') {
            tutorFields.style.display = 'block';

            // Adjust scrollable area when tutor fields are shown
            setTimeout(() => {
                const scrollableDiv = document.getElementById('form-content-scrollable');
                if (scrollableDiv) {
                    // Ensure it's scrollable with fixed height
                    scrollableDiv.style.maxHeight = '300px';
                    scrollableDiv.style.overflowY = 'auto';
                    scrollableDiv.style.paddingRight = '10px';

                    // Custom scrollbar styling
                    scrollableDiv.style.scrollbarWidth = 'thin';
                    scrollableDiv.style.scrollbarColor = '#888 #f1f1f1';
                }
            }, 10);
        } else {
            tutorFields.style.display = 'none';

            // Reset scrollable area for student registration
            const scrollableDiv = document.getElementById('form-content-scrollable');
            if (scrollableDiv) {
                scrollableDiv.style.maxHeight = 'none';
                scrollableDiv.style.overflowY = 'visible';
                scrollableDiv.style.paddingRight = '0';
            }
        }
    }
}

function showLogin(userType) {
    console.log('Showing login form for:', userType);
    if (loginFormContainer && modal) {
        loginFormContainer.innerHTML = getLoginForm(userType);

        // Ensure modal has proper styling
        if (modal.style.display !== 'flex') {
            modal.style.display = 'flex';
        }

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

        // Ensure modal has proper styling
        if (modal.style.display !== 'flex') {
            modal.style.display = 'flex';
        }

        // Set scrollable container styling for registration form
        setTimeout(() => {
            const scrollableDiv = document.getElementById('form-content-scrollable');
            if (scrollableDiv) {
                scrollableDiv.style.maxHeight = '300px';
                scrollableDiv.style.overflowY = 'auto';
                scrollableDiv.style.paddingRight = '10px';
                scrollableDiv.style.marginBottom = '20px';

                // Custom scrollbar styling
                scrollableDiv.style.scrollbarWidth = 'thin';
                scrollableDiv.style.scrollbarColor = '#888 #f1f1f1';

                // For webkit browsers
                const style = document.createElement('style');
                style.textContent = `
                    #form-content-scrollable::-webkit-scrollbar {
                        width: 6px;
                    }
                    #form-content-scrollable::-webkit-scrollbar-track {
                        background: #f1f1f1;
                        border-radius: 10px;
                    }
                    #form-content-scrollable::-webkit-scrollbar-thumb {
                        background: #888;
                        border-radius: 10px;
                    }
                    #form-content-scrollable::-webkit-scrollbar-thumb:hover {
                        background: #555;
                    }
                `;
                document.head.appendChild(style);
            }
        }, 10);

        // Clear any previous errors
        clearLoginErrors();

        // Focus on username field
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

    if (formType === 'register') {
        data.userType = document.getElementById('reg-usertype').value;
        if (!data.userType) {
            showLoginError('reg-usertype', 'Please select a user type');
            return;
        }

        // Validate tutor-specific fields
        if (data.userType === 'tutor') {
            if (!data.fullName || data.fullName.trim() === '') {
                showLoginError('fullName', 'Please enter your full name');
                hasError = true;
            }

            if (!data.email || data.email.trim() === '' || !data.email.includes('@')) {
                showLoginError('email', 'Please enter a valid email address');
                hasError = true;
            }

            if (!data.qualification || data.qualification.trim() === '') {
                showLoginError('qualification', 'Please enter your educational qualification');
                hasError = true;
            }

            if (!data.yearsOfExperience || data.yearsOfExperience.trim() === '') {
                showLoginError('yearsOfExperience', 'Please enter your years of experience');
                hasError = true;
            }
        }
    } else {
        // For login, the userType is from the hidden field
        data.userType = form.querySelector('input[name="userType"]').value;
    }

    if (hasError) return;

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
                ? `Registration successful! ${data.userType === 'tutor' ? 'Your tutor application is pending admin approval.' : 'Welcome ' + data.username + '!'}`
                : `Login successful! Welcome back ${result.username}!`;

            showNotification(successMessage);

            // Set user data on successful login (not on registration)
            if (formType !== 'register') {
                currentUsername = result.username;
                userType = result.userType;
                tutorApprovalStatus = result.approval_status || null;

                localStorage.setItem('currentUsername', result.username);
                localStorage.setItem('userType', result.userType);
                localStorage.setItem('tutorApprovalStatus', tutorApprovalStatus || '');

                console.log('User logged in:', currentUsername, 'Type:', result.userType, 'Approval:', tutorApprovalStatus);

                // Trigger login state change event
                const loginEvent = new CustomEvent('loginStateChange', {
                    detail: {
                        username: result.username,
                        userType: result.userType,
                        approvalStatus: tutorApprovalStatus
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
                        if (data.userType === 'tutor') {
                            showNotification("Tutor registration successful! Please wait for admin approval.");
                        }
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
    tutorApprovalStatus = null;
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('userType');
    localStorage.removeItem('tutorApprovalStatus');

    // Trigger logout event
    const logoutEvent = new CustomEvent('loginStateChange', {
        detail: {
            username: null,
            userType: null,
            approvalStatus: null
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

// New: Check and show tutor UI based on approval status
function checkAndShowTutorUI() {
    console.log('Checking tutor UI - currentUsername:', currentUsername, 'userType:', userType, 'approvalStatus:', tutorApprovalStatus);

    // Show/hide approval message for tutors
    const approvalMessage = document.getElementById('tutorApprovalMessage');
    if (approvalMessage) {
        if (currentUsername && userType === 'tutor') {
            if (tutorApprovalStatus === 'pending') {
                approvalMessage.style.display = 'block';
                approvalMessage.innerHTML = `
                    <div class="pending-approval">
                        <i class="fas fa-clock"></i>
                        <h3>Your Tutor Application is Pending Approval</h3>
                        <p>Please wait while our admin reviews your application. You will receive an email once approved.</p>
                        <p><strong>Status:</strong> <span class="status pending">Pending Review</span></p>
                    </div>
                `;
            } else if (tutorApprovalStatus === 'rejected') {
                approvalMessage.style.display = 'block';
                approvalMessage.innerHTML = `
                    <div class="rejected-approval">
                        <i class="fas fa-times-circle"></i>
                        <h3>Tutor Application Rejected</h3>
                        <p>Your tutor application has been reviewed and rejected by the admin.</p>
                        <p>If you believe this is a mistake, please contact support.</p>
                        <p><strong>Status:</strong> <span class="status rejected">Rejected</span></p>
                    </div>
                `;
            } else if (tutorApprovalStatus === 'approved') {
                approvalMessage.style.display = 'none';

                // Show tutor controls
                const uploadBtn = document.getElementById('tutorUploadBtn');
                const questionUploadBtn = document.getElementById('tutorQuestionUploadBtn');
                const myUploads = document.getElementById('myUploads');
                const myQuestionUploads = document.getElementById('myQuestionUploads');

                if (uploadBtn) uploadBtn.style.display = 'block';
                if (questionUploadBtn) questionUploadBtn.style.display = 'block';
                if (myUploads) myUploads.style.display = 'block';
                if (myQuestionUploads) myQuestionUploads.style.display = 'block';
            }
        } else {
            if (approvalMessage) approvalMessage.style.display = 'none';

            // Hide all tutor controls
            const uploadBtn = document.getElementById('tutorUploadBtn');
            const questionUploadBtn = document.getElementById('tutorQuestionUploadBtn');
            const myUploads = document.getElementById('myUploads');
            const myQuestionUploads = document.getElementById('myQuestionUploads');
            const uploadForm = document.getElementById('tutorUploadForm');
            const questionUploadForm = document.getElementById('tutorQuestionUploadForm');

            if (uploadBtn) uploadBtn.style.display = 'none';
            if (questionUploadBtn) questionUploadBtn.style.display = 'none';
            if (myUploads) myUploads.style.display = 'none';
            if (myQuestionUploads) myQuestionUploads.style.display = 'none';
            if (uploadForm) uploadForm.style.display = 'none';
            if (questionUploadForm) questionUploadForm.style.display = 'none';
        }
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded. Initializing common.js');

    // Ensure we read from localStorage
    currentUsername = localStorage.getItem('currentUsername') || null;
    userType = localStorage.getItem('userType') || null;
    tutorApprovalStatus = localStorage.getItem('tutorApprovalStatus') || null;

    // Expose functions globally
    window.showLogin = showLogin;
    window.closeModal = closeModal;
    window.handleAuth = handleAuth;
    window.handleLogout = handleLogout;
    window.showRegistration = showRegistration;
    window.toggleTutorRegistrationFields = toggleTutorRegistrationFields;
    window.currentUsername = currentUsername;
    window.userType = userType;
    window.tutorApprovalStatus = tutorApprovalStatus;
    window.BACKEND_URL = BACKEND_URL;
    window.BACKEND_URL = BACKEND_URL;
    window.BACKEND_URL = BACKEND_URL;
    window.checkAndShowTutorUI = checkAndShowTutorUI;
    window.showConfirmModal = showConfirmModal;
    window.showNotification = showNotification;
    window.togglePasswordVisibility = togglePasswordVisibility;

    // Initialize the Login UI
    updateLoginUI();

    // Immediately check and show tutor UI (if applicable)
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

    // Listen for login state changes
    window.addEventListener('loginStateChange', function (event) {
        console.log('Login state changed in common.js:', event.detail);
        checkAndShowTutorUI();
    });

    // Apply modal styling dynamically
    setTimeout(() => {
        if (modal) {
            // Ensure modal has proper styling
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            `;

            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.cssText = `
                    background-color: white;
                    border-radius: 10px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 85vh;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                `;
            }
        }
    }, 100);

    console.log('Common.js initialization complete');
});