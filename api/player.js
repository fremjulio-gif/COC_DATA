import fs from 'fs';
import path from 'path';

/**
 * Vercel Serverless Function : Proxy API Supercell Clash of Clans
 * Route : /api/player
 */
export default async function handler(req, res) {
  // En-têtes CORS universels
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const PLAYER_TAG = "%23GUQLRP8LV"; // #GUQLRP8LV encodé
  const API_BEARER_TOKEN = process.env.COC_API_TOKEN || "gpgpgj47";
  const url = `https://api.clashofclans.com/v1/players/${PLAYER_TAG}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${API_BEARER_TOKEN}`,
        "Accept": "application/json",
        "User-Agent": "CoC-Freemium-Optimizer/1.0"
      }
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        source: "supercell_api",
        status: "online",
        player: data
      });
    }

    // Si Supercell bloque la requête (ex: 403 Forbidden car l'IP dynamique de Vercel n'est pas dans la whitelist Supercell)
    throw new Error(`Supercell HTTP ${response.status}`);
  } catch (err) {
    // Fallback transparent vers village_state.json
    try {
      const filePath = path.join(process.cwd(), 'data', 'village_state.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const villageData = JSON.parse(fileContent);

      return res.status(200).json({
        source: "fallback_local",
        status: "offline_fallback",
        message: "L'API Supercell a restreint la requête (IP Vercel non whitelistée ou token révoqué). Les données locales du village ont été chargées avec succès.",
        error_details: err.message,
        village: villageData
      });
    } catch (readErr) {
      return res.status(200).json({
        source: "fallback_local",
        status: "offline_fallback",
        message: "Mode local actif (fallback sans fichier externe)."
      });
    }
  }
}
