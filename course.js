// [file name]: course.js
// course.js - Dynamic Course Management with real-time updates

// DOM Elements
const gradeFilter = document.getElementById('gradeFilter');
const subjectFilter = document.getElementById('subjectFilter');
const coursesContainer = document.getElementById('coursesContainer');
const totalCourses = document.getElementById('totalCourses');
const totalTutors = document.getElementById('totalTutors');
const totalVideos = document.getElementById('totalVideos');

// Load courses from backend
async function loadCourses() {
    try {
        coursesContainer.innerHTML = '<p class="loading">Loading courses...</p>';
        
        const response = await fetch(window.BACKEND_URL + '/courses');
        const result = await response.json();
        
        if (result.success) {
            displayCourses(result.courses);
            updateStats(result.courses);
        } else {
            coursesContainer.innerHTML = '<p class="no-data">Failed to load courses</p>';
        }
    } catch (error) {
        console.error("Error loading courses:", error);
        coursesContainer.innerHTML = '<p class="no-data">Failed to load courses</p>';
    }
}

// Display courses with filtering
function displayCourses(courses) {
    const selectedGrade = gradeFilter ? gradeFilter.value : 'all';
    const selectedSubject = subjectFilter ? subjectFilter.value : 'all';
    
    // Filter courses
    const filteredCourses = courses.filter(course => {
        const gradeMatch = selectedGrade === 'all' || selectedGrade === course.grade;
        const subjectMatch = selectedSubject === 'all' || selectedSubject === course.subject;
        return gradeMatch && subjectMatch;
    });
    
    if (filteredCourses.length === 0) {
        coursesContainer.innerHTML = '<p class="no-data">No courses found for the selected filters</p>';
        return;
    }
    
    let html = '';
    
    filteredCourses.forEach(course => {
        // Generate stars for rating
        const avgRating = course.avg_rating || 0;
        const stars = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));
        
        html += `
            <div class="course-card" data-grade="${course.grade}" data-subject="${course.subject}">
                <h3>${course.title}</h3>
                <p>${course.description || 'No description available'}</p>
                
                <div class="course-meta">
                    <span><i class="fas fa-user"></i> ${course.tutor_username}</span>
                    <span><i class="fas fa-graduation-cap"></i> ${course.grade}</span>
                    <span><i class="fas fa-book"></i> ${course.subject}</span>
                </div>
                
                <div class="rating-stars">
                    ${stars} (${course.ratings ? course.ratings.length : 0} ratings)
                </div>
                
                <div class="chapter-list">
                    <strong>Chapters (${course.chapters.length}):</strong>
                    ${course.chapters.slice(0, 3).map((chapter, index) => `
                        <div class="chapter-item">
                            <strong>Chapter ${index + 1}:</strong> ${chapter.title}
                            <div class="video-list">
                                ${chapter.videos.slice(0, 2).map(video => `
                                    <div><i class="fas fa-play-circle"></i> ${extractVideoTitle(video)}</div>
                                `).join('')}
                                ${chapter.videos.length > 2 ? `<div><i>+${chapter.videos.length - 2} more videos</i></div>` : ''}
                            </div>
                            ${window.currentUsername ? `
                                <button class="rate-btn" onclick="rateCourse('${course._id}', ${index})" style="background: #f39c12; color: white; border: none; padding: 0.3rem 0.8rem; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin-top: 0.5rem;">
                                    <i class="fas fa-star"></i> Rate
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                    ${course.chapters.length > 3 ? `<div><strong>+${course.chapters.length - 3} more chapters</strong></div>` : ''}
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    ${window.currentUsername ? `
                        <button class="course-btn" onclick="enrollCourse('${course._id}')" style="flex: 2;">
                            <i class="fas fa-book-open"></i> Enroll Now
                        </button>
                    ` : `
                        <button class="course-btn" onclick="showLogin('student')" style="flex: 2;">
                            <i class="fas fa-sign-in-alt"></i> Login to Enroll
                        </button>
                    `}
                    
                    ${window.currentUsername && window.userType === 'tutor' && course.tutor_username === window.currentUsername ? `
                        <button class="delete-btn" onclick="deleteCourse('${course._id}')" style="flex: 1; background: #ff4757; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    coursesContainer.innerHTML = html;
    
    // Add animation observer
    setTimeout(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.course-card').forEach(card => {
            observer.observe(card);
        });
    }, 100);
}

// Extract video title from URL
function extractVideoTitle(url) {
    try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'YouTube Video';
        } else if (url.includes('vimeo.com')) {
            return 'Vimeo Video';
        } else {
            // Extract filename from URL
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
            return filename || 'Video';
        }
    } catch (e) {
        return 'Video';
    }
}

// Update stats
function updateStats(courses) {
    const total = courses.length;
    const totalVideosCount = courses.reduce((sum, course) => sum + course.total_videos, 0);
    
    // Count unique tutors
    const uniqueTutors = new Set(courses.map(course => course.tutor_username));
    const tutorsCount = uniqueTutors.size;
    
    if (totalCourses) totalCourses.textContent = total;
    if (totalTutors) totalTutors.textContent = tutorsCount;
    if (totalVideos) totalVideos.textContent = totalVideosCount;
}

// Enroll in course
async function enrollCourse(courseId) {
    if (!window.currentUsername) {
        showLogin('student');
        return;
    }
    
    try {
        const response = await fetch(window.BACKEND_URL + '/courses/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: window.currentUsername,
                course_id: courseId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Successfully enrolled in the course!`);
            loadCourses(); // Refresh to show updated enrollment
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Enrollment error:", error);
        alert("Failed to enroll in course");
    }
}

// Filter courses
function filterCourses() {
    loadCourses();
}

// Rate course chapter
async function rateCourse(courseId, chapterIndex) {
    if (!window.currentUsername) {
        alert("Please log in to rate courses");
        return;
    }
    
    const rating = prompt(`Rate Chapter ${chapterIndex + 1} (1-5 stars):`);
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
        alert("Please enter a valid rating between 1 and 5");
        return;
    }
    
    try {
        const response = await fetch(window.BACKEND_URL + '/courses/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: window.currentUsername,
                course_id: courseId,
                chapter: chapterIndex,
                rating: parseFloat(rating)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert("Thank you for your rating!");
            loadCourses();
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Rating error:", error);
        alert("Failed to submit rating");
    }
}

// Delete course (for tutor)
async function deleteCourse(courseId) {
    if (!confirm("Are you sure you want to delete this course?")) return;
    
    try {
        const response = await fetch(window.BACKEND_URL + `/tutor/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: window.currentUsername })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert("Course deleted successfully!");
            loadCourses();
            if (window.loadMyUploads) {
                window.loadMyUploads();
            }
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete course");
    }
}

// 新增：加载导师上传的课程
async function loadMyUploads() {
    if (!window.currentUsername || window.userType !== 'tutor') return;
    
    try {
        const response = await fetch(window.BACKEND_URL + '/courses');
        const result = await response.json();
        
        if (result.success) {
            const myUploadsDiv = document.getElementById('myUploads');
            if (!myUploadsDiv) return;
            
            const myCourses = result.courses.filter(course => 
                course.tutor_username === window.currentUsername
            );
            
            if (myCourses.length > 0) {
                myUploadsDiv.style.display = 'block';
                let html = '<h2><i class="fas fa-list"></i> My Uploaded Courses</h2>';
                html += '<div style="display: flex; flex-wrap: wrap; gap: 1rem;">';
                
                myCourses.forEach(course => {
                    html += `
                        <div class="upload-item">
                            <button class="delete-upload" onclick="deleteCourse('${course._id}')">
                                <i class="fas fa-times"></i>
                            </button>
                            <h4>${course.title}</h4>
                            <p>${course.subject} - ${course.grade}</p>
                            <small>${course.chapters.length} chapters, ${course.total_videos} videos</small>
                            <br>
                            <small>Uploaded: ${new Date(course.created_at).toLocaleDateString()}</small>
                        </div>
                    `;
                });
                
                html += '</div>';
                myUploadsDiv.innerHTML = html;
            } else {
                myUploadsDiv.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error loading my uploads:", error);
    }
}

// Initialization for course.html
document.addEventListener('DOMContentLoaded', () => {
    console.log('Course.js initialized');
    
    // Expose functions globally
    window.enrollCourse = enrollCourse;
    window.loadCourses = loadCourses;
    window.filterCourses = filterCourses;
    window.rateCourse = rateCourse;
    window.deleteCourse = deleteCourse;
    window.loadMyUploads = loadMyUploads;

    if (gradeFilter) {
        gradeFilter.addEventListener('change', filterCourses);
    }
    if (subjectFilter) {
        subjectFilter.addEventListener('change', filterCourses);
    }

    // Load initial courses
    loadCourses();
    
    // 立即检查导师状态并加载上传内容
    if (window.currentUsername && window.userType === 'tutor') {
        console.log('Tutor is logged in, loading my uploads');
        loadMyUploads();
    }
    
    // Listen for login/logout events
    window.addEventListener('loginStateChange', function(event) {
        console.log('Course.js: Login state changed', event.detail);
        
        // 更新全局变量
        if (event.detail) {
            window.currentUsername = event.detail.username;
            window.userType = event.detail.userType;
        }
        
        // 重新加载课程
        loadCourses();
        
        // 如果是导师，加载上传内容
        if (window.currentUsername && window.userType === 'tutor') {
            console.log('Tutor logged in, loading my uploads');
            loadMyUploads();
        }
    });
});