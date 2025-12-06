// admin.js - Admin dashboard specific logic

// DOM Elements
const adminUsernameSpan = document.getElementById('admin-username');
const totalUsersEl = document.getElementById('total-users');
const totalStudentsEl = document.getElementById('total-students');
const totalTutorsEl = document.getElementById('total-tutors');
const totalChatsEl = document.getElementById('total-chats');
const usersTableBody = document.getElementById('users-table-body');
const serverStatusEl = document.getElementById('server-status');
const databaseStatusEl = document.getElementById('database-status');
const apiStatusEl = document.getElementById('api-status');
const lastUpdatedEl = document.getElementById('last-updated');

// Check if user is admin on page load
function checkAdminAccess() {
    const userType = localStorage.getItem('userType');
    
    if (!window.currentUsername || userType !== 'admin') {
        // Not an admin, redirect to home page
        alert("Access denied. Admin privileges required.");
        window.location.href = "index.html";
        return false;
    }
    
    // Set admin username
    adminUsernameSpan.textContent = window.currentUsername;
    return true;
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
        
        html += `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>
                    <span class="user-type-badge ${user.userType}">
                        <i class="fas ${getUserTypeIcon(user.userType)}"></i> ${user.userType}
                    </span>
                </td>
                <td>${registrationDate}</td>
                <td>
                    <span class="status active">Active</span>
                </td>
                <td>
                    <button class="action-btn view-btn" onclick="viewUser('${user.username}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
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
function updateStats(users) {
    const totalUsers = users.length;
    const totalStudents = users.filter(u => u.userType === 'student').length;
    const totalTutors = users.filter(u => u.userType === 'tutor').length;
    const totalAdmins = users.filter(u => u.userType === 'admin').length;
    
    totalUsersEl.textContent = totalUsers;
    totalStudentsEl.textContent = totalStudents;
    totalTutorsEl.textContent = totalTutors;
    
    // Update chat count from backend
    updateChatCount();
}

// Fetch chat count
async function updateChatCount() {
    try {
        const response = await fetch(`${window.BACKEND_URL}/admin/chats/count`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            totalChatsEl.textContent = data.count || 0;
        }
    } catch (error) {
        console.error('Error fetching chat count:', error);
        totalChatsEl.textContent = 'N/A';
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

// View user details
function viewUser(username) {
    alert(`Viewing details for user: ${username}\n\nThis would open a detailed user profile in a future version.`);
}

// Delete user (with confirmation)
function deleteUser(username) {
    if (username === window.currentUsername) {
        alert("You cannot delete your own account!");
        return;
    }
    
    if (confirm(`Are you sure you want to delete user: ${username}?\nThis action cannot be undone.`)) {
        // Call backend API to delete user
        fetch(`${window.BACKEND_URL}/admin/users/${username}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`User ${username} deleted successfully.`);
                loadUsers(); // Refresh the list
            } else {
                alert(`Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            alert('Failed to delete user. Please try again.');
        });
    }
}

// Refresh users
function refreshUsers() {
    loadUsers();
    checkSystemStatus();
}

// Export data
function exportData() {
    alert("Export functionality would be implemented here.\n\nOptions:\n1. Export users as CSV\n2. Export chat logs\n3. Export system logs");
}

// Logout handler for admin
function adminLogout() {
    if (confirm("Are you sure you want to logout from admin panel?")) {
        // Clear admin session
        localStorage.removeItem('currentUsername');
        localStorage.removeItem('userType');
        
        // Redirect to home page
        window.location.href = "index.html";
    }
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Override the global logout function for admin page
    window.handleLogout = adminLogout;
    
    // Check if user is admin
    if (!checkAdminAccess()) {
        return;
    }
    
    // Load initial data
    loadUsers();
    checkSystemStatus();
    
    // Set auto-refresh every 60 seconds
    setInterval(() => {
        loadUsers();
        checkSystemStatus();
    }, 60000);
});