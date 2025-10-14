// middleware/security.middleware.js

import helmet from "helmet";

// Define your custom Content Security Policy (Keep this as is)
const cspPolicy = {
    directives: {
        defaultSrc: ["'self'", "https://enguinity-9.onrender.com", "https://enginuity-alpha-1.onrender.com"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", "https://enguinity-9.onrender.com", "https://enginuity-alpha-1.onrender.com"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
    },
};

// Export the individual components and configuration
export const helmetInstance = helmet; 
export const generalHelmetConfig = {
    contentSecurityPolicy: false, 
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
};
export const customCspPolicy = cspPolicy;
