import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { GoogleGenerativeAI } from '@google/generative-ai';
const CLOUDCONVERT_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMmZlN2U3YTIyZTU0ZGZkOTQ3OGFmNjgwNGE4OTJjYjM3YjQ3Y2RlMmMyZTkxZjkwOWU2YTE0YTIxMThmYjBiYmM1MWVhZGE4NzA0YzdiM2YiLCJpYXQiOjE3NDk1MzAyMDYuMjQ1MDQ2LCJuYmYiOjE3NDk1MzAyMDYuMjQ1MDQ3LCJleHAiOjQ5MDUyMDM4MDYuMjQwODY2LCJzdWIiOiI3MjE2NjM1MiIsInNjb3BlcyI6W119.ckBwJE4tfWlqrRqNYFABU1Ys1ocfN54keKhI3DlnrlR0HYBhMC9OHPFPRDLdHokRYjEigvv8NBTvbLNKZuSUiJU0-RwWMqv6IwbN6H0HN_D0W0BLIXCOTGPAxZucrgE6Z-6u1RtE7cvRaOQgSi5rFGcYvPD7hh4XtpUB07nWZBZLqUIfmWsowEV2vdBZ6FPubYLqR9VP13d0lM8Jz3257hHulF9BpboM1QLVJT9TpDr82NzOSEhoDXNs8t-RsVuoEWR_JpF0BtuC-09nbLV1R7j1PMks3bTYWHlG5FbDVTviGnNFUh3WHe2dFspNKeZywao6aSOaSR4mzfa0QdnmpPCTC_u0eWjCzvqfy6uvNLwc86V3_Jf0kLso1yO0rArvd3rvD3vowLJgyrNWfI7WH0miEsGVOicnxVF8KrztQyHm75StOzDrJVTqr_cmATQcHAjslC-8llV7hWUahOsKJWCy1YryXJRYVMGp_iHCmrot19tKM8N8s9ysEmXB1fAt1Pi8sqxP_i3MiM3R8grW97Wv4I8bqlRZwhXl5aUgMVxpND88jN64MOdvnHylo8GdlPiaQscuc4FA-81eqoV00BldfR8LVxCHRadfskGWz59YxMifAwHUKGRzvB8SnyzgO4jmIuqg3WvSN79FApc5GvyrXHcmzbPO9dvS8YP-dSI";
const GEMINI_API_KEY  = "AIzaSyArUa9bVSny-Nf_9y4LaNMvT3UF3BKYJhs";

export const analyzeWithCloudConvert = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
    }

    const filePath = req.file.path;
    const fileMimeType = req.file.mimetype;
    let imageBuffer;

    try {
        if (fileMimeType === 'image/jpeg' || fileMimeType === 'image/png') {
            console.log("SUCCESS: File is an image. Skipping conversion.");
            imageBuffer = fs.readFileSync(filePath);
        } else {
            console.log(`INFO: File requires conversion (Type: ${fileMimeType}). Starting CloudConvert workflow...`);

            const convertTask = {
                "operation": "convert",
                "input": "import-file",
                "output_format": "png",
            };

            if (fileMimeType === 'application/pdf') {
                console.log("INFO: PDF file detected. Setting engine to 'poppler'.");
                convertTask.engine = 'poppler';
                convertTask.pages = '1';
            } else {
                console.log("INFO: Non-PDF file detected. Setting engine to 'autocad'.");
                convertTask.engine = 'autocad';
            }

            console.log("STEP 1: Creating CloudConvert job...");
            const jobResponse = await axios.post('https://api.cloudconvert.com/v2/jobs', {
                "tasks": {
                    "import-file": { "operation": "import/upload" },
                    "convert-file": convertTask,
                    "export-result": { "operation": "export/url", "input": "convert-file" }
                }
            }, { 
                headers: { 'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}` } 
            });
            
            const job = jobResponse.data.data;
            const uploadTask = job.tasks.find(task => task.name === 'import-file');
            console.log("SUCCESS: CloudConvert job created with ID:", job.id);
            
            console.log("STEP 2: Uploading file to CloudConvert...");
            const form = new FormData();
            Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => form.append(key, value));
            form.append('file', fs.createReadStream(filePath));
            await axios.post(uploadTask.result.form.url, form, { headers: form.getHeaders() });
            console.log("SUCCESS: File uploaded.");
            
            console.log("STEP 3: Waiting for conversion job to finish...");
            let finalJobStatus;
            while (true) {
                const statusResponse = await axios.get(`https://api.cloudconvert.com/v2/jobs/${job.id}`, { headers: { 'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}` } });
                finalJobStatus = statusResponse.data.data;
                console.log(`INFO: Current job status: ${finalJobStatus.status}`);
                if (finalJobStatus.status === 'finished') break;
                if (finalJobStatus.status === 'error') {
                     const failedTask = finalJobStatus.tasks.find(t => t.status === 'error');
                     throw new Error(failedTask.message || 'CloudConvert job failed');
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            console.log("SUCCESS: Conversion job finished.");
            
            console.log("STEP 4: Downloading converted PNG...");
            const exportTask = finalJobStatus.tasks.find(task => task.name === 'export-result');
            const pngUrl = exportTask.result.files[0].url;
            const imageResponse = await axios.get(pngUrl, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(imageResponse.data, 'binary');
            console.log("SUCCESS: PNG downloaded.");
        }

        console.log("STEP 5: Sending final image to Gemini for analysis...");
        const imagePart = {
            inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/png' }
        };

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = req.body.prompt || 'Analyze this image. If it is a construction blueprint or floor plan, provide a detailed analysis. Otherwise, simply describe its contents.';
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        console.log("SUCCESS: Gemini analysis complete.");

        res.status(200).json({ result: responseText });

    } catch (error) {
        // This will now give us a much more detailed error message in the terminal
        console.error("--- WORKFLOW FAILED ---");
        console.error("Error Message:", error.message);
        if (error.response) {
            console.error("Error Response Data:", error.response.data);
        }
        console.error("--- END OF ERROR ---");
        res.status(500).json({ message: 'Failed to process file. Check server logs for details.' });
    } finally {
        fs.unlinkSync(filePath);
    }
};

// Extract items and prices from uploaded file and return structured JSON
export const analyzeAndExtractItems = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
    }

    const filePath = req.file.path;
    const fileMimeType = req.file.mimetype;
    let imageBuffer;

    try {
        const geminiKeyToUse = GEMINI_API_KEY;
        if (!geminiKeyToUse) {
            return res.status(500).json({ message: "Missing GEMINI_API_KEY on server." });
        }
        if (fileMimeType === 'image/jpeg' || fileMimeType === 'image/png') {
            imageBuffer = fs.readFileSync(filePath);
        } else {
            if (!CLOUDCONVERT_API_KEY) {
                return res.status(400).json({ message: 'PDF/other formats require CLOUDCONVERT_API_KEY. Upload a JPG/PNG or configure CloudConvert.' });
            }
            const convertTask = { operation: 'convert', input: 'import-file', output_format: 'png' };
            if (fileMimeType === 'application/pdf') {
                convertTask.engine = 'poppler';
                convertTask.pages = '1';
            } else {
                convertTask.engine = 'autocad';
            }

            const jobResponse = await axios.post('https://api.cloudconvert.com/v2/jobs', {
                tasks: {
                    'import-file': { operation: 'import/upload' },
                    'convert-file': convertTask,
                    'export-result': { operation: 'export/url', input: 'convert-file' }
                }
            }, { headers: { Authorization: `Bearer ${CLOUDCONVERT_API_KEY}` } });

            const job = jobResponse.data.data;
            const uploadTask = job.tasks.find(task => task.name === 'import-file');
            const form = new FormData();
            Object.entries(uploadTask.result.form.parameters).forEach(([k, v]) => form.append(k, v));
            form.append('file', fs.createReadStream(filePath));
            await axios.post(uploadTask.result.form.url, form, { headers: form.getHeaders() });

            // Poll until export-result finished
            while (true) {
                const poll = await axios.get(`https://api.cloudconvert.com/v2/jobs/${job.id}`, { headers: { Authorization: `Bearer ${CLOUDCONVERT_API_KEY}` } });
                const exportTask = poll.data.data.tasks.find(t => t.name === 'export-result' && t.status === 'finished');
                if (exportTask) {
                    const fileUrl = exportTask.result.files[0].url;
                    const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                    imageBuffer = Buffer.from(imageResponse.data, 'binary');
                    break;
                }
                if (poll.data.data.status === 'error') throw new Error('CloudConvert job failed');
                await new Promise(r => setTimeout(r, 1200));
            }
        }

        const genAI = new GoogleGenerativeAI(geminiKeyToUse);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Extract items from this image of a supplier list or quotation. Return ONLY a JSON array under the key items with objects: {"name": string, "unit": string|null, "price": number|null}. Rules: normalize unit (pcs/box/kg/etc), parse PHP prices as numbers (strip commas and currency), ignore headers/subtotals.`;
        const imagePart = { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/png' } };
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }, imagePart ]}],
            generationConfig: { responseMimeType: 'application/json' }
        });
        // Prefer JSON response
        let text = '';
        try {
            text = result.response.text();
        } catch (_) {
            text = String(result.response.candidates?.[0]?.content?.parts?.[0]?.text || '');
        }
        let items = [];
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                items = parsed;
            } else if (parsed && Array.isArray(parsed.items)) {
                items = parsed.items;
            }
        } catch (e) {
            // Try to salvage JSON array from text using a simple bracket match
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                try {
                    const sliced = text.slice(start, end + 1);
                    const arr = JSON.parse(sliced);
                    if (Array.isArray(arr)) items = arr;
                } catch {}
            }
            if (items.length === 0) {
                return res.status(500).json({ message: 'Failed to parse AI response', raw: text });
            }
        }
        // Normalize output
        const normalized = items
            .filter(it => it && (it.name || it.item || it.description))
            .map(it => {
                const name = (it.name || it.item || it.description || '').toString().trim();
                const unit = (it.unit || '').toString().trim() || null;
                let priceNum = it.price != null ? Number(String(it.price).replace(/[^0-9.]/g, '')) : null;
                if (isNaN(priceNum)) priceNum = null;
                return { name, unit, price: priceNum };
            })
            .filter(x => x.name);
        return res.json({ items: normalized });
    } catch (err) {
        console.error('analyzeAndExtractItems error', err?.response?.data || err.message);
        return res.status(500).json({ message: 'Failed to extract items' });
    } finally {
        try { fs.unlinkSync(filePath); } catch {}
    }
};