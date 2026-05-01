import { Request, Response, Router } from "express";
import { AccountController } from "../controllers/AccountController";

const router = Router();

// Route to handle register requests, accepts request and calls AccountController
router.post('/register', (req: Request, res: Response) => {
    const { email, password } = req.body as { email : string; password: string };
    AccountController.registerUser(email, password, req, res)
});

export default router;