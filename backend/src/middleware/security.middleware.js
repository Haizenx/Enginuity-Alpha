// middleware/security.middleware.js
// Note: Changed 'require' to 'import' for ES Module compatibility

import helmet from "helmet"; // <--- CORRECTED LINE

// Define your custom Content Security Policy
const cspPolicy = {
    directives: {
        // Allows resources only from the current domain and your deployed domains
        defaultSrc: ["'self'", "https://enguinity-9.onrender.com", "https://enginuity-alpha-1.onrender.com"], 

        // Customize script sources
        scriptSrc: [
            "'self'",
            // Add domains for external scripts, e.g., 'https://cdn.jsdelivr.net', 'https://www.google-analytics.com'
        ],

        // Customize style sources
        styleSrc: [
            "'self'",
            "'unsafe-inline'", // Allow inline styles (Be cautious with this)
            'https://fonts.googleapis.com', // Added by you
        ],

        // Customize image sources
        imgSrc: [
            "'self'",
            'data:', // Allows base64 encoded images (like logos)
            'https://res.cloudinary.com'// Added by you (Cloudinary)
        ],

        // Customize connection sources (API calls, WebSockets)
        connectSrc: ["'self'", "https://enguinity-9.onrender.com", "https://enginuity-alpha-1.onrender.com"],
        
        // Allows font sources
        fontSrc: ["'self'", 'https://fonts.gstatic.com'], // Typically needed if you use Google Fonts

        // Restricts the use of `<object>`, `<embed>`, or `<applet>`
        objectSrc: ["'none'"], 

        // Prevents content from being embedded into other sites
        frameAncestors: ["'self'"], 
    },
    // reportOnly is commented out, meaning the policy will be enforced (fail-closed), which is generally desired for production.
};

// Export the Helmet middleware array
const securityMiddleware = [
    helmet({ 
        contentSecurityPolicy: false, // Disable default to use our custom one below
        crossOriginResourcePolicy: { policy: "same-site" }, 
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }), 

    // Apply the custom CSP middleware
    helmet.contentSecurityPolicy(cspPolicy)
];

export default securityMiddleware;
