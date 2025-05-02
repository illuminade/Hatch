// management.js - JavaScript for settings management page
document.addEventListener('DOMContentLoaded', function() {
    console.log("Settings Management page initializing...");
    
    // DOM Elements
    const backToHomeButton = document.getElementById('backToHomeButton');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const tabContents = document.querySelectorAll('.settings-tab-content');

    // Back button to return to home
    backToHomeButton.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    // Tab switching functionality
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            settingsTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId + 'Tab').classList.add('active');
        });
    });
    
    // Initialize tabs based on URL hash if present
    function initTabFromHash() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const tab = document.querySelector(`.settings-tab[data-tab="${hash}"]`);
            if (tab) {
                tab.click();
            }
        }
    }
    
    // Update hash when tab changes
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            window.location.hash = tabId;
        });
    });
    
    // Initialize
    initTabFromHash();
    
    console.log("Settings Management page initialized");
});
