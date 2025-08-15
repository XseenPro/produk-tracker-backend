import { Router } from 'express';
import { addProduct, getProduct, deleteProductById, updateProductById, addProductFromFileHandler } from './product.controller';
import { requireUser, verifyToken } from '../middlewares/authorization';
import multer from 'multer';

export const ProductRouter: Router = Router();

const upload = multer({ storage: multer.memoryStorage() });

ProductRouter.post('/', verifyToken, requireUser, addProduct);
ProductRouter.post('/upload-product', verifyToken, requireUser, upload.single('file'), addProductFromFileHandler);
ProductRouter.get('/all', verifyToken, getProduct);
ProductRouter.get('/:id', verifyToken, getProduct);
ProductRouter.put('/:id', verifyToken, updateProductById);
ProductRouter.delete('/:id', verifyToken, deleteProductById);
