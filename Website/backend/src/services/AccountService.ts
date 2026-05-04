/**
 * AccountService
 * 
 * Handles user authentication (registration and login) with the following responsibilities:
 * - User registration: validates email uniqueness, hashes passwords securely using bcrypt,
 *   and persists credentials to the database.
 * - User login: verifies credentials, checks role permissions (including super-admin status),
 *   generates JWT tokens for stateless authentication, and returns user profile with role.
 * 
 * Dependencies:
 * - Prisma client for database persistence
 * - bcrypt for secure password hashing and comparison
 * - jsonwebtoken (JWT) for stateless auth token generation
 * - adminAccess utility for role resolution (including environment-based super-admin override)
 * 
 * NOTE: JWT_SECRET environment variable MUST be set before instantiation.
 * 
 * @module AccountService
 */

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; 
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { resolveEffectiveRole } from "../utils/adminAccess";

// Connect to our database via DATABASE_URL env var 
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

/**
 * @class UserExistsError
 * Thrown when attempting to register an email that already has an account.
 */
export class UserExistsError extends Error {
    code = "USER_EXISTS";
}

/**
 * @class AccountNotFoundError
 * Thrown when attempting to login with an email that has no registered account.
 */
export class AccountNotFoundError extends Error {
    code = "ACCOUNT_NOT_FOUND";
}

/**
 * @class WrongPasswordError
 * Thrown when login password does not match stored (hashed) password.
 */
export class WrongPasswordError extends Error {
    code = "WRONG_PASSWORD"
}

/**
 * AccountService object with authentication methods.
 */
export const AccountService = {
    /**
     * Registers a new user account.
     * 
     * Process:
     * 1. Validates that email is unique (throws UserExistsError if already registered).
     * 2. Hashes password using bcrypt with 10 salt rounds for security.
     * 3. Persists new user record to database with hashed password and default USER role.
     * 
     * @async
     * @param {string} email - Email address to register (must be unique)
     * @param {string} password - Plain-text password (will be hashed before storage)
     * @returns {Promise<{success: boolean}>} Success confirmation
     * @throws {UserExistsError} If email is already registered
     * 
     * @example
     * await AccountService.registerUser('student@cardiff.ac.uk', 'password123');
     */
    async registerUser(email : string, password : string) {
        // Check if account with this email already exists
        const account = await prisma.user.findUnique({
            where: {email},
        });

        // Reject duplicate registrations early
        if (account) {
            throw new UserExistsError("Account already exists")
        }

        // Hash password securely (10 rounds = ~100ms, balances security and performance)
        const hashedPassword = await bcrypt.hash(password, 10)

        // Persist new user to database
        await prisma.user.create({
            data: {email, password: hashedPassword}
        })

        return { success: true };
    },

    /**
     * Authenticates a user and returns a JWT token for session management.
     * 
     * Process:
     * 1. Verifies email exists in database.
     * 2. Compares provided password against stored hash (bcrypt.compare).
     * 3. Resolves effective role (checks SUPER_ADMIN_EMAILS env var for admin override).
     * 4. Generates signed JWT with 1-hour expiry containing userId, email, role, and managedUniversityId.
     * 5. Returns token and user profile for client-side storage.
     * 
     * @async
     * @param {string} email - Registered email address
     * @param {string} password - Plain-text password to verify
     * @returns {Promise<{token: string, user: Object}>} JWT token and full user profile
     * @throws {AccountNotFoundError} If email has no registered account
     * @throws {WrongPasswordError} If password does not match stored hash
     * 
     * @example
     * const { token, user } = await AccountService.loginUser('student@cardiff.ac.uk', 'password123');
     * // token is now sent in Authorization: Bearer <token> header for protected routes
     */
    async loginUser(email : string, password : string) {
        // Look up user by email
        const account = await prisma.user.findUnique({
            where: {email},
        });
        
        // Reject if account not found
        if (!account) {
            throw new AccountNotFoundError("Account doesn't exist")
        }

        // Verify password securely (compares provided password against stored bcrypt hash)
        const isMatch = await bcrypt.compare(password, account.password);

        // Reject if password mismatch (timing-attack resistant comparison)
        if (!isMatch) {
            throw new WrongPasswordError("Password is incorrect")
        }

        // Fetch full user profile including relation data
        const user = await prisma.user.findUnique({
            where: { email },
            include: { favouritedRooms: true}
        });

        // Resolve effective role (checks environment variables for super-admin override)
        const effectiveRole = resolveEffectiveRole({
            email: account.email,
            role: (user as any)?.role,
        });
        const managedUniversityId = (user as any)?.managedUniversityId ?? null;

        // Create JWT token containing authentication claims (expires in 1 hour)
        const token = jwt.sign(
            {
                userId : account.userId,
                email: account.email,
                role: effectiveRole,
                managedUniversityId,
            },
            process.env.JWT_SECRET!,
            { expiresIn: "1h" }  
        )

        // Return token for client storage + full user profile with resolved role
        return {
            token,
            user: {
                ...user,
                role: effectiveRole,
                managedUniversityId,
            },
        }
    }
}