import fs from 'fs';
import path from 'path';
import { fallbackVillageData } from './villageData.js';

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
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      return res.status(200).json(data);
    }
  } catch (err) {
    // Si la lecture disque échoue dans le conteneur serverless
  }

  // Fallback direct sur les données embarquées (garantie 0 crash 500)
  return res.status(200).json(fallbackVillageData);
}

