import fs from 'fs';
import path from 'path';
import { fallbackVillageData } from './villageData.js';

/**
 * Vercel Serverless Function : État du Village (Lecture & Synchronisation Sécurisée)
 * Routes : GET /api/village, POST /api/village
 */
export default async function handler(req, res) {
  // En-têtes CORS universels
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sync-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST : Sauvegarde sécurisée de l'état du village
  if (req.method === 'POST') {
    // 1. Contrôle d'autorisation par jeton secret (SYNC_SECRET)
    const expectedSecret = process.env.SYNC_SECRET;
    if (expectedSecret) {
      const authHeader = req.headers.authorization || req.headers['x-sync-secret'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token !== expectedSecret) {
        return res.status(401).json({ 
          error: "Accès refusé : Jeton d'autorisation SYNC_SECRET manquant ou invalide." 
        });
      }
    }

    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // 2. Validation stricte du schéma
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: "Corps de requête invalide : un objet JSON est requis." });
      }

      if (!data.tag || typeof data.tag !== 'string' || !/^#[A-Z0-9]{3,15}$/i.test(data.tag)) {
        return res.status(400).json({ error: "Identifiant de joueur (tag) invalide ou manquant." });
      }

      // Limite de taille anti-DoS (500 Ko max)
      const payloadLength = JSON.stringify(data).length;
      if (payloadLength > 512000) {
        return res.status(413).json({ error: "Charge utile trop volumineuse (> 500 Ko)." });
      }

      let savedToGithub = false;
      let savedToDisk = false;

      // 3. Sauvegarde sur GitHub si GITHUB_TOKEN configuré
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      const GITHUB_REPO = process.env.GITHUB_REPO || "fremjulio-gif/COC_DATA";
      const FILE_PATH = "data/village_state.json";

      if (GITHUB_TOKEN) {
        try {
          const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
          const getRes = await fetch(getUrl, {
            headers: {
              "Authorization": `Bearer ${GITHUB_TOKEN}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "CoC-Optimizer"
            }
          });
          const fileData = getRes.ok ? await getRes.json() : null;
          const currentSha = fileData?.sha;

          const contentBase64 = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
          const putRes = await fetch(getUrl, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${GITHUB_TOKEN}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "CoC-Optimizer"
            },
            body: JSON.stringify({
              message: `chore(data): sync village ${data.tag} via authenticated api`,
              content: contentBase64,
              sha: currentSha,
              branch: "main"
            })
          });

          if (putRes.ok) {
            savedToGithub = true;
          }
        } catch (ghErr) {
          console.warn("Échec de synchronisation GitHub :", ghErr.message);
        }
      }

      // 4. Sauvegarde sur disque local si l'environnement le permet
      try {
        const filePath = path.join(process.cwd(), 'data', 'village_state.json');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        savedToDisk = true;
      } catch (fsErr) {
        // En lecture seule sur conteneur serverless Vercel
      }

      return res.status(200).json({
        success: true,
        message: savedToGithub 
          ? "Village synchronisé et commité sur GitHub !" 
          : savedToDisk 
            ? "Village enregistré localement." 
            : "Données reçues et validées avec succès.",
        savedToGithub,
        savedToDisk
      });

    } catch (err) {
      return res.status(400).json({ error: "Échec de traitement du village : " + err.message });
    }
  }

  // GET : Récupération de l'état actuel du village
  try {
    const filePath = path.join(process.cwd(), 'data', 'village_state.json');
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      return res.status(200).json(data);
    }
  } catch (err) {
    // Si la lecture disque échoue
  }

  // Fallback garanti
  return res.status(200).json(fallbackVillageData);
}
