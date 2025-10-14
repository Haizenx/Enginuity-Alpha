import helmet from "helmet";

const cspPolicy = {
  directives: {
    defaultSrc: ["'self'", "https://enguinity-9.onrender.com", "https://enginuity-alpha-1.onrender.com"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    connectSrc: ["'self'", "https://enguinity-9.onrender.com", "https://enginuity-alpha-1.onrender.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    frameAncestors: ["'self'"],
  },
};

export const applySecurityMiddleware = (app) => {
  // Apply general helmet protections
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }));

  // Apply Content Security Policy
  app.use(helmet.contentSecurityPolicy(cspPolicy));
};
