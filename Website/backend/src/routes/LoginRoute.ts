import { Request, Response, Router } from "express";
import { AccountController } from "../controllers/AccountController";

const router = Router();

// Route to handle login request, accepts request and calls AccountController
router.post('/login', (req: Request, res: Response) => {
    const { email, password } = req.body as { email : string; password: string };
    AccountController.loginUser(email, password, req, res)
});

export default router;