import { Bootstrap } from './framework/core/Bootstrap.js';

// Boot the Echo Engine Framework
Bootstrap.start().catch((err) => {
    console.error('Failed to start Echo Engine:', err);
});