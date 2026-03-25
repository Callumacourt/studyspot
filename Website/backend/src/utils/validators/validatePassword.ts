import zxcvbn from "zxcvbn";

// Uses zxcvbn library to validate password strength
// Enforces min password length of 8 and strength of 2
// Provides feedback and password strength indicator (score)

export function validatePassword ( password : string ) {
    const result = zxcvbn(password) as any;
    
    return {
        valid: result.score > 2 && password.length > 8,
        score: result.score, 
        feedback: result.feedback,
    };
};