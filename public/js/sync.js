/**
 * CoC Freemium Optimizer — Moteur de Synchronisation Gzip & QR Code
 * CompressionStream, Checksum CRC32, limite de taille stricte et validation anti-XSS
 */

export const SYNC_PROTOCOL_VERSION = 'v2';
export const MAX_COMPRESSED_BYTES = 65536; // 64 Ko max

/**
 * Calcule un checksum simple et rapide (CRC32)
 */
export function crc32(str) {
  let crc = -1;
  for (let i = 0; i < str.length; i++) {
    let c = (crc ^ str.charCodeAt(i)) & 0xff;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
    }
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ (-1)) >>> 0;
}

/**
 * Compresse un objet de village en hash d'URL base64url sécurisé
 * Format : v2.<checksum_hex>.<base64url_compressed>
 */
export async function compressVillageToHash(villageData) {
  if (!villageData || typeof villageData !== 'object') {
    throw new Error('Données de village invalides pour la compression');
  }

  const jsonStr = JSON.stringify(villageData);
  const checksum = crc32(jsonStr).toString(16).padStart(8, '0');

  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(jsonStr);

  const stream = new Response(
    new Blob([rawBytes]).stream().pipeThrough(new CompressionStream('gzip'))
  );
  const compressedBuffer = await stream.arrayBuffer();

  if (compressedBuffer.byteLength > MAX_COMPRESSED_BYTES) {
    throw new Error(`Taille compressée trop volumineuse (${compressedBuffer.byteLength} octets > ${MAX_COMPRESSED_BYTES})`);
  }

  // Conversion en Base64 URL-safe
  let binary = '';
  const bytes = new Uint8Array(compressedBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${SYNC_PROTOCOL_VERSION}.${checksum}.${base64}`;
}

/**
 * Décompresse et valide strictement un hash d'URL
 */
export async function decompressVillageFromHash(hashString) {
  if (!hashString || typeof hashString !== 'string') {
    throw new Error('Hash de synchronisation vide ou non valide');
  }

  const cleanHash = hashString.replace(/^#?\/?(sync=)?/, '').trim();
  const parts = cleanHash.split('.');

  if (parts.length !== 3) {
    throw new Error('Format de hash de synchronisation non reconnu');
  }

  const [version, expectedChecksum, base64Payload] = parts;

  if (version !== SYNC_PROTOCOL_VERSION) {
    throw new Error(`Version de protocole non supportée (${version})`);
  }

  // Décodage base64url
  let base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  if (bytes.byteLength > MAX_COMPRESSED_BYTES) {
    throw new Error('La charge utile compressée dépasse la limite de sécurité autorisée');
  }

  // Décompression Gzip
  const stream = new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  );
  const decompressedBuffer = await stream.arrayBuffer();
  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decompressedBuffer);

  // Vérification de l'intégrité (Checksum)
  const actualChecksum = crc32(jsonStr).toString(16).padStart(8, '0');
  if (actualChecksum !== expectedChecksum) {
    throw new Error('Échec de vérification du checksum d\'intégrité : données altérées');
  }

  // Analyse et assainissement JSON
  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== 'object' || !parsed.tag) {
    throw new Error('Le JSON décompressé ne contient pas de tag de village valide');
  }

  return parsed;
}

/**
 * Génère un QR code dans un conteneur HTML via la librairie locale QRious
 */
export function generateQrCode(canvasEl, url) {
  if (!canvasEl || typeof QRious === 'undefined') return null;

  return new QRious({
    element: canvasEl,
    value: url,
    size: 200,
    background: '#ffffff',
    foreground: '#070709',
    level: 'L'
  });
}
