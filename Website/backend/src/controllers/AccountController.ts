import { AccountService } from '../services/AccountService';
import { validateEmail } from '../utils/validators/validateEmail';
import { validatePassword } from '../utils/validators/validatePassword';
import { Request, Response } from 'express';
import { UserExistsError, WrongPasswordError, AccountNotFoundError } from '../services/AccountService';

// Controller for HTTP actions related to accounts (registration and login)
// Delegates business logic to AccountService & performs request validation
export const AccountController = {

    // Register a new user, obtaining credentials from request
    async registerUser (email : string, password : string, req: Request, res: Response) {

            // Check email and password aren't null
            if (!email) {
                return res.status(400).json({success: false, error: "No email recieved"})
            }

            if (!password) {
                return res.status(400).json({success: false, error: "No password recieved"})
            }

            // Validate email and password
            const emailResult = validateEmail(email)
            if (!emailResult.valid) {
                return res.status(400).json({success: false, error: "Invalid email format"})
            }
            
            const passwordResult = validatePassword(password);
            if (!passwordResult.valid) {
                return res.status(400).json({ success: false, error: "Password too weak", feedback : passwordResult.feedback })
            }
            
            // Attempt to register user via service layer
            try {
            await AccountService.registerUser(email, password);
            return res.status(201).json({ success: true, message: "User registered successfully" });
            } catch (error) {
                if (error instanceof UserExistsError) {
                    return res.status(409).json({ success: false, error: "User already exists" });
                }
                console.log(error)
                // Fallback for unexpected errors
                res.status(500).json({ success: false, error: 'Internal Server Error,'})
            }
    },
    
    // Authenticate an existing user and return a token + user paylod
    async loginUser (email : string, password : string, req: Request, res: Response) {
            // Again, check email and password aren't null
            if (!email) {
                return res.status(400).json({success: false, error: "No email recieved"})
            }

            if (!password) {
                return res.status(400).json({success: false, error: "No password recieved"})
            }

            // Delegate authentication to the AccountService
            try {
                const { token, user } = await AccountService.loginUser(email, password);
                return res.status(200).json({ success: true, token, user, message: "User logged in successfully"});
            } catch (error) {
                if (error instanceof WrongPasswordError) {
                    // Incorrect password
                    return res.status(400).json({ success: false, error: "Wrong password for account"});
                } else if (
                    error instanceof AccountNotFoundError
                ) {
                    return res.status(400).json({ success: false, error: "Email not associated with an account"});
                }
                else {
                    return res.status(500).json({ success: false, error: 'Internal Server Error,'})
                }
            }
    },
};

