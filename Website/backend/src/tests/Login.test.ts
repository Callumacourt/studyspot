import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import request from "supertest";
import { execSync } from "child_process";
import app from "../app";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";


const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

beforeAll(() => {
  const backendRoot = path.resolve(__dirname, "../../");
  execSync(
    "npx prisma db push --schema=prisma/schema.prisma",
    { stdio: "inherit", env: process.env, cwd: backendRoot }
  );
});

afterAll(async () => {
    await prisma.$disconnect();
});

// Clean the user table to ensure a clean slate
beforeEach(async () => {
    await prisma.user.deleteMany();
})

// Tests for user auth
describe("Auth", () => {
    it("registers a user", async () => {
        const res = await request(app).post("/users/register").send({
            email: "testemail@cardiff.ac.uk", // test email
            password: "AVeryStrongPassword!£$" // test password
        });
        expect(res.status).toBe(201); // a successful response
        expect(res.body.success).toBe(true); 
    });

      it("stores password as a hash (not plaintext)", async () => {
        const rawPassword = "AVeryStrongPassword!£$";
        await request(app).post("/users/register").send({
          email: "hashcheck@cardiff.ac.uk",
          password: rawPassword
        });

        const user = await prisma.user.findUnique({ where: { email: "hashcheck@cardiff.ac.uk" } });
        expect(user).toBeTruthy(); // user exists
        expect(user!.password).not.toBe(rawPassword); // password has been hashed 
        expect(user!.password.length).toBeGreaterThan(20);
      });

    it("rejects duplicate registration", async () => {
        // Register first time
        const res = await request(app).post("/users/register").send({
            email: "testemail@cardiff.ac.uk",
            password: "AVeryStrongPassword!£$"
        });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        // Register second time
        const res2 = await request(app).post("/users/register").send({
            email: "testemail@cardiff.ac.uk",
            password: "AVeryStrongPassword!£$"
        });

        // Expect it to throw with these error codes & responses
        expect(res2.status).toBe(409); 
        expect(res2.body.success).toBe(false);
        expect(res2.body.error).toMatch(/user already exists/i);
    })
})

// Arrays of valid and invalid emails and password for testing
const goodEmails = [
  "student@cardiff.ac.uk",
  "alice.smith@cardiff.ac.uk",
  "s1234567@bristol.ac.uk"
];

const badEmails = [
  "no-at-symbol",
  "user@notuni.com",
  "user@cardiff",    
  " user@cardiff.ac.uk "
];

const goodPasswords = [
  "AVeryStrongPassword!£$",
  "CorrectHorseBatteryStaple1!"
];

const badPasswords = [
  "password",
  "12345678",
  "short"
];

describe("password variations", () => {
  // Test valid passwords accepted
    it.each(goodPasswords)("accept valid password %s", async (password) => {
        const res = await request(app).post("/users/register").send({email: goodEmails[0], password});
        expect(res.status).toBe(201);
    })

    // Test invalid passwords rejected
    it.each(badPasswords)("reject invalid password %s", async (password) => {
    const res = await request(app).post("/users/register").send({email: goodEmails[0], password});
    expect(res.status).toBe(400);
    })
})

describe("email variations", () => {
    // Test valid emails accepted
    it.each(goodEmails)("accept valid email %s", async (email) => {
        const res = await request(app).post("/users/register").send({email, password : goodPasswords[0]});
        expect(res.status).toBe(201);
    })
    
    // Test invalid emails rejected
    it.each(badEmails)("reject invalid email %s", async(email) => {
        const res = await request(app).post("/users/register").send({email, password : goodPasswords[0]});
        expect(res.status).toBe(400);
    })
})