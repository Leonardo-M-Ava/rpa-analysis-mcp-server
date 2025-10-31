import express from 'express';
import { analyze_video_for_rpa, generate_rpa_document, extract_video_frames } from './services'; // Assume these services are defined

const app = express();
app.use(express.json());

// MCP Protocol Handling
app.post('/mcp', async (req, res) => {
    const { method, params } = req.body;

    try {
        let result;

        switch (method) {
            case 'analyze_video_for_rpa':
                result = await analyze_video_for_rpa(params);
                break;
            case 'generate_rpa_document':
                result = await generate_rpa_document(params);
                break;
            case 'extract_video_frames':
                result = await extract_video_frames(params);
                break;
            default:
                throw new Error('Method not found');
        }

        res.json({ jsonrpc: '2.0', result, id: req.body.id });
    } catch (error) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: error.message }, id: req.body.id });
    }
});

// Error Management
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
