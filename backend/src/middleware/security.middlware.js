// middleware/security.middleware.js

const helmet = require('helmet');

// Define your custom Content Security Policy
const cspPolicy = {
  directives: {
    // Allows resources only from the current domain by default
    defaultSrc: ["'self'"], 
    
    // Customize script sources
    scriptSrc: [
      "'self'",
      // Add domains for external scripts, e.g., 'https://cdn.jsdelivr.net', 'https://www.google-analytics.com'
    ],
    
    // Customize style sources
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Often required for CSS-in-JS or dynamic styles
      // Add domains for external styles, e.g., 'https://fonts.googleapis.com'
    ],
    
    // Customize image sources
    imgSrc: [
      "'self'",
      'data:', // Allows base64 encoded images
      // Add domains for external images/CDNs
    ],

    // Customize connection sources (API calls, WebSockets)
    connectSrc: [
      "'self'",
      // Add domains for any external APIs or WebSockets
    ],

    // Restricts the use of `<object>`, `<embed>`, or `<applet>`
    objectSrc: ["'none'"], 
    
    // Prevents content from being embedded into other sites
    frameAncestors: ["'self'"], 
  },
  // You can set reportOnly: true for initial testing to see violations without blocking content.
  // reportOnly: true, 
};

// Export the Helmet middleware array
module.exports = [
  // This disables Helmet's default CSP so we can use the custom one below.
  helmet({ contentSecurityPolicy: false }), 
  
  // Apply the custom CSP middleware
  helmet.contentSecurityPolicy(cspPolicy)
];
