// Store eggs in local storage
let eggs = JSON.parse(localStorage.getItem('hatch_eggs')) || [];

// DOM Elements
const homePage = document.getElementById('homePage');
const addEggPage = document.getElementById('addEggPage');
const eggDetailsPage = document.getElementById('eggDetailsPage');
const editEggPage = document.getElementById('editEggPage');
const backButton = document.getElementById('backButton');
const eggListContainer = document.getElementById('eggListContainer');
const emptyState = document.getElementById('emptyState');
const addEggButton = document.getElementById('addEggButton');
const addFirstEggBtn = document.getElementById('addFirstEggBtn');
const addEggForm = document.getElementById('addEggForm');
const cancelAddEgg = document.getElementById('cancelAddEgg');
const editEggForm = document.getElementById('editEggForm');
const cancelEditEgg = document.getElementById('cancelEditEgg');
const editEggBtn = document.getElementById('editEggBtn');
const deleteEggBtn = document.getElementById('deleteEggBtn');
const toast = document.getElementById('toast');
const progressCircle = document.getElementById('progressCircle');

// Navigation
let currentPage = 'home';
let previousPage = '';
let currentEggId = null;

// Navigation function
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Show the target page
    document.getElementById(page + 'Page').classList.add('active');
    
    // Update back button visibility
    if (page === 'home') {
        backButton.style.display = 'none';
        addEggButton.style.display = 'flex';
    } else {
        backButton.style.display = 'flex';
        if (page === 'addEgg' || page === 'editEgg') {
            addEggButton.style.display = 'none';
        } else {
            addEggButton.style.display = 'flex';
        }
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    previousPage = currentPage;
    currentPage = page;
}

// Go back to previous page
backButton.addEventListener('click', () => {
    if (currentPage === 'eggDetails') {
        navigateTo('home');
    } else if (currentPage === 'addEgg') {
        navigateTo('home');
    } else if (currentPage === 'editEgg') {
        navigateTo('eggDetails');
    }
});

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Calculate incubation progress
function calculateProgress(startDate, durationDays) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(durationDays));
    
    const today = new Date();
    const totalDuration = end - start;
    const elapsed = today - start;
    
    let progress = Math.round((elapsed / totalDuration) * 100);
    
    // Cap progress between 0% and 100%
    progress = Math.max(0, Math.min(100, progress));
    
    return progress;
}

// Calculate days remaining
function calculateDaysRemaining(startDate, durationDays) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(durationDays));
    
    const today = new Date();
    const daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    
    return daysRemaining > 0 ? daysRemaining : 0;
}

// Calculate expected hatch date
function calculateHatchDate(startDate, durationDays) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(durationDays));
    return formatDate(end);
}

// Show toast message
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Update the circular progress display in the details view
function updateCircularProgress(percent) {
    // Circle circumference calculation (2πr)
    const circumference = 2 * Math.PI * 54;
    
    // Calculate the dashoffset value based on percentage
    const dashoffset = circumference - (percent / 100) * circumference;
    
    // Update the dasharray and dashoffset properties
    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = dashoffset;
    
    // Change the color based on progress
    if (percent < 33) {
        progressCircle.style.stroke = '#8A2BE2'; // Purple for early stage
    } else if (percent < 66) {
        progressCircle.style.stroke = '#4ECDC4'; // Turquoise for middle stage
    } else {
        progressCircle.style.stroke = '#FFD166'; // Amber for final stage
    }
}

// Add event listeners
addEggButton.addEventListener('click', () => {
    // Set today's date as default
    document.getElementById('incubationStart').valueAsDate = new Date();
    navigateTo('addEgg');
});

addFirstEggBtn.addEventListener('click', () => {
    // Set today's date as default
    document.getElementById('incubationStart').valueAsDate = new Date();
    navigateTo('addEgg');
});

cancelAddEgg.addEventListener('click', () => {
    navigateTo('home');
});

cancelEditEgg.addEventListener('click', () => {
    navigateTo('eggDetails');
});

// Add new egg
addEggForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newEgg = {
        id: generateId(),
        name: document.getElementById('eggName').value,
        type: document.getElementById('eggType').value,
        weight: document.getElementById('eggWeight').value,
        incubationStart: document.getElementById('incubationStart').value,
        incubationDays: document.getElementById('incubationDays').value,
        notes: document.getElementById('eggNotes').value || '',
        createdAt: new Date().toISOString()
    };
    
    eggs.push(newEgg);
    localStorage.setItem('hatch_eggs', JSON.stringify(eggs));
    
    showToast('Egg added successfully!');
    navigateTo('home');
    renderEggList();
    addEggForm.reset();
});

// Edit egg
editEggBtn.addEventListener('click', () => {
    const egg = eggs.find(egg => egg.id === currentEggId);
    
    document.getElementById('editEggId').value = egg.id;
    document.getElementById('editEggName').value = egg.name;
    document.getElementById('editEggType').value = egg.type;
    document.getElementById('editEggWeight').value = egg.weight;
    document.getElementById('editIncubationStart').value = egg.incubationStart;
    document.getElementById('editIncubationDays').value = egg.incubationDays;
    document.getElementById('editEggNotes').value = egg.notes;
    
    navigateTo('editEgg');
});

// Save edited egg
editEggForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const eggId = document.getElementById('editEggId').value;
    const eggIndex = eggs.findIndex(egg => egg.id === eggId);
    
    if (eggIndex !== -1) {
        eggs[eggIndex] = {
            ...eggs[eggIndex],
            name: document.getElementById('editEggName').value,
            type: document.getElementById('editEggType').value,
            weight: document.getElementById('editEggWeight').value,
            incubationStart: document.getElementById('editIncubationStart').value,
            incubationDays: document.getElementById('editIncubationDays').value,
            notes: document.getElementById('editEggNotes').value || '',
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('hatch_eggs', JSON.stringify(eggs));
        
        showToast('Egg updated successfully!');
        showEggDetails(eggId);
        navigateTo('eggDetails');
    }
});

// Delete egg
deleteEggBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this egg?')) {
        eggs = eggs.filter(egg => egg.id !== currentEggId);
        localStorage.setItem('hatch_eggs', JSON.stringify(eggs));
        
        showToast('Egg deleted successfully!');
        navigateTo('home');
        renderEggList();
    }
});

// Render egg list
function renderEggList() {
    if (eggs.length === 0) {
        eggListContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    eggListContainer.style.display = 'grid';
    emptyState.style.display = 'none';
    
    // Sort eggs by creation date (newest first)
    const sortedEggs = [...eggs].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    eggListContainer.innerHTML = '';
    
    sortedEggs.forEach(egg => {
        const progress = calculateProgress(egg.incubationStart, egg.incubationDays);
        
        const eggCard = document.createElement('div');
        eggCard.className = 'egg-card';
        eggCard.dataset.id = egg.id;
        
        eggCard.innerHTML = `
            <div class="egg-icon">
                <i class="fas fa-egg"></i>
            </div>
            <div class="egg-details">
                <div class="egg-name">${egg.name}</div>
                <div class="egg-type">${egg.type}</div>
                <div class="egg-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">${progress}%</div>
                </div>
            </div>
        `;
        
        eggCard.addEventListener('click', () => {
            showEggDetails(egg.id);
        });
        
        eggListContainer.appendChild(eggCard);
    });
}

// Show egg details
function showEggDetails(eggId) {
    const egg = eggs.find(egg => egg.id === eggId);
    
    if (!egg) {
        navigateTo('home');
        return;
    }
    
    currentEggId = eggId;
    
    const progress = calculateProgress(egg.incubationStart, egg.incubationDays);
    const daysRemaining = calculateDaysRemaining(egg.incubationStart, egg.incubationDays);
    const hatchDate = calculateHatchDate(egg.incubationStart, egg.incubationDays);
    
    // Update UI with egg details
    document.getElementById('detailEggName').textContent = egg.name;
    document.getElementById('detailEggType').textContent = egg.type;
    document.getElementById('detailEggWeight').textContent = `${egg.weight} grams`;
    document.getElementById('detailIncubationStart').textContent = formatDate(egg.incubationStart);
    document.getElementById('detailIncubationPeriod').textContent = `${egg.incubationDays} days`;
    document.getElementById('detailHatchDate').textContent = hatchDate;
    document.getElementById('detailProgressText').textContent = `${progress}%`;
    document.getElementById('detailDaysRemaining').textContent = daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Ready to hatch!';
    document.getElementById('detailNotes').textContent = egg.notes || 'No notes added.';
    
    // Update circular progress
    updateCircularProgress(progress);
    
    navigateTo('eggDetails');
}

// Initialize the app
function initApp() {
    // Set current date for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incubationStart').value = today;
    
    // Render egg list
    renderEggList();
    
    // Show/hide empty state
    if (eggs.length === 0) {
        eggListContainer.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        eggListContainer.style.display = 'grid';
        emptyState.style.display = 'none';
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);