// [file name]: course.js
// course.js - Dynamic Course Management with real-time updates

// DOM Elements
const gradeFilter = document.getElementById('gradeFilter');
const subjectFilter = document.getElementById('subjectFilter');
const coursesContainer = document.getElementById('coursesContainer');
const totalCourses = document.getElementById('totalCourses');
const totalTutors = document.getElementById('totalTutors');
const totalVideos = document.getElementById('totalVideos');

// Video Modal Elements
let videoModal = null;
let videoModalContent = null;

// Initialize video modal
function initVideoModal() {
    if (!document.getElementById('videoModal')) {
        const modalHTML = `
            <div id="videoModal" class="modal" style="display: none; z-index: 2000;">
                <div class="modal-content" style="max-width: 800px; background: #fff; padding: 0;">
                    <span class="close-btn" onclick="closeVideoModal()" style="position: absolute; right: 10px; top: 10px; z-index: 2001;">&times;</span>
                    <div id="videoModalContent" style="width: 100%; height: 450px;"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    videoModal = document.getElementById('videoModal');
    videoModalContent = document.getElementById('videoModalContent');
}

// Close video modal
function closeVideoModal() {
    if (videoModal) {
        videoModal.style.display = 'none';
        videoModalContent.innerHTML = '';
    }
}

// Open video modal
function openVideoModal(videoUrl) {
    if (!videoModal) initVideoModal();
    
    videoModalContent.innerHTML = '';
    
    if (isYouTubeUrl(videoUrl)) {
        const videoId = getYouTubeId(videoUrl);
        videoModalContent.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
    } else if (isVimeoUrl(videoUrl)) {
        const videoId = getVimeoId(videoUrl);
        videoModalContent.innerHTML = `
            <iframe 
                src="https://player.vimeo.com/video/${videoId}" 
                width="100%" 
                height="100%" 
                frameborder="0" 
                allow="autoplay; fullscreen; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
    } else if (videoUrl.startsWith('data:') || videoUrl.startsWith('blob:')) {
        // For uploaded videos
        videoModalContent.innerHTML = `
            <video controls style="width: 100%; height: 100%;">
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } else {
        // Generic video player
        videoModalContent.innerHTML = `
            <video controls style="width: 100%; height: 100%;">
                <source src="${videoUrl}" type="video/mp4">
                <a href="${videoUrl}" target="_blank">Open video in new tab</a>
            </video>
        `;
    }
    
    videoModal.style.display = 'flex';
}

// Check if URL is YouTube
function isYouTubeUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

// Get YouTube video ID
function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Check if URL is Vimeo
function isVimeoUrl(url) {
    return url.includes('vimeo.com');
}

// Get Vimeo video ID
function getVimeoId(url) {
    const regExp = /vimeo.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

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
        const filledStars = Math.round(avgRating);
        const stars = '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);
        
        // Calculate chapter ratings
        const chapterRatings = course.chapter_ratings || {};
        
        html += `
            <div class="course-card" data-grade="${course.grade}" data-subject="${course.subject}">
                <h3>${course.title}</h3>
                <p>${course.description || 'No description available'}</p>
                
                <div class="course-meta">
                    <span><i class="fas fa-user"></i> ${course.tutor_username}</span>
                    <span><i class="fas fa-graduation-cap"></i> ${course.grade}</span>
                    <span><i class="fas fa-book"></i> ${course.subject}</span>
                </div>
                
                <div class="rating-stars" style="color: #ffd700; margin: 0.5rem 0;">
                    ${stars} ${avgRating.toFixed(1)} (${course.ratings ? course.ratings.length : 0} ratings)
                </div>
                
                <div class="chapter-list">
                    <strong>Chapters (${course.chapters.length}):</strong>
                    ${course.chapters.slice(0, 3).map((chapter, index) => {
                        const chapterRating = chapterRatings[index] || 0;
                        const chapterStars = '★'.repeat(Math.round(chapterRating)) + '☆'.repeat(5 - Math.round(chapterRating));
                        
                        return `
                        <div class="chapter-item">
                            <strong>Chapter ${index + 1}:</strong> ${chapter.title}
                            ${chapterRating > 0 ? `<div style="color: #ffd700; font-size: 0.9rem;">${chapterStars} ${chapterRating.toFixed(1)}</div>` : ''}
                            <div class="video-list">
                                ${chapter.videos.slice(0, 2).map((video, videoIndex) => `
                                    <div style="margin: 5px 0; display: flex; align-items: center; gap: 10px;">
                                        <button onclick="playVideo('${video}')" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
                                            <i class="fas fa-play"></i> Play Video ${videoIndex + 1}
                                        </button>
                                        <span>${extractVideoTitle(video)}</span>
                                    </div>
                                `).join('')}
                                ${chapter.videos.length > 2 ? `<div><i>+${chapter.videos.length - 2} more videos</i></div>` : ''}
                            </div>
                            ${window.currentUsername ? `
                                <div style="margin-top: 0.5rem;">
                                    <button class="rate-btn" onclick="rateCourse('${course._id}', ${index})" style="background: #f39c12; color: white; border: none; padding: 0.3rem 0.8rem; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin-right: 0.5rem;">
                                        <i class="fas fa-star"></i> Rate This Chapter
                                    </button>
                                    <span style="font-size: 0.8rem; color: #666;">(1-5 stars)</span>
                                </div>
                            ` : ''}
                        </div>
                        `;
                    }).join('')}
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

// Play video
function playVideo(videoUrl) {
    if (!videoUrl || videoUrl.trim() === '') {
        alert('No video URL available');
        return;
    }
    
    // Check if it's a base64 encoded video
    if (videoUrl.startsWith('data:video/')) {
        openVideoModal(videoUrl);
    } else if (videoUrl.startsWith('blob:')) {
        openVideoModal(videoUrl);
    } else if (videoUrl.startsWith('http')) {
        // For external URLs, try to play in modal
        openVideoModal(videoUrl);
    } else {
        // For local file paths or other formats
        alert('This video format is not directly playable. Please download or use the link.');
    }
}

// Extract video title from URL
function extractVideoTitle(url) {
    try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'YouTube Video';
        } else if (url.includes('vimeo.com')) {
            return 'Vimeo Video';
        } else if (url.startsWith('data:video/')) {
            return 'Uploaded Video';
        } else if (url.startsWith('blob:')) {
            return 'Uploaded Video';
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

// Rate course chapter - FIXED VERSION
async function rateCourse(courseId, chapterIndex) {
    if (!window.currentUsername) {
        alert("Please log in to rate courses");
        showLogin('student');
        return;
    }
    
    // Create a custom rating dialog
    const ratingDialog = document.createElement('div');
    ratingDialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    let selectedRating = 0;
    
    ratingDialog.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; text-align: center; min-width: 300px;">
            <h3>Rate Chapter ${chapterIndex + 1}</h3>
            <p>How would you rate this chapter?</p>
            <div id="starRating" style="font-size: 2rem; color: #ddd; margin: 1rem 0; cursor: pointer;">
                ${'★'.repeat(5)}
            </div>
            <div id="ratingText" style="margin: 1rem 0; color: #666;">Select a rating (1-5 stars)</div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="submitRating(${selectedRating}, '${courseId}', ${chapterIndex})" 
                        style="background: #4CAF50; color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 5px; cursor: pointer;">
                    Submit
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: #ff4757; color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 5px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(ratingDialog);
    
    // Add star hover effect
    const stars = ratingDialog.querySelector('#starRating');
    const ratingText = ratingDialog.querySelector('#ratingText');
    
    stars.innerHTML = '★'.repeat(5);
    const starElements = stars.querySelectorAll('span, i') || stars.childNodes;
    
    // Clear existing event listeners
    const newStars = document.createElement('div');
    newStars.id = 'starRating';
    newStars.style.cssText = stars.style.cssText;
    
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('span');
        star.textContent = '★';
        star.style.cursor = 'pointer';
        star.style.color = '#ddd';
        star.dataset.value = i + 1;
        
        star.addEventListener('mouseover', function() {
            const value = parseInt(this.dataset.value);
            highlightStars(value);
            ratingText.textContent = `${value} star${value > 1 ? 's' : ''}`;
        });
        
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            highlightStars(selectedRating);
            ratingText.textContent = `You selected ${selectedRating} star${selectedRating > 1 ? 's' : ''}`;
            
            // Update submit button
            const submitBtn = ratingDialog.querySelector('button');
            submitBtn.setAttribute('onclick', `submitRating(${selectedRating}, '${courseId}', ${chapterIndex})`);
        });
        
        newStars.appendChild(star);
    }
    
    stars.replaceWith(newStars);
    
    function highlightStars(count) {
        const stars = newStars.querySelectorAll('span');
        stars.forEach((star, index) => {
            star.style.color = index < count ? '#ffd700' : '#ddd';
        });
    }
}

// Submit rating
async function submitRating(rating, courseId, chapterIndex) {
    if (rating < 1 || rating > 5) {
        alert("Please select a rating between 1 and 5 stars");
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
                rating: rating
            })
        });
        
        const result = await response.json();
        
        // Remove rating dialog
        const dialog = document.querySelector('div[style*="position: fixed"][style*="background: rgba"]');
        if (dialog) dialog.remove();
        
        if (result.success) {
            alert("Thank you for your rating!");
            loadCourses(); // Refresh to show updated ratings
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
    
    // Initialize video modal
    initVideoModal();
    
    // Expose functions globally
    window.enrollCourse = enrollCourse;
    window.loadCourses = loadCourses;
    window.filterCourses = filterCourses;
    window.rateCourse = rateCourse;
    window.submitRating = submitRating;
    window.deleteCourse = deleteCourse;
    window.loadMyUploads = loadMyUploads;
    window.playVideo = playVideo;
    window.openVideoModal = openVideoModal;
    window.closeVideoModal = closeVideoModal;

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
    
    // Close video modal when clicking outside
    window.addEventListener('click', (event) => {
        if (videoModal && event.target === videoModal) {
            closeVideoModal();
        }
    });
});