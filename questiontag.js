// questiontag.js - Specific logic for the Question Bank page (questiontag.html)

// DOM Elements specific to questiontag.html
const questionSearch = document.getElementById('questionSearch');
const gradeSelect = document.getElementById('gradeSelect');
const subjectSelect = document.getElementById('subjectSelect');
const allQuestionCards = document.querySelectorAll('.question-card');

function filterAndSearchQuestions() {
    const searchTerm = questionSearch.value.toLowerCase();
    const selectedGrade = gradeSelect.value;
    const selectedSubject = subjectSelect.value;

    allQuestionCards.forEach(card => {
        const cardGrade = card.closest('.grade-section').querySelector('h2').textContent.includes(selectedGrade === '10th' ? '10th' : '12th');
        const cardSubject = card.getAttribute('data-subject');
        const cardContent = card.querySelector('p').textContent.toLowerCase();
        
        // Grade Match
        const gradeMatch = selectedGrade === 'all' || cardGrade;

        // Subject Match
        const subjectMatch = selectedSubject === 'all' || selectedSubject === cardSubject;

        // Search Match
        const searchMatch = cardContent.includes(searchTerm);

        if (gradeMatch && subjectMatch && searchMatch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function downloadFile(filename, content) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    window.showNotification(`Downloaded: ${filename}`);
}

function downloadAllQuestions(grade) {
    if (!window.currentUsername) {
        alert("Please log in to download the question bank.");
        return;
    }
    
    const gradeElement = document.getElementById(`grade-${grade}-questions`);
    if (!gradeElement) return;

    let allContent = `--- ${grade} Grade Question Bank ---\n\n`;
    
    // Collect content only from visible (filtered) cards
    gradeElement.querySelectorAll('.question-card').forEach(card => {
        if (card.style.display !== 'none') {
            const title = card.querySelector('h4').textContent;
            const content = card.querySelector('p').textContent;
            allContent += `[${title}]\n${content}\n\n`;
        }
    });

    if (allContent.trim() === `--- ${grade} Grade Question Bank ---`) {
        alert(`No questions found for the current filters in ${grade} grade.`);
        return;
    }

    downloadFile(`${grade}_question_bank.txt`, allContent);
}

// Initialization for questiontag.html
document.addEventListener('DOMContentLoaded', () => {
    // Expose functions globally
    window.downloadAllQuestions = downloadAllQuestions;

    if (questionSearch) {
        questionSearch.addEventListener('input', filterAndSearchQuestions);
    }
    if (gradeSelect) {
        gradeSelect.addEventListener('change', filterAndSearchQuestions);
    }
    if (subjectSelect) {
        subjectSelect.addEventListener('change', filterAndSearchQuestions);
    }

    // Individual Download buttons
    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (!window.currentUsername) {
                alert("Please log in to download this question.");
                return;
            }
            const filename = this.getAttribute('data-filename');
            const content = this.getAttribute('data-content');
            downloadFile(filename, content);
        });
    });

    // Apply initial filter
    filterAndSearchQuestions();
});