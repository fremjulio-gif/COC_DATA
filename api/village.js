import fs from 'fs';
import path from 'path';

/**
 * Vercel Serverless Function : État du Village
 * Route : /api/village
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'village_state.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Impossible de lire le fichier data/village_state.json", details: err.message });
  }
}
