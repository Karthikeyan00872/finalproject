const adminUsernameSpan = document.getElementById('admin-username');
const totalUsersEl = document.getElementById('total-users');
const totalStudentsEl = document.getElementById('total-students');
const totalTutorsEl = document.getElementById('total-tutors');
const pendingTutorsEl = document.getElementById('pending-tutors');
const usersTableBody = document.getElementById('users-table-body');
const pendingTutorsTableBody = document.getElementById('pending-tutors-table-body');
const approvedTutorsTableBody = document.getElementById('approved-tutors-table-body');
const rejectedTutorsTableBody = document.getElementById('rejected-tutors-table-body');
const pendingCountBadge = document.getElementById('pending-count-badge');
const serverStatusEl = document.getElementById('server-status');
const databaseStatusEl = document.getElementById('database-status');
const apiStatusEl = document.getElementById('api-status');
const lastUpdatedEl = document.getElementById('last-updated');

// Current active tab
let currentTab = 'users';

// Custom notification function for admin
function showAdminNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.admin-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        min-width: 300px;
        max-width: 400px;
        font-family: 'Segoe UI', Arial, sans-serif;
    `;
    
    // Inner content style
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    // Icon style
    notification.querySelector('.notification-content i').style.cssText = `
        font-size: 1.2rem;
        flex-shrink: 0;
    `;
    
    // Text style
    notification.querySelector('.notification-content span').style.cssText = `
        flex: 1;
        font-size: 0.95rem;
        line-height: 1.4;
    `;
    
    // Close button style
    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        margin-left: 10px;
        opacity: 0.8;
        transition: opacity 0.2s;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
    
    // Add animation keyframes if not already present
    if (!document.querySelector('#notification-animations')) {
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Confirmation modal function
function showAdminConfirmModal(title, message, type = 'confirm') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'admin-confirm-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        // Determine button colors based on type
        let primaryColor = '#4CAF50';
        let secondaryColor = '#6c757d';
        
        if (type === 'delete') {
            primaryColor = '#f44336';
        } else if (type === 'logout') {
            primaryColor = '#ff9800';
        } else if (type === 'approve') {
            primaryColor = '#4CAF50';
        }
        
        modal.innerHTML = `
            <div class="confirm-modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                animation: modalFadeIn 0.3s ease-out;
            ">
                <h3 style="
                    margin-top: 0;
                    color: #333;
                    border-bottom: 2px solid ${primaryColor};
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                ">
                    <i class="fas ${type === 'delete' ? 'fa-trash' : type === 'logout' ? 'fa-sign-out-alt' : type === 'approve' ? 'fa-check' : 'fa-question-circle'}" 
                       style="margin-right: 10px; color: ${primaryColor};"></i>
                    ${title}
                </h3>
                
                <div style="margin-bottom: 25px; color: #555; line-height: 1.6;">
                    ${message}
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: flex-end;">
                    <button id="confirmCancel" style="
                        background: ${secondaryColor};
                        color: white;
                        border: none;
                        padding: 10px 25px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button id="confirmOk" style="
                        background: ${primaryColor};
                        color: white;
                        border: none;
                        padding: 10px 25px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">
                        <i class="fas ${type === 'delete' ? 'fa-trash' : type === 'logout' ? 'fa-sign-out-alt' : type === 'approve' ? 'fa-check' : 'fa-check'}"></i> 
                        ${type === 'delete' ? 'Delete' : type === 'logout' ? 'Logout' : type === 'approve' ? 'Approve' : 'Confirm'}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add animation keyframes
        if (!document.querySelector('#modal-animations')) {
            const style = document.createElement('style');
            style.id = 'modal-animations';
            style.textContent = `
                @keyframes modalFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .admin-confirm-modal button:hover {
                    opacity: 0.9;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Event listeners
        modal.querySelector('#confirmCancel').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        modal.querySelector('#confirmOk').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

// Check if user is admin on page load
function checkAdminAccess() {
    const userType = localStorage.getItem('userType');
    
    if (!window.currentUsername || userType !== 'admin') {
        // Not an admin, redirect to home page
        showAdminNotification("Access denied. Admin privileges required.", "error");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
        return false;
    }
    
    // Set admin username
    adminUsernameSpan.textContent = window.currentUsername;
    return true;
}

// Tab switching function
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
    
    currentTab = tabName;
    
    // Load data for the tab
    switch(tabName) {
        case 'users':
            loadUsers();
            break;
        case 'tutor-applications':
            loadPendingTutors();
            break;
        case 'approved-tutors':
            loadApprovedTutors();
            break;
        case 'rejected-tutors':
            loadRejectedTutors();
            break;
    }
}

// Fetch all users from backend
async function fetchUsers() {
    try {
        const response = await fetch(`${window.BACKEND_URL}/admin/users`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        return data.users || [];
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

// Load users into table
async function loadUsers() {
    const users = await fetchUsers();
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">No users found</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    users.forEach(user => {
        const registrationDate = new Date(user.createdAt).toLocaleDateString();
        
        // Don't show eye icon for admin users
        const viewButton = user.userType === 'admin' ? '' : `
            <button class="action-btn view-btn" onclick="viewUser('${user.username}')" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        `;
        
        // Determine status
        let status = '';
        if (user.userType === 'tutor') {
            const approvalStatus = user.approval_status || 'pending';
            if (approvalStatus === 'approved') {
                status = '<span class="status active">Approved Tutor</span>';
            } else if (approvalStatus === 'rejected') {
                status = '<span class="status rejected">Rejected</span>';
            } else {
                status = '<span class="status pending">Pending Approval</span>';
            }
        } else if (user.userType === 'student') {
            status = '<span class="status active">Active</span>';
        } else if (user.userType === 'admin') {
            status = '<span class="status admin">Administrator</span>';
        }
        
        html += `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>
                    <span class="user-type-badge ${user.userType}">
                        <i class="fas ${getUserTypeIcon(user.userType)}"></i> ${user.userType}
                    </span>
                </td>
                <td>${registrationDate}</td>
                <td>${status}</td>
                <td>
                    ${viewButton}
                    <button class="action-btn delete-btn" onclick="deleteUser('${user.username}')" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    usersTableBody.innerHTML = html;
    
    // Update stats
    updateStats(users);
}

// Fetch pending tutors
async function fetchPendingTutors() {
    try {
        const response = await fetch(`${window.BACKEND_URL}/admin/pending-tutors`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch pending tutors');
        }
        
        const data = await response.json();
        return data.pending_tutors || [];
    } catch (error) {
        console.error('Error fetching pending tutors:', error);
        return [];
    }
}

// Load pending tutors
async function loadPendingTutors() {
    const pendingTutors = await fetchPendingTutors();
    
    if (pendingTutors.length === 0) {
        pendingTutorsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">No pending tutor applications</td>
            </tr>
        `;
        pendingCountBadge.textContent = '0';
        return;
    }
    
    let html = '';
    pendingTutors.forEach(tutor => {
        const appliedDate = new Date(tutor.applied_at).toLocaleDateString();
        
        html += `
            <tr>
                <td><strong>${tutor.username}</strong></td>
                <td>${tutor.full_name}</td>
                <td>${tutor.email}</td>
                <td>${tutor.qualification}</td>
                <td>${appliedDate}</td>
                <td>
                    <button class="action-btn approve-btn" onclick="approveTutor('${tutor.username}')" title="Approve Tutor">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn reject-btn" onclick="showRejectionModal('${tutor.username}')" title="Reject Tutor">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    <button class="action-btn view-btn" onclick="viewTutorApplication('${tutor.username}')" title="View Application">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    pendingTutorsTableBody.innerHTML = html;
    pendingCountBadge.textContent = pendingTutors.length.toString();
    
    // Update pending tutors count in stats
    pendingTutorsEl.textContent = pendingTutors.length;
}

// Fetch approved tutors
async function fetchApprovedTutors() {
    try {
        const response = await fetch(`${window.BACKEND_URL}/admin/approved-tutors`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch approved tutors');
        }
        
        const data = await response.json();
        return data.approved_tutors || [];
    } catch (error) {
        console.error('Error fetching approved tutors:', error);
        return [];
    }
}

// Load approved tutors
async function loadApprovedTutors() {
    const approvedTutors = await fetchApprovedTutors();
    
    if (approvedTutors.length === 0) {
        approvedTutorsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">No approved tutors</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    approvedTutors.forEach(tutor => {
        const approvedDate = tutor.approved_at ? new Date(tutor.approved_at).toLocaleDateString() : 'N/A';
        
        html += `
            <tr>
                <td><strong>${tutor.username}</strong></td>
                <td>${tutor.full_name}</td>
                <td>${tutor.email}</td>
                <td>${tutor.qualification}</td>
                <td>${approvedDate}</td>
                <td><span class="status active">Approved</span></td>
            </tr>
        `;
    });
    
    approvedTutorsTableBody.innerHTML = html;
}

// Fetch rejected tutors
async function fetchRejectedTutors() {
    try {
        const response = await fetch(`${window.BACKEND_URL}/admin/rejected-tutors`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch rejected tutors');
        }
        
        const data = await response.json();
        return data.rejected_tutors || [];
    } catch (error) {
        console.error('Error fetching rejected tutors:', error);
        return [];
    }
}

// Load rejected tutors
async function loadRejectedTutors() {
    const rejectedTutors = await fetchRejectedTutors();
    
    if (rejectedTutors.length === 0) {
        rejectedTutorsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">No rejected tutors</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    rejectedTutors.forEach(tutor => {
        const rejectedDate = tutor.rejected_at ? new Date(tutor.rejected_at).toLocaleDateString() : 'N/A';
        const rejectionReason = tutor.rejection_reason || 'No reason provided';
        
        html += `
            <tr>
                <td><strong>${tutor.username}</strong></td>
                <td>${tutor.full_name}</td>
                <td>${tutor.email}</td>
                <td>${tutor.qualification}</td>
                <td>${rejectedDate}</td>
                <td>${rejectionReason.substring(0, 50)}${rejectionReason.length > 50 ? '...' : ''}</td>
                <td>
                    <button class="action-btn approve-btn" onclick="approveRejectedTutor('${tutor.username}')" title="Approve This Tutor">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteUser('${tutor.username}')" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    rejectedTutorsTableBody.innerHTML = html;
}

// Get icon for user type
function getUserTypeIcon(userType) {
    switch(userType) {
        case 'student': return 'fa-user-graduate';
        case 'tutor': return 'fa-chalkboard-teacher';
        case 'admin': return 'fa-user-shield';
        default: return 'fa-user';
    }
}

// Update statistics
async function updateStats(users) {
    const totalUsers = users.length;
    const totalStudents = users.filter(u => u.userType === 'student').length;
    const totalApprovedTutors = users.filter(u => u.userType === 'tutor' && u.approval_status === 'approved').length;
    
    totalUsersEl.textContent = totalUsers;
    totalStudentsEl.textContent = totalStudents;
    totalTutorsEl.textContent = totalApprovedTutors;
    
    // Get pending tutors count
    try {
        const pendingTutors = await fetchPendingTutors();
        pendingTutorsEl.textContent = pendingTutors.length;
        pendingCountBadge.textContent = pendingTutors.length.toString();
    } catch (error) {
        console.error('Error updating pending tutors count:', error);
    }
}

// Check system status
async function checkSystemStatus() {
    // Check server
    try {
        const response = await fetch(`${window.BACKEND_URL}/test`);
        serverStatusEl.innerHTML = '<span class="status online">Online</span>';
    } catch (error) {
        serverStatusEl.innerHTML = '<span class="status offline">Offline</span>';
    }
    
    // Check database
    try {
        const response = await fetch(`${window.BACKEND_URL}/test-db`);
        const data = await response.json();
        if (data.success) {
            databaseStatusEl.innerHTML = '<span class="status online">Connected</span>';
        } else {
            databaseStatusEl.innerHTML = '<span class="status offline">Error</span>';
        }
    } catch (error) {
        databaseStatusEl.innerHTML = '<span class="status offline">Disconnected</span>';
    }
    
    // Check API (Gemini)
    apiStatusEl.innerHTML = '<span class="status online">Operational</span>';
    
    // Update timestamp
    lastUpdatedEl.textContent = new Date().toLocaleTimeString();
}

// --- User Details Functions ---

// View user details
async function viewUser(username) {
    try {
        // Fetch user data
        const response = await fetch(`${window.BACKEND_URL}/admin/users`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        const users = data.users || [];
        const user = users.find(u => u.username === username);
        
        if (!user) {
            showAdminNotification(`User ${username} not found`, "error");
            return;
        }
        
        // Set the username in the details section
        document.getElementById('viewed-username').textContent = username;
        
        let detailsHtml = '';
        
        if (user.userType === 'student') {
            // Show student's enrolled courses and ratings
            detailsHtml = await getStudentDetails(username);
        } else if (user.userType === 'tutor') {
            // Show tutor's courses and enrolled students
            detailsHtml = await getTutorDetails(username);
        } else if (user.userType === 'admin') {
            // Admin view - just show basic info
            detailsHtml = getAdminDetails(user);
        }
        
        // Display the details section
        document.getElementById('user-details-content').innerHTML = detailsHtml;
        document.getElementById('user-details-section').style.display = 'block';
        
        // Scroll to details section
        document.getElementById('user-details-section').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error viewing user:', error);
        showAdminNotification('Failed to load user details', "error");
    }
}

// View tutor application details
async function viewTutorApplication(username) {
    try {
        const pendingTutors = await fetchPendingTutors();
        const tutor = pendingTutors.find(t => t.username === username);
        
        if (!tutor) {
            showAdminNotification('Tutor application not found', "error");
            return;
        }
        
        const appliedDate = new Date(tutor.applied_at).toLocaleDateString();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;
        
        modalContent.innerHTML = `
            <span class="close-btn" onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; cursor: pointer; font-size: 24px;">&times;</span>
            <h3><i class="fas fa-chalkboard-teacher"></i> Tutor Application: ${tutor.username}</h3>
            
            <div class="tutor-info-grid">
                <div class="tutor-info-card">
                    <h5>Personal Information</h5>
                    <p><strong>Full Name:</strong> ${tutor.full_name}</p>
                    <p><strong>Username:</strong> ${tutor.username}</p>
                    <p><strong>Email:</strong> ${tutor.email}</p>
                </div>
                
                <div class="tutor-info-card">
                    <h5>Educational Background</h5>
                    <p><strong>Qualification:</strong> ${tutor.qualification}</p>
                    <p><strong>Experience:</strong> ${tutor.experience || 'Not specified'}</p>
                </div>
            </div>
            
            <div class="application-date">
                <p><strong>Applied on:</strong> ${appliedDate}</p>
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                <button class="cta-button" onclick="approveTutor('${tutor.username}'); this.closest('.modal').remove();">
                    <i class="fas fa-check"></i> Approve Application
                </button>
                <button class="cta-button secondary" onclick="showRejectionModal('${tutor.username}'); this.closest('.modal').remove();">
                    <i class="fas fa-times"></i> Reject Application
                </button>
                <button class="cta-button secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error viewing tutor application:', error);
        showAdminNotification('Failed to load tutor application details', "error");
    }
}

// Show rejection modal
function showRejectionModal(username) {
    const modal = document.createElement('div');
    modal.className = 'rejection-modal';
    
    modal.innerHTML = `
        <div class="rejection-modal-content">
            <h3><i class="fas fa-times-circle"></i> Reject Tutor Application</h3>
            <p>You are about to reject <strong>${username}</strong>'s tutor application.</p>
            <p>Please provide a reason for rejection (optional):</p>
            <textarea id="rejectionReason" placeholder="Enter rejection reason..."></textarea>
            <div class="rejection-modal-actions">
                <button class="cta-button secondary" onclick="this.closest('.rejection-modal').remove()">
                    Cancel
                </button>
                <button class="cta-button" style="background: #f44336;" onclick="rejectTutor('${username}')">
                    <i class="fas fa-times"></i> Reject Application
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Approve tutor
async function approveTutor(username) {
    const confirmApprove = await showAdminConfirmModal(
        `Approve Tutor Application`,
        `Are you sure you want to approve <strong>${username}</strong> as a tutor?`,
        'approve'
    );
    
    if (!confirmApprove) {
        return;
    }
    
    try {
        const response = await fetch(`${window.BACKEND_URL}/admin/approve-tutor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                admin_username: window.currentUsername
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAdminNotification(`Tutor ${username} approved successfully!`, "success");
            // Refresh all relevant tabs
            loadPendingTutors();
            loadApprovedTutors();
            loadUsers();
        } else {
            showAdminNotification(`Error: ${data.message}`, "error");
        }
    } catch (error) {
        console.error('Error approving tutor:', error);
        showAdminNotification('Failed to approve tutor. Please try again.', "error");
    }
}

// Reject tutor
async function rejectTutor(username) {
    const rejectionReason = document.getElementById('rejectionReason')?.value || 'Application rejected by admin';
    
    try {
        const response = await fetch(`${window.BACKEND_URL}/admin/reject-tutor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                admin_username: window.currentUsername,
                rejection_reason: rejectionReason
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Remove rejection modal
            const modal = document.querySelector('.rejection-modal');
            if (modal) modal.remove();
            
            showAdminNotification(`Tutor ${username} rejected successfully!`, "success");
            // Refresh all relevant tabs
            loadPendingTutors();
            loadRejectedTutors();
            loadUsers();
        } else {
            showAdminNotification(`Error: ${data.message}`, "error");
        }
    } catch (error) {
        console.error('Error rejecting tutor:', error);
        showAdminNotification('Failed to reject tutor. Please try again.', "error");
    }
}

// Approve a previously rejected tutor
async function approveRejectedTutor(username) {
    const confirmApprove = await showAdminConfirmModal(
        `Approve Previously Rejected Tutor`,
        `Are you sure you want to approve <strong>${username}</strong> who was previously rejected?`,
        'approve'
    );
    
    if (!confirmApprove) {
        return;
    }
    
    try {
        // First delete the rejected user
        await fetch(`${window.BACKEND_URL}/admin/users/${username}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        // Then approve as new tutor
        const response = await fetch(`${window.BACKEND_URL}/admin/approve-tutor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                admin_username: window.currentUsername
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAdminNotification(`Tutor ${username} approved successfully!`, "success");
            // Refresh all relevant tabs
            loadRejectedTutors();
            loadApprovedTutors();
            loadUsers();
        } else {
            showAdminNotification(`Error: ${data.message}`, "error");
        }
    } catch (error) {
        console.error('Error approving rejected tutor:', error);
        showAdminNotification('Failed to approve tutor. Please try again.', "error");
    }
}

// Get student details - enrolled courses with ratings
async function getStudentDetails(username) {
    try {
        // Get all courses
        const coursesResponse = await fetch(`${window.BACKEND_URL}/courses`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!coursesResponse.ok) {
            throw new Error('Failed to fetch courses');
        }
        
        const coursesData = await coursesResponse.json();
        const courses = coursesData.courses || [];
        
        // Filter courses where student is enrolled
        const enrolledCourses = courses.filter(course => 
            course.enrollments && course.enrollments.includes(username)
        );
        
        // Get student's ratings from all courses
        const studentRatings = {};
        courses.forEach(course => {
            if (course.ratings) {
                course.ratings.forEach(rating => {
                    if (rating.student === username) {
                        if (!studentRatings[course._id]) {
                            studentRatings[course._id] = [];
                        }
                        studentRatings[course._id].push(rating);
                    }
                });
            }
        });
        
        let html = `
            <div class="user-info-card">
                <h4><i class="fas fa-user-graduate"></i> Student Information</h4>
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Account Created:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span class="status active">Active</span></p>
            </div>
        `;
        
        if (enrolledCourses.length === 0) {
            html += `
                <div class="no-data-card">
                    <i class="fas fa-book"></i>
                    <h4>No Course Enrollments</h4>
                    <p>This student has not enrolled in any courses yet.</p>
                </div>
            `;
        } else {
            html += `
                <div class="courses-list">
                    <h4><i class="fas fa-book-open"></i> Enrolled Courses (${enrolledCourses.length})</h4>
                    
                    <div class="table-container">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Course Title</th>
                                    <th>Tutor</th>
                                    <th>Subject</th>
                                    <th>Grade</th>
                                    <th>Enrollment Date</th>
                                    <th>Ratings Given</th>
                                    <th>Average Rating</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            enrolledCourses.forEach(course => {
                const ratings = studentRatings[course._id] || [];
                const avgRating = ratings.length > 0 
                    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
                    : 'Not rated';
                
                const ratingsDisplay = ratings.length > 0 
                    ? ratings.map(r => `Chapter ${r.chapter + 1}: ${r.rating}★`).join(', ')
                    : 'No ratings';
                
                // Try to get enrollment date (simulated for now)
                const enrollDate = course.created_at 
                    ? new Date(course.created_at).toLocaleDateString()
                    : 'N/A';
                
                html += `
                    <tr>
                        <td><strong>${course.title}</strong></td>
                        <td>${course.tutor_username}</td>
                        <td>${course.subject}</td>
                        <td>Grade ${course.grade}</td>
                        <td>${enrollDate}</td>
                        <td>${ratingsDisplay}</td>
                        <td><span class="rating-stars">${avgRating}</span></td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        return html;
        
    } catch (error) {
        console.error('Error getting student details:', error);
        return `<div class="error-card">Error loading student details: ${error.message}</div>`;
    }
}

// Get tutor details - courses with enrolled students and ratings
async function getTutorDetails(username) {
    try {
        // Get all courses
        const coursesResponse = await fetch(`${window.BACKEND_URL}/courses`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!coursesResponse.ok) {
            throw new Error('Failed to fetch courses');
        }
        
        const coursesData = await coursesResponse.json();
        const courses = coursesData.courses || [];
        
        // Filter courses created by this tutor
        const tutorCourses = courses.filter(course => 
            course.tutor_username === username
        );
        
        // Get all ratings for tutor's courses
        const courseRatings = {};
        tutorCourses.forEach(course => {
            if (course.ratings) {
                courseRatings[course._id] = course.ratings;
            }
        });
        
        // Get tutor info
        const users = await fetchUsers();
        const tutor = users.find(u => u.username === username);
        
        let html = `
            <div class="user-info-card">
                <h4><i class="fas fa-chalkboard-teacher"></i> Tutor Information</h4>
                <p><strong>Username:</strong> ${username}</p>
                ${tutor && tutor.full_name ? `<p><strong>Full Name:</strong> ${tutor.full_name}</p>` : ''}
                ${tutor && tutor.email ? `<p><strong>Email:</strong> ${tutor.email}</p>` : ''}
                ${tutor && tutor.qualification ? `<p><strong>Qualification:</strong> ${tutor.qualification}</p>` : ''}
                <p><strong>Account Created:</strong> ${tutor && tutor.createdAt ? new Date(tutor.createdAt).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Status:</strong> <span class="status ${tutor && tutor.approval_status === 'approved' ? 'active' : 'pending'}">${tutor && tutor.approval_status === 'approved' ? 'Approved Tutor' : 'Pending Approval'}</span></p>
            </div>
        `;
        
        if (tutorCourses.length === 0) {
            html += `
                <div class="no-data-card">
                    <i class="fas fa-chalkboard"></i>
                    <h4>No Courses Created</h4>
                    <p>This tutor has not created any courses yet.</p>
                </div>
            `;
        } else {
            html += `
                <div class="courses-list">
                    <h4><i class="fas fa-chalkboard-teacher"></i> Created Courses (${tutorCourses.length})</h4>
                    
                    <div class="table-container">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Course Title</th>
                                    <th>Subject</th>
                                    <th>Grade</th>
                                    <th>Enrolled Students</th>
                                    <th>Total Ratings</th>
                                    <th>Average Rating</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            tutorCourses.forEach(course => {
                const enrollments = course.enrollments || [];
                const ratings = courseRatings[course._id] || [];
                const avgRating = course.avg_rating || 0;
                
                // Group ratings by student
                const ratingsByStudent = {};
                ratings.forEach(rating => {
                    if (!ratingsByStudent[rating.student]) {
                        ratingsByStudent[rating.student] = [];
                    }
                    ratingsByStudent[rating.student].push(rating);
                });
                
                html += `
                    <tr>
                        <td><strong>${course.title}</strong></td>
                        <td>${course.subject}</td>
                        <td>Grade ${course.grade}</td>
                        <td>${enrollments.length} students</td>
                        <td>${ratings.length} ratings</td>
                        <td><span class="rating-stars">${avgRating.toFixed(1)}★</span></td>
                        <td>
                            <button class="action-btn view-btn" onclick="viewCourseDetails('${course._id}', '${username}')" title="View Course Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        // Add tutor's questions if needed
        try {
            const questionsResponse = await fetch(`${window.BACKEND_URL}/questions`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (questionsResponse.ok) {
                const questionsData = await questionsResponse.json();
                const tutorQuestions = questionsData.questions.filter(q => 
                    q.tutor_username === username
                );
                
                if (tutorQuestions.length > 0) {
                    html += `
                        <div class="questions-list">
                            <h4><i class="fas fa-question-circle"></i> Created Questions (${tutorQuestions.length})</h4>
                            <p>Total Downloads: ${tutorQuestions.reduce((sum, q) => sum + (q.downloads || 0), 0)}</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
        
        return html;
        
    } catch (error) {
        console.error('Error getting tutor details:', error);
        return `<div class="error-card">Error loading tutor details: ${error.message}</div>`;
    }
}

// View course details (for tutor's courses)
async function viewCourseDetails(courseId, tutorUsername) {
    try {
        // Fetch course details
        const response = await fetch(`${window.BACKEND_URL}/courses`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch courses');
        }
        
        const data = await response.json();
        const course = data.courses.find(c => c._id === courseId);
        
        if (!course) {
            showAdminNotification('Course not found', "error");
            return;
        }
        
        // Prepare detailed course information
        let courseDetails = `
            <div class="user-info-card">
                <h4><i class="fas fa-book"></i> Course Details: ${course.title}</h4>
                <p><strong>Tutor:</strong> ${course.tutor_username}</p>
                <p><strong>Subject:</strong> ${course.subject}</p>
                <p><strong>Grade:</strong> ${course.grade}</p>
                <p><strong>Created:</strong> ${new Date(course.created_at).toLocaleDateString()}</p>
            </div>
        `;
        
        // Show enrolled students
        const enrollments = course.enrollments || [];
        if (enrollments.length === 0) {
            courseDetails += `
                <div class="no-data-card">
                    <i class="fas fa-users"></i>
                    <h4>No Students Enrolled</h4>
                    <p>No students have enrolled in this course yet.</p>
                </div>
            `;
        } else {
            // Get ratings by student
            const ratingsByStudent = {};
            const courseRatings = course.ratings || [];
            courseRatings.forEach(rating => {
                if (!ratingsByStudent[rating.student]) {
                    ratingsByStudent[rating.student] = [];
                }
                ratingsByStudent[rating.student].push(rating);
            });
            
            courseDetails += `
                <div class="enrolled-students">
                    <h4><i class="fas fa-user-graduate"></i> Enrolled Students (${enrollments.length})</h4>
                    
                    <div class="table-container">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Student Username</th>
                                    <th>Ratings Given</th>
                                    <th>Average Rating</th>
                                    <th>Rating Details</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            enrollments.forEach(student => {
                const studentRatings = ratingsByStudent[student] || [];
                const avgRating = studentRatings.length > 0 
                    ? (studentRatings.reduce((sum, r) => sum + r.rating, 0) / studentRatings.length).toFixed(1)
                    : 'No ratings';
                
                const ratingDetails = studentRatings.length > 0
                    ? studentRatings.map(r => `Chapter ${r.chapter + 1}: ${r.rating}★`).join('<br>')
                    : 'No ratings yet';
                
                courseDetails += `
                    <tr>
                        <td><strong>${student}</strong></td>
                        <td>${studentRatings.length} ratings</td>
                        <td><span class="rating-stars">${avgRating}</span></td>
                        <td>${ratingDetails}</td>
                    </tr>
                `;
            });
            
            courseDetails += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        // Show modal with course details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;
        
        modalContent.innerHTML = `
            <span class="close-btn" onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; cursor: pointer; font-size: 24px;">&times;</span>
            ${courseDetails}
            <div style="margin-top: 20px; text-align: center;">
                <button class="cta-button secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error viewing course details:', error);
        showAdminNotification('Failed to load course details', "error");
    }
}

// Get admin details - basic info only
function getAdminDetails(user) {
    return `
        <div class="user-info-card">
            <h4><i class="fas fa-user-shield"></i> Administrator Information</h4>
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Account Created:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
            <p><strong>Role:</strong> <span class="status admin">Administrator</span></p>
            <p><strong>Permissions:</strong> Full system access</p>
        </div>
        
        <div class="admin-permissions">
            <h4><i class="fas fa-key"></i> Administrator Permissions</h4>
            <ul>
                <li><i class="fas fa-check-circle"></i> View all user accounts</li>
                <li><i class="fas fa-check-circle"></i> Delete any user account</li>
                <li><i class="fas fa-check-circle"></i> View all chat sessions</li>
                <li><i class="fas fa-check-circle"></i> Monitor system status</li>
                <li><i class="fas fa-check-circle"></i> Export system data</li>
                <li><i class="fas fa-check-circle"></i> Approve/Reject tutor applications</li>
                <li><i class="fas fa-check-circle"></i> Manage tutor accounts</li>
            </ul>
        </div>
    `;
}

// Close user details section
function closeUserDetails() {
    document.getElementById('user-details-section').style.display = 'none';
}

// Delete user (with confirmation)
async function deleteUser(username) {
    if (username === window.currentUsername) {
        showAdminNotification("You cannot delete your own account!", "error");
        return;
    }
    
    const confirmDelete = await showAdminConfirmModal(
        `Delete User`,
        `Are you sure you want to delete user: <strong>${username}</strong>?<br><br>
        <small style="color: #ff6b6b;">This action cannot be undone.</small>`,
        'delete'
    );
    
    if (!confirmDelete) {
        return;
    }
    
    // Call backend API to delete user
    fetch(`${window.BACKEND_URL}/admin/users/${username}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAdminNotification(`User ${username} deleted successfully.`, "success");
            // Refresh current tab
            switch(currentTab) {
                case 'users':
                    loadUsers();
                    break;
                case 'tutor-applications':
                    loadPendingTutors();
                    break;
                case 'approved-tutors':
                    loadApprovedTutors();
                    break;
                case 'rejected-tutors':
                    loadRejectedTutors();
                    break;
            }
            closeUserDetails(); // Close details if open
        } else {
            showAdminNotification(`Error: ${data.message}`, "error");
        }
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showAdminNotification('Failed to delete user. Please try again.', "error");
    });
}

// Refresh functions for each tab
function refreshUsers() {
    loadUsers();
}

function refreshPendingTutors() {
    loadPendingTutors();
}

function refreshApprovedTutors() {
    loadApprovedTutors();
}

function refreshRejectedTutors() {
    loadRejectedTutors();
}

// Export data
function exportData() {
    showAdminNotification("Export functionality would be implemented here.", "info");
}

// Logout handler for admin
async function adminLogout() {
    const confirmLogout = await showAdminConfirmModal(
        `Confirm Logout`,
        `Are you sure you want to logout from admin panel?`,
        'logout'
    );
    
    if (!confirmLogout) {
        return;
    }
    
    // Clear admin session
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('userType');
    localStorage.removeItem('tutorApprovalStatus');
    
    showAdminNotification("Logged out successfully", "success");
    
    // Redirect to home page
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1500);
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Override the global logout function for admin page
    window.handleLogout = adminLogout;
    window.viewUser = viewUser;
    window.closeUserDetails = closeUserDetails;
    window.viewCourseDetails = viewCourseDetails;
    window.switchTab = switchTab;
    window.approveTutor = approveTutor;
    window.rejectTutor = rejectTutor;
    window.showRejectionModal = showRejectionModal;
    window.viewTutorApplication = viewTutorApplication;
    window.approveRejectedTutor = approveRejectedTutor;
    window.refreshUsers = refreshUsers;
    window.refreshPendingTutors = refreshPendingTutors;
    window.refreshApprovedTutors = refreshApprovedTutors;
    window.refreshRejectedTutors = refreshRejectedTutors;
    
    // Check if user is admin
    if (!checkAdminAccess()) {
        return;
    }
    
    // Load initial data for active tab
    switch(currentTab) {
        case 'users':
            loadUsers();
            break;
        case 'tutor-applications':
            loadPendingTutors();
            break;
        case 'approved-tutors':
            loadApprovedTutors();
            break;
        case 'rejected-tutors':
            loadRejectedTutors();
            break;
    }
    
    checkSystemStatus();
    
    // Set auto-refresh every 60 seconds
    setInterval(() => {
        switch(currentTab) {
            case 'users':
                loadUsers();
                break;
            case 'tutor-applications':
                loadPendingTutors();
                break;
            case 'approved-tutors':
                loadApprovedTutors();
                break;
            case 'rejected-tutors':
                loadRejectedTutors();
                break;
        }
        checkSystemStatus();
    }, 60000);
});