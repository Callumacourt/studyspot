import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; 
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

// Connect to our database
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

// Custom errors
export class UserExistsError extends Error {
    code = "USER_EXISTS";
}

export class AccountNotFoundError extends Error {
    code = "ACCOUNT_NOT_FOUND";
}

export class WrongPasswordError extends Error {
    code = "WRONG_PASSWORD"
}

export const AccountService = {
    async registerUser(email : string, password : string) {
        // Check account already exists
            const account = await prisma.user.findUnique({
            where: {email},
        });

        // If so then throw error
        if (account) {
            throw new UserExistsError("Account already exists")
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create account in DB
        await prisma.user.create({
            data: {email, password: hashedPassword}
        })

        return { success: true };
    },

    async loginUser(email : string, password : string) {
        // Check user exists
         const account = await prisma.user.findUnique({
            where: {email},
        });
        
        // Show no account error if not
        if (!account) {
            throw new AccountNotFoundError("Account doesn't exist")
        }

        // Check if password is correct
        const isMatch = await bcrypt.compare(password, account.password);

        // Show wrong password error if not
        if (!isMatch) {
            throw new WrongPasswordError("Password is incorrect")
        }
        

        // Fetch all data we need for the user (just fav rooms rn)
        const user = await prisma.user.findUnique({
            where: { email },
            include: { favouritedRooms: true}
        });

        // Log in User by providing signed token
        const token = jwt.sign(
            { userId : account.userId, email: account.email },
            process.env.JWT_SECRET!,
            { expiresIn: "1h" }  
        )

        return { user, token }
    }
}