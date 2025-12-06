// course.js - Specific logic for the Course page (course.html)

// DOM Elements specific to course.html
const gradeFilter = document.getElementById('gradeFilter');
const subjectFilter = document.getElementById('subjectFilter');
const coursesContainer = document.querySelector('.courses-container');
const courseCards = document.querySelectorAll('.course-card');

function filterCourses() {
    const selectedGrade = gradeFilter.value;
    const selectedSubject = subjectFilter.value;

    courseCards.forEach(card => {
        const cardGrade = card.getAttribute('data-grade');
        const cardSubject = card.getAttribute('data-subject');
        
        const gradeMatch = selectedGrade === 'all' || selectedGrade === cardGrade;
        const subjectMatch = selectedSubject === 'all' || selectedSubject === cardSubject;

        if (gradeMatch && subjectMatch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function enrollCourse(courseName) {
    // currentUsername comes from common.js via window scope
    if (!window.currentUsername) {
        alert("Please log in to enroll in a course.");
        return;
    }
    // Placeholder for actual enrollment logic (e.g., calling an API)
    alert(`Enrolling ${window.currentUsername} in: ${courseName}! (This is a placeholder action)`);
}


// Initialization for course.html
document.addEventListener('DOMContentLoaded', () => {
    // Expose function globally
    window.enrollCourse = enrollCourse;

    if (gradeFilter) {
        gradeFilter.addEventListener('change', filterCourses);
    }
    if (subjectFilter) {
        subjectFilter.addEventListener('change', filterCourses);
    }

    // Apply initial filter on load
    filterCourses();
});