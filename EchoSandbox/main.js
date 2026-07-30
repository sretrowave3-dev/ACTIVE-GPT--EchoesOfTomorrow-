/**
 * Echo Sandbox — Main Entry Point
 *
 * Bootstraps the Sandbox application by importing the main application
 * class and starting it. Handles errors gracefully and displays
 * startup failures in the overlay.
 */

import { SandboxApplication } from './SandboxApplication.js';

// Create application instance
const app = new SandboxApplication();

// Expose for debugging
window.__sandbox = app;

// Start the application
app.start().catch((error) => {
    console.error('[Sandbox] Fatal startup error:', error);

    // Show error in startup overlay
    const startupMessage = document.getElementById('startupMessage');
    if (startupMessage) {
        startupMessage.textContent = '❌ Startup Failed: ' + error.message;
        startupMessage.style.color = '#ff2244';
    }

    // Update startup bar
    const startupFill = document.getElementById('startupFill');
    if (startupFill) {
        startupFill.style.width = '100%';
        startupFill.style.background = 'linear-gradient(90deg, #ff2244, #ff6600)';
    }
});