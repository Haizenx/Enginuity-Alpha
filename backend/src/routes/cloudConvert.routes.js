import express from 'express';
import multer from 'multer';
import { analyzeWithCloudConvert, analyzeAndExtractItems } from '../controllers/cloudConvert.controller.js';

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/analyze', upload.single('file'), analyzeWithCloudConvert);
router.post('/extract-items', upload.single('file'), analyzeAndExtractItems);

export default router;