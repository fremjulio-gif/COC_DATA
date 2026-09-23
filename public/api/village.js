import fs from 'fs';
import path from 'path';
import { fallbackVillageData } from './villageData.js';

/**
 * Vercel Serverless Function : État du Village (Lecture & Synchronisation Inter-Appareils)
 * Routes : GET /api/village, POST /api/village
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST : Sauvegarde et synchronisation du village
  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!data || !data.tag) {
        return res.status(400).json({ error: "Données de village invalides (champ 'tag' manquant)." });
      }

      let savedToGithub = false;
      let savedToDisk = false;

      // 1. Sauvegarde sur GitHub si GITHUB_TOKEN est configuré dans Vercel
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
              message: "chore(data): auto-update village_state.json via web sync",
              content: contentBase64,
              sha: currentSha,
              branch: "main"
            })
          });

          if (putRes.ok) {
            savedToGithub = true;
          }
        } catch (ghErr) {
          console.warn("Échec synchronisation GitHub :", ghErr.message);
        }
      }

      // 2. Sauvegarde sur disque local si disponible
      try {
        const filePath = path.join(process.cwd(), 'data', 'village_state.json');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        savedToDisk = true;
      } catch (fsErr) {
        // En lecture seule sur environnement serverless sans disque
      }

      return res.status(200).json({
        success: true,
        message: savedToGithub 
          ? "Village synchronisé et commité sur GitHub (déploiement multi-appareils actif) !"
          : savedToDisk 
            ? "Village enregistré sur le serveur local." 
            : "Données reçues et validées.",
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
      return res.status(200).json(data);
    }
  } catch (err) {
    // Si la lecture disque échoue dans le conteneur serverless
  }

  // Fallback direct sur les données embarquées (garantie 0 crash 500)
  return res.status(200).json(fallbackVillageData);
}
