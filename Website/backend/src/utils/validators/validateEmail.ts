// Helper function to strip email of malicious input and validate correct format

export function validateEmail  ( email : string  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const res = regex.test(normalizedEmail);
    
    return {
        valid : res && normalizedEmail.endsWith('@cardiff.ac.uk')
    }
}
