// [file name]: questiontag.js
// questiontag.js - Dynamic Question Management for questiontag.html

// DOM Elements
const questionSearch = document.getElementById('questionSearch');
const gradeSelect = document.getElementById('gradeSelect');
const subjectSelect = document.getElementById('subjectSelect');
const questionsContainer = document.getElementById('questionsContainer');
const totalQuestionsSpan = document.getElementById('totalQuestions');

// Load questions from backend
async function loadQuestions() {
    try {
        questionsContainer.innerHTML = '<p class="loading">Loading questions...</p>';
        
        const response = await fetch(window.BACKEND_URL + '/questions');
        const result = await response.json();
        
        if (result.success) {
            displayQuestions(result.questions);
            updateQuestionStats(result.questions);
        } else {
            questionsContainer.innerHTML = '<p class="no-data">Failed to load questions</p>';
        }
    } catch (error) {
        console.error("Error loading questions:", error);
        questionsContainer.innerHTML = '<p class="no-data">Failed to load questions</p>';
    }
}

// Display questions with filtering
function displayQuestions(questions) {
    const searchTerm = questionSearch ? questionSearch.value.toLowerCase() : '';
    const selectedGrade = gradeSelect ? gradeSelect.value : 'all';
    const selectedSubject = subjectSelect ? subjectSelect.value : 'all';
    
    // Filter questions
    const filteredQuestions = questions.filter(question => {
        const gradeMatch = selectedGrade === 'all' || selectedGrade === question.grade;
        const subjectMatch = selectedSubject === 'all' || selectedSubject === question.subject;
        const searchMatch = !searchTerm || 
            question.question.toLowerCase().includes(searchTerm) ||
            (question.title && question.title.toLowerCase().includes(searchTerm));
        
        return gradeMatch && subjectMatch && searchMatch;
    });
    
    if (filteredQuestions.length === 0) {
        questionsContainer.innerHTML = '<p class="no-data">No questions found for the selected filters</p>';
        return;
    }
    
    // Group by grade
    const questionsByGrade = {
        '10th': filteredQuestions.filter(q => q.grade === '10th'),
        '12th': filteredQuestions.filter(q => q.grade === '12th')
    };
    
    let html = '';
    
    // Display 10th grade questions
    if (questionsByGrade['10th'].length > 0) {
        html += `
            <div class="grade-section">
                <div class="grade-header">
                    <h2><i class="fas fa-graduation-cap"></i> 10th Grade Questions</h2>
                   
                </div>
                <div class="questions-grid">
        `;
        
        questionsByGrade['10th'].forEach((question, index) => {
            html += createQuestionCard(question, index);
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Display 12th grade questions
    if (questionsByGrade['12th'].length > 0) {
        html += `
            <div class="grade-section">
                <div class="grade-header">
                    <h2><i class="fas fa-graduation-cap"></i> 12th Grade Questions</h2>
                   
                </div>
                <div class="questions-grid">
        `;
        
        questionsByGrade['12th'].forEach((question, index) => {
            html += createQuestionCard(question, index + questionsByGrade['10th'].length);
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    questionsContainer.innerHTML = html;
    
    // Add animation observer
    setTimeout(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.question-card').forEach(card => {
            observer.observe(card);
        });
    }, 100);
}

// Create question card HTML
function createQuestionCard(question, index) {
    const difficultyClass = question.difficulty || 'medium';
    const chapter = question.chapter || 'Not specified';
    const tutorName = question.tutor_username || 'Unknown Tutor';
    
    return `
        <div class="question-card" data-subject="${question.subject}" data-grade="${question.grade}">
            <div class="question-header">
                <h4>Q${index + 1}: ${question.title || 'Question'}</h4>
                <span class="difficulty ${difficultyClass}">${difficultyClass.charAt(0).toUpperCase() + difficultyClass.slice(1)}</span>
            </div>
            <p>${question.question.substring(0, 150)}${question.question.length > 150 ? '...' : ''}</p>
            <div class="question-footer">
                <button class="download-btn" onclick="downloadQuestionFile('${question._id}')">
                    <i class="fas fa-download"></i> Download
                </button>
                ${window.currentUsername && window.userType === 'tutor' && question.tutor_username === window.currentUsername ? `
                    <button class="delete-btn" onclick="deleteQuestion('${question._id}')" style="background: #ff4757; color: white; padding: 0.5rem 1rem; border: none; border-radius: 5px; cursor: pointer; margin-left: 0.5rem;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                ` : ''}
                <span class="question-meta">${question.subject} | ${chapter} | By: ${tutorName}</span>
            </div>
        </div>
    `;
}

// Update question stats
function updateQuestionStats(questions) {
    totalQuestionsSpan.textContent = questions.length;
    
    // Count by grade
    const grade10Count = questions.filter(q => q.grade === '10th').length;
    const grade12Count = questions.filter(q => q.grade === '12th').length;
    
    // Count by subject
    const subjects = {};
    questions.forEach(q => {
        subjects[q.subject] = (subjects[q.subject] || 0) + 1;
    });
    
    console.log(`Question Stats: Total=${questions.length}, 10th=${grade10Count}, 12th=${grade12Count}`);
}

// Download all questions for a grade
function downloadAllQuestions(grade) {
    if (!window.currentUsername) {
        alert("Please log in to download question banks.");
        return;
    }
    
    fetch(window.BACKEND_URL + '/questions')
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const gradeQuestions = result.questions.filter(q => q.grade === grade);
                
                if (gradeQuestions.length === 0) {
                    alert(`No questions found for ${grade} grade.`);
                    return;
                }
                
                let allContent = `--- ${grade} Grade Question Bank ---\n\n`;
                
                gradeQuestions.forEach((question, index) => {
                    allContent += `Question ${index + 1}: ${question.title || 'Untitled'}\n`;
                    allContent += `Subject: ${question.subject}\n`;
                    allContent += `Difficulty: ${question.difficulty}\n`;
                    allContent += `Chapter: ${question.chapter || 'Not specified'}\n`;
                    allContent += `Uploaded by: ${question.tutor_username}\n\n`;
                    allContent += `${question.question}\n\n`;
                    allContent += '-' .repeat(50) + '\n\n';
                });
                
                window.downloadFile(`${grade}_question_bank.txt`, allContent);
            } else {
                alert("Failed to load questions for download.");
            }
        })
        .catch(error => {
            console.error("Download error:", error);
            alert("Failed to download question bank.");
        });
}

// Filter and search questions
function filterAndSearchQuestions() {
    loadQuestions();
}

// Initialization for questiontag.html
document.addEventListener('DOMContentLoaded', () => {
    // Expose functions globally
    window.downloadAllQuestions = downloadAllQuestions;
    window.loadQuestions = loadQuestions;
    window.filterAndSearchQuestions = filterAndSearchQuestions;

    // Add event listeners for filters
    if (questionSearch) {
        questionSearch.addEventListener('input', filterAndSearchQuestions);
    }
    if (gradeSelect) {
        gradeSelect.addEventListener('change', filterAndSearchQuestions);
    }
    if (subjectSelect) {
        subjectSelect.addEventListener('change', filterAndSearchQuestions);
    }

    // Load initial questions
    loadQuestions();
    
    // Listen for login/logout events
    window.addEventListener('loginStateChange', function() {
        if (window.currentUsername && window.userType === 'tutor') {
            document.getElementById('tutorQuestionUploadBtn').style.display = 'block';
            window.loadMyQuestionUploads();
        } else {
            document.getElementById('tutorQuestionUploadBtn').style.display = 'none';
            document.getElementById('tutorUploadForm').style.display = 'none';
            document.getElementById('myQuestionUploads').style.display = 'none';
        }
        loadQuestions();
    });
});

// Trigger login state change event when user logs in/out
const originalUpdateLoginUI = window.updateLoginUI;
window.updateLoginUI = function() {
    originalUpdateLoginUI();
    window.dispatchEvent(new Event('loginStateChange'));
};