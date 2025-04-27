// Global variables
let eggs = [];
let currentPage = 'home';
let previousPage = '';
let currentEggId = null;

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

// Navigation function
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    document.getElementById(page + 'Page').classList.add('active');
    
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
    const circumference = 2 * Math.PI * 54;
    const dashoffset = circumference - (percent / 100) * circumference;
    
    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = dashoffset;
    
    if (percent < 33) {
        progressCircle.style.stroke = '#8A2BE2'; // Purple for early stage
    } else if (percent < 66) {
        progressCircle.style.stroke = '#4ECDC4'; // Turquoise for middle stage
    } else {
        progressCircle.style.stroke = '#FFD166'; // Amber for final stage
    }
}

// Load eggs from Firebase
async function loadEggs() {
    try {
        const snapshot = await eggsCollection.orderBy('createdAt', 'desc').get();
        eggs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderEggList();
    } catch (error) {
        showToast('Error loading eggs: ' + error.message);
        console.error('Error loading eggs:', error);
    }
}

// Event listeners
addEggButton.addEventListener('click', () => {
    document.getElementById('incubationStart').valueAsDate = new Date();
    navigateTo('addEgg');
});

addFirstEggBtn.addEventListener('click', () => {
    document.getElementById('incubationStart').valueAsDate = new Date();
    navigateTo('addEgg');
});

cancelAddEgg.addEventListener('click', () => {
    navigateTo('home');
});

cancelEditEgg.addEventListener('click', () => {
    navigateTo('eggDetails');
});

// Add new egg with Firebase
addEggForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const weightValue = parseFloat(document.getElementById('eggWeight').value);
    const formattedWeight = weightValue.toFixed(2);
    
    const newEgg = {
        name: document.getElementById('eggName').value,
        type: document.getElementById('eggType').value,
        weight: formattedWeight,
        incubationStart: document.getElementById('incubationStart').value,
        incubationDays: document.getElementById('incubationDays').value,
        highHumidityLoss: document.getElementById('highHumidityLoss').value + '%',
        midHumidityLoss: document.getElementById('midHumidityLoss').value + '%',
        lowHumidityLoss: document.getElementById('lowHumidityLoss').value + '%',
        notes: document.getElementById('eggNotes').value || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        // Add to Firebase
        await eggsCollection.add(newEgg);
        
        showToast('Egg added successfully!');
        navigateTo('home');
        loadEggs();
        addEggForm.reset();
    } catch (error) {
        showToast('Error adding egg: ' + error.message);
        console.error('Error adding egg:', error);
    }
});

// Edit egg button
editEggBtn.addEventListener('click', () => {
    const egg = eggs.find(egg => egg.id === currentEggId);
    
    document.getElementById('editEggId').value = egg.id;
    document.getElementById('editEggName').value = egg.name;
    document.getElementById('editEggType').value = egg.type;
    document.getElementById('editEggWeight').value = egg.weight;
    document.getElementById('editIncubationStart').value = egg.incubationStart;
    document.getElementById('editIncubationDays').value = egg.incubationDays;
    
    // Set humidity loss values if they exist, otherwise use defaults
    if (egg.highHumidityLoss) {
        document.getElementById('editHighHumidityLoss').value = parseFloat(egg.highHumidityLoss);
    }
    if (egg.midHumidityLoss) {
        document.getElementById('editMidHumidityLoss').value = parseFloat(egg.midHumidityLoss);
    }
    if (egg.lowHumidityLoss) {
        document.getElementById('editLowHumidityLoss').value = parseFloat(egg.lowHumidityLoss);
    }
    
    document.getElementById('editEggNotes').value = egg.notes || '';
    
    navigateTo('editEgg');
});

// Save edited egg with Firebase
editEggForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eggId = document.getElementById('editEggId').value;
    const weightValue = parseFloat(document.getElementById('editEggWeight').value);
    const formattedWeight = weightValue.toFixed(2);
    
    const updatedEgg = {
        name: document.getElementById('editEggName').value,
        type: document.getElementById('editEggType').value,
        weight: formattedWeight,
        incubationStart: document.getElementById('editIncubationStart').value,
        incubationDays: document.getElementById('editIncubationDays').value,
        highHumidityLoss: document.getElementById('editHighHumidityLoss').value + '%',
        midHumidityLoss: document.getElementById('editMidHumidityLoss').value + '%',
        lowHumidityLoss: document.getElementById('editLowHumidityLoss').value + '%',
        notes: document.getElementById('editEggNotes').value || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        // Update in Firebase
        await eggsCollection.doc(eggId).update(updatedEgg);
        
        showToast('Egg updated successfully!');
        await loadEggs(); // Reload eggs to get the updated data
        showEggDetails(eggId);
        navigateTo('eggDetails');
    } catch (error) {
        showToast('Error updating egg: ' + error.message);
        console.error('Error updating egg:', error);
    }
});

// Delete egg with Firebase
deleteEggBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this egg?')) {
        try {
            // Delete from Firebase
            await eggsCollection.doc(currentEggId).delete();
            
            showToast('Egg deleted successfully!');
            navigateTo('home');
            loadEggs();
        } catch (error) {
            showToast('Error deleting egg: ' + error.message);
            console.error('Error deleting egg:', error);
        }
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
    
    eggListContainer.innerHTML = '';
    
    eggs.forEach(egg => {
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
    
    // Format weight to always display with 2 decimal places
    const weightFormatted = parseFloat(egg.weight).toFixed(2);
    
    // Update UI with egg details
    document.getElementById('detailEggName').textContent = egg.name;
    document.getElementById('detailEggType').textContent = egg.type;
    document.getElementById('detailEggWeight').textContent = `${weightFormatted} grams`;
    document.getElementById('detailIncubationStart').textContent = formatDate(egg.incubationStart);
    document.getElementById('detailIncubationPeriod').textContent = `${egg.incubationDays} days`;
    document.getElementById('detailHatchDate').textContent = hatchDate;
    document.getElementById('detailProgressText').textContent = `${progress}%`;
    document.getElementById('detailDaysRemaining').textContent = daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Ready to hatch!';
    document.getElementById('detailNotes').textContent = egg.notes || 'No notes added.';
    
    // Update humidity loss rates if they exist
    document.getElementById('detailHighHumidity').textContent = egg.highHumidityLoss || 'Not set';
    document.getElementById('detailMidHumidity').textContent = egg.midHumidityLoss || 'Not set';
    document.getElementById('detailLowHumidity').textContent = egg.lowHumidityLoss || 'Not set';
    
    // Update circular progress
    updateCircularProgress(progress);
    
    navigateTo('eggDetails');
}

// Initialize the app
async function initApp() {
    // Set current date for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incubationStart').value = today;
    
    try {
        // Show loading state
        eggListContainer.innerHTML = '<div class="loading">Loading eggs...</div>';
        
        // Load eggs from Firebase
        await loadEggs();
        
        // Show/hide empty state
        if (eggs.length === 0) {
            eggListContainer.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            eggListContainer.style.display = 'grid';
            emptyState.style.display = 'none';
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error loading eggs. Please try again.');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Add this at the end of app.js
// Make necessary functions and variables available globally
window.db = db;
window.navigateTo = navigateTo;
window.showToast = showToast;
window.loadEggs = loadEggs;
window.showEggDetails = showEggDetails;
window.eggs = eggs;
window.currentEggId = currentEggId;
window.addEggButton = addEggButton;
window.addFirstEggBtn = addFirstEggBtn;
window.backButton = backButton;
window.eggsCollection = eggsCollection;
