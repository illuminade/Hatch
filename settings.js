// settings.js - Handles settings navigation and UI
document.addEventListener('DOMContentLoaded', function() {
    // Add navigation to settings page
    function initializeSettings() {
        console.log("Initializing settings navigation...");
        
        // Get the existing settings link
        const settingsLink = document.getElementById('settingsLink');
        
        if (settingsLink) {
            console.log("Settings link found, adding event listener");
            // Add event listener to the existing link
            settingsLink.addEventListener('click', function(e) {
                console.log("Settings link clicked");
                e.preventDefault();
                
                // Hide all pages
                document.querySelectorAll('.page').forEach(p => {
                    p.classList.remove('active');
                });
                
                // Show egg management page
                document.getElementById('eggManagementPage').classList.add('active');
                document.getElementById('backButton').style.display = 'flex';
                document.getElementById('addEggButton').style.display = 'none';
                
                // Update current page
                window.previousPage = window.currentPage;
                window.currentPage = 'eggManagement';
                
                // Trigger event to load egg types (will be handled by eggTypes.js)
                const event = new CustomEvent('loadEggTypes');
                document.dispatchEvent(event);
            });
        } else {
            console.error("Settings link not found in the DOM");
        }
        
        // Back button behavior for egg management page
        const backButton = document.getElementById('backButton');
        const originalBackButtonClick = backButton.onclick;
        
        backButton.onclick = function() {
            if (window.currentPage === 'eggManagement') {
                // Hide all pages
                document.querySelectorAll('.page').forEach(p => {
                    p.classList.remove('active');
                });
                
                // Show home page
                document.getElementById('homePage').classList.add('active');
                document.getElementById('backButton').style.display = 'none';
                document.getElementById('addEggButton').style.display = 'flex';
                
                // Update current page
                window.previousPage = window.currentPage;
                window.currentPage = 'home';
            } else if (originalBackButtonClick) {
                // Use original behavior for other pages
                originalBackButtonClick();
            }
        };
    }
    
    // Initialize settings functionality
    initializeSettings();
    console.log("Settings navigation initialized");
});
