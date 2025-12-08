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
        
        // Don't show eye icon for admin users
        const viewButton = user.userType === 'admin' ? '' : `
            <button class="action-btn view-btn" onclick="viewUser('${user.username}')" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        `;
        
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
            alert(`User ${username} not found`);
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
        alert('Failed to load user details');
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
        
        let html = `
            <div class="user-info-card">
                <h4><i class="fas fa-chalkboard-teacher"></i> Tutor Information</h4>
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Account Created:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span class="status active">Active</span></p>
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
            alert('Course not found');
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
        alert('Failed to load course details');
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
            </ul>
        </div>
    `;
}

// Close user details section
function closeUserDetails() {
    document.getElementById('user-details-section').style.display = 'none';
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
                closeUserDetails(); // Close details if open
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
    window.viewUser = viewUser;
    window.closeUserDetails = closeUserDetails;
    window.viewCourseDetails = viewCourseDetails;
    
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