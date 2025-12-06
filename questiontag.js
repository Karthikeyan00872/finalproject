// questiontag.js - Specific logic for the Question Bank page (questiontag.html)

// DOM Elements specific to questiontag.html
const questionSearch = document.getElementById('questionSearch');
const gradeSelect = document.getElementById('gradeSelect');
const subjectSelect = document.getElementById('subjectSelect');
// Note: We need to re-query for cards to ensure dynamic changes are captured if any
// But for this static HTML, we can use the initial query.
const allQuestionCards = document.querySelectorAll('.question-card');

function filterAndSearchQuestions() {
    const searchTerm = questionSearch.value.toLowerCase();
    const selectedGrade = gradeSelect.value;
    const selectedSubject = subjectSelect.value;

    allQuestionCards.forEach(card => {
        // Determine the grade of the card's section
        // This logic is fragile; a better approach is to add a data-grade attribute to the card itself
        // Based on the HTML, we extract it from the closest grade-section h2.
        const sectionHeader = card.closest('.grade-section').querySelector('h2').textContent;
        const cardGrade = sectionHeader.includes('10th') ? '10th' : (sectionHeader.includes('12th') ? '12th' : 'other');
        
        const cardSubject = card.getAttribute('data-subject');
        const cardContent = card.querySelector('p').textContent.toLowerCase();
        
        // Grade Match
        const gradeMatch = selectedGrade === 'all' || selectedGrade === cardGrade;

        // Subject Match
        const subjectMatch = selectedSubject === 'all' || selectedSubject === cardSubject;

        // Search Match (Check question content)
        const searchMatch = cardContent.includes(searchTerm);

        if (gradeMatch && subjectMatch && searchMatch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function downloadAllQuestions(grade) {
    if (!window.currentUsername) {
        alert("Please log in to download question banks.");
        return;
    }
    
    // Find all visible cards for the specified grade
    let allContent = `--- ${grade} Grade Question Bank ---\n\n`;

    document.querySelectorAll('.question-card').forEach(card => {
        // Check if the card is visible and belongs to the specified grade's section
        const sectionHeader = card.closest('.grade-section').querySelector('h2').textContent;
        const cardGrade = sectionHeader.includes('10th') ? '10th' : (sectionHeader.includes('12th') ? '12th' : 'other');

        // Only include questions from the correct grade AND that are currently visible
        if (card.style.display !== 'none' && cardGrade === grade) {
            const title = card.querySelector('h4').textContent;
            const content = card.querySelector('p').textContent;
            allContent += `[${title}]\n${content}\n\n`;
        }
    });

    if (allContent.trim() === `--- ${grade} Grade Question Bank ---`) {
        alert(`No questions found for the current filters in ${grade} grade.`);
        return;
    }

    // downloadFile is from common.js
    window.downloadFile(`${grade}_question_bank.txt`, allContent);
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

    // Individual Download buttons (uses downloadFile from common.js)
    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (!window.currentUsername) {
                alert("Please log in to download this question.");
                return;
            }
            const filename = this.getAttribute('data-filename');
            const content = this.getAttribute('data-content');
            window.downloadFile(filename, content);
        });
    });

    // Apply initial filter
    filterAndSearchQuestions();
});