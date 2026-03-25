// Helper function to strip email of malicious input and validate correct format

export function validateEmail  ( email : string  ) {
    email.trim().toLowerCase();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const res = regex.test(email);
    
    return {
        valid : res && email.endsWith('.ac.uk')
    }
}