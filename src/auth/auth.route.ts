import { Router } from 'express'
import { createSession, registerUser, logoutUser, getUsers, updateUser, getUserSummary, getCurrentUser, getUserDetails } from './auth.controller'
import { verifyToken } from '../middlewares/authorization';
import multer from "multer";

export const AuthRouter: Router = Router()
export const Accounts: Router = Router()

const upload = multer({ storage: multer.memoryStorage() });

AuthRouter.post('/register', verifyToken, registerUser)
AuthRouter.post('/login', createSession)
AuthRouter.post('/logout', verifyToken, logoutUser);
AuthRouter.get('/users', verifyToken, getUsers);
AuthRouter.put('/update', verifyToken, upload.single("logo"), updateUser);
AuthRouter.get('/user-summary', verifyToken, getUserSummary);
AuthRouter.get('/current-user', verifyToken, getCurrentUser);
Accounts.get('/:id/details', verifyToken, getUserDetails);

