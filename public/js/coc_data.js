/**
 * COC_DATA - Dictionnaire & Décodeur Universel Clash of Clans
 * Décodage exhaustif des IDs numériques du fichier d'état interne
 */

const COC_DATA = {
  // BÂTIMENTS DU VILLAGE PRINCIPAL
  buildings: {
    1000000: { name: "Camp Militaire", category: "army", maxTh11: 9, icon: "🏕️", desc: "Héberge vos troupes d'attaque." },
    1000001: { name: "Hôtel de Ville (HDV)", category: "core", maxTh11: 11, icon: "🏛️", desc: "Cœur de votre village. Niveau 11 débloque le Grand Gardien et l'Aigle Artilleur." },
    1000002: { name: "Extracteur d'Élixir", category: "resource", maxTh11: 14, icon: "🟣", desc: "Produit de l'élixir rose en continu." },
    1000003: { name: "Réserve d'Élixir", category: "resource", maxTh11: 12, icon: "🧪", desc: "Stocke votre élixir rose." },
    1000004: { name: "Mine d'Or", category: "resource", maxTh11: 14, icon: "🪙", desc: "Extrait de l'or du sol." },
    1000005: { name: "Réserve d'Or", category: "resource", maxTh11: 12, icon: "💰", desc: "Stocke votre or." },
    1000006: { name: "Château de Clan", category: "army", maxTh11: 7, icon: "🏰", desc: "Contient les troupes de renfort, les sorts et le butin de guerre." },
    1000007: { name: "Laboratoire", category: "army", maxTh11: 9, icon: "🔬", desc: "Améliore la puissance de vos troupes, sorts et engins de siège." },
    1000008: { name: "Canon", category: "defense", maxTh11: 15, icon: "💣", desc: "Défense terrestre de base à cadence soutenue." },
    1000009: { name: "Tour d'Archers", category: "defense", maxTh11: 15, icon: "🏹", desc: "Défense polyvalente sol et air avec grande portée." },
    1000010: { name: "Remparts", category: "wall", maxTh11: 12, icon: "🧱", desc: "Barrière protectrice. Niveau 12 = Remparts Magmatiques / Électriques." },
    1000011: { name: "Défense Anti-Aérienne", category: "defense", maxTh11: 9, icon: "🚀", desc: "Dévastatrice contre toute cible aérienne (Dragons, Ballons)." },
    1000012: { name: "Mortier", category: "defense", maxTh11: 10, icon: "💥", desc: "Artillerie lourde de zone contre les vagues terrestres denses." },
    1000013: { name: "Tour de Sorciers", category: "defense", maxTh11: 9, icon: "🔮", desc: "Dégâts de zone magiques sol et air." },
    1000014: { name: "Cabane d'Ouvrier", category: "builder", maxTh11: 1, icon: "🔨", desc: "Héberge un ouvrier pour vos constructions." },
    1000015: { name: "Cabane d'Ouvrier", category: "builder", maxTh11: 1, icon: "🔨", desc: "Héberge un ouvrier pour vos constructions." },
    1000019: { name: "Foreuse d'Élixir Noir", category: "resource", maxTh11: 6, icon: "🛢️", desc: "Extrait l'élixir noir précieux pour les héros et troupes noires." },
    1000020: { name: "Réserve d'Élixir Noir", category: "resource", maxTh11: 6, icon: "⬛", desc: "Stocke votre élixir noir." },
    1000021: { name: "Caserne", category: "army", maxTh11: 13, icon: "⚔️", desc: "Entraîne vos troupes d'élixir." },
    1000023: { name: "Propulseur d'Air", category: "defense", maxTh11: 6, icon: "💨", desc: "Repousse les cibles aériennes avec de violentes rafales de vent." },
    1000024: { name: "Caserne Noire", category: "army", maxTh11: 7, icon: "🦇", desc: "Entraîne vos troupes forgées dans l'élixir noir." },
    1000026: { name: "Usine de Sorts", category: "army", maxTh11: 5, icon: "✨", desc: "Confectionne vos sorts d'élixir." },
    1000027: { name: "Usine de Sorts Noirs", category: "army", maxTh11: 4, icon: "🧪", desc: "Confectionne vos sorts compacts d'élixir noir." },
    1000028: { name: "Arc-X", category: "defense", maxTh11: 5, icon: "🎯", desc: "Arbalète automatique haute cadence (mode Sol ou Sol & Air)." },
    1000029: { name: "Tour de l'Enfer", category: "defense", maxTh11: 5, icon: "🔥", desc: "Rayon thermique dévastateur (mode cible unique ou multi-cibles)." },
    1000031: { name: "Aigle Artilleur", category: "defense", maxTh11: 2, icon: "🦅", desc: "Arme signature HDV 11. Frappe à l'échelle de toute la carte." },
    1000032: { name: "Tour à Bombes", category: "defense", maxTh11: 6, icon: "💣", desc: "Grenadier terrestre qui explose à sa destruction." },
    1000070: { name: "Atelier", category: "army", maxTh11: 3, icon: "🚜", desc: "Construit des engins de siège." },
    1000071: { name: "Cabane B.O.B / O.T.T.O", category: "builder", maxTh11: 1, icon: "🤖", desc: "6ème ouvrier débloqué via la Base des Ouvriers." },
    1000093: { name: "Animalerie", category: "army", maxTh11: 1, icon: "🐾", desc: "Élève des animaux de compagnie pour les héros." },
    1000097: { name: "Station d'Artisanat Défensif (Crafted Defense)", category: "defense", maxTh11: 1, icon: "⚙️", desc: "Défense modulaire 3x3 saisonnière (v18.600.5) configurable avec 3 types tactiques et 9 modules d'amélioration." },
    1000098: { name: "Hall des Héros", category: "army", maxTh11: 5, icon: "🏛️", desc: "Centralise la gestion des héros et plafonne leur niveau (Niveau 5 à l'HDV 11 pour héros 50/50/20/30)." }
  },

  // HÉROS
  heroes: {
    28000000: { 
      name: "Roi des Barbares", 
      heroKey: "king",
      maxTh11: 50, 
      icon: "👑", 
      color: "from-amber-500 to-yellow-600",
      avatar: "https://api-assets.clashofclans.com/heroes/barbarian_king.png",
      desc: "Tank colossal en première ligne. Capacité Poing de Fer / Équipements offensifs."
    },
    28000001: { 
      name: "Reine des Archères", 
      heroKey: "queen",
      maxTh11: 50, 
      icon: "🏹", 
      color: "from-fuchsia-500 to-purple-600",
      avatar: "https://api-assets.clashofclans.com/heroes/archer_queen.png",
      desc: "Tireuse d'élite à longue portée. Dégâts par seconde monumentaux."
    },
    28000002: { 
      name: "Grand Gardien", 
      heroKey: "warden",
      maxTh11: 20, 
      icon: "📖", 
      color: "from-sky-400 to-indigo-600",
      avatar: "https://api-assets.clashofclans.com/heroes/grand_warden.png",
      desc: "Support légendaire de l'HDV 11. Aura de vie et invulnérabilité de zone."
    },
    28000006: { 
      name: "Prince Gargouille", 
      heroKey: "minion_prince",
      maxTh11: 30, 
      icon: "🦇", 
      color: "from-violet-500 to-purple-800",
      avatar: "https://api-assets.clashofclans.com/heroes/minion_prince.png",
      desc: "Héros aérien agile, bombardant les défenses avec précision."
    },
    28000003: { 
      name: "Machine de Combat (MDO)", 
      heroKey: "battle_machine",
      maxTh11: 35, 
      icon: "⚡", 
      color: "from-emerald-400 to-teal-600",
      avatar: "https://api-assets.clashofclans.com/heroes/battle_machine.png",
      desc: "Mécha puissant de la Base des Ouvriers avec marteau électrique."
    }
  },

  // ÉQUIPEMENTS DE HÉROS
  equipment: {
    90000000: { name: "Marionnette Barbare", hero: "Roi", rarity: "common", maxTh11: 15, icon: "🧸" },
    90000001: { name: "Flacon de Rage", hero: "Roi", rarity: "common", maxTh11: 15, icon: "🧪", topTier: true },
    90000002: { name: "Marionnette Archère", hero: "Reine", rarity: "common", maxTh11: 15, icon: "🎎" },
    90000003: { name: "Bottes de Séisme", hero: "Roi", rarity: "common", maxTh11: 15, icon: "🥾" },
    90000004: { name: "Fiole d'Invisibilité", hero: "Reine", rarity: "common", maxTh11: 15, icon: "👻", topTier: true },
    90000005: { name: "Marionnette Guérisseuse", hero: "Reine", rarity: "common", maxTh11: 15, icon: "🧚" },
    90000006: { name: "Tome de Guérison", hero: "Gardien", rarity: "common", maxTh11: 15, icon: "📗" },
    90000007: { name: "Gemme de Vitesse", hero: "Gardien", rarity: "common", maxTh11: 15, icon: "💨" },
    90000008: { name: "Flèche Géante", hero: "Reine", rarity: "common", maxTh11: 15, icon: "🎯", topTier: true },
    90000010: { name: "Gantelet Géant", hero: "Roi", rarity: "epic", maxTh11: 18, icon: "🥊", topTier: true, epic: true },
    90000011: { name: "Balle à Pointes", hero: "Roi", rarity: "epic", maxTh11: 18, icon: "⚽", topTier: true, epic: true },
    90000013: { name: "Flèche Gelée", hero: "Reine", rarity: "epic", maxTh11: 18, icon: "❄️", topTier: true, epic: true },
    90000014: { name: "Miroir Magique", hero: "Reine", rarity: "epic", maxTh11: 18, icon: "🪞", topTier: true, epic: true },
    90000015: { name: "Flacon d'Invisibilité", hero: "Reine", rarity: "common", maxTh11: 15, icon: "🌫️" },
    90000016: { name: "Flacon de Vitesse", hero: "Championne", rarity: "common", maxTh11: 15, icon: "⚡" },
    90000017: { name: "Tome Éternel", hero: "Gardien", rarity: "common", maxTh11: 15, icon: "📘", topTier: true },
    90000019: { name: "Gemme de Vie", hero: "Gardien", rarity: "common", maxTh11: 15, icon: "💚" },
    90000022: { name: "Gemme de Guérison", hero: "Gardien", rarity: "common", maxTh11: 15, icon: "🌿", topTier: true },
    90000024: { name: "Gemme de Rage", hero: "Gardien", rarity: "common", maxTh11: 15, icon: "🔥", topTier: true },
    90000032: { name: "Boule de Feu", hero: "Gardien", rarity: "epic", maxTh11: 18, icon: "☄️", epic: true },
    90000035: { name: "Bouclier de Choc", hero: "Championne", rarity: "epic", maxTh11: 18, icon: "🛡️" },
    90000039: { name: "Bouclier Traqueur", hero: "Championne", rarity: "common", maxTh11: 15, icon: "🎯" },
    90000040: { name: "Lance Royale", hero: "Championne", rarity: "common", maxTh11: 15, icon: "🗡️" },
    90000041: { name: "Électro-Bottes", hero: "Championne", rarity: "epic", maxTh11: 18, icon: "👢" },
    90000042: { name: "Ailes Sombrefer", hero: "Prince", rarity: "common", maxTh11: 15, icon: "🪽" },
    90000043: { name: "Crachat Acide", hero: "Prince", rarity: "common", maxTh11: 15, icon: "🧪", topTier: true },
    90000044: { name: "Cri Glacial", hero: "Prince", rarity: "common", maxTh11: 15, icon: "🧊", topTier: true },
    90000048: { name: "Essaim Obscur", hero: "Prince", rarity: "common", maxTh11: 15, icon: "🦇", topTier: true },
    90000049: { name: "Pluie de Météores", hero: "Prince", rarity: "epic", maxTh11: 18, icon: "🌠", epic: true },
    90000050: { name: "Orbe Maudit", hero: "Prince", rarity: "common", maxTh11: 15, icon: "🔮", topTier: true },
    90000051: { name: "Serres Voraces", hero: "Prince", rarity: "common", maxTh11: 15, icon: "🦅" },
    90000052: { name: "Corne de Guerre", hero: "Prince", rarity: "common", maxTh11: 15, icon: "📯" },
    90000053: { name: "Voile Funeste", hero: "Prince", rarity: "common", maxTh11: 15, icon: "🕸️" },
    90000057: { name: "Cape des Ombres", hero: "Prince", rarity: "epic", maxTh11: 18, icon: "🧥", epic: true },
    90000060: { name: "Anneau Astral", hero: "Prince", rarity: "common", maxTh11: 15, icon: "💍" },
    90000061: { name: "Totem d'Élixir", hero: "Prince", rarity: "epic", maxTh11: 18, icon: "🗿", epic: true }
  },

  // TROUPES DU VILLAGE PRINCIPAL
  units: {
    4000000: { name: "Barbare", maxTh11: 8, icon: "⚔️", type: "elixir", housing: 1 },
    4000001: { name: "Archère", maxTh11: 8, icon: "🏹", type: "elixir", housing: 1 },
    4000002: { name: "Gobelin", maxTh11: 7, icon: "💰", type: "elixir", housing: 1, superUnlockedAt: 7, superName: "Super Gobelin" },
    4000003: { name: "Géant", maxTh11: 8, icon: "🛡️", type: "elixir", housing: 5 },
    4000004: { name: "Sapeur", maxTh11: 6, icon: "💣", type: "elixir", housing: 2, superUnlockedAt: 7, superName: "Super Sapeur" },
    4000005: { name: "Ballon", maxTh11: 7, icon: "🎈", type: "elixir", housing: 5 },
    4000006: { name: "Sorcier", maxTh11: 8, icon: "🔥", type: "elixir", housing: 4 },
    4000007: { name: "Guérisseuse", maxTh11: 5, icon: "🧚", type: "elixir", housing: 14 },
    4000008: { name: "Dragon", maxTh11: 6, icon: "🐲", type: "elixir", housing: 20 },
    4000009: { name: "P.E.K.K.A", maxTh11: 7, icon: "🤖", type: "elixir", housing: 25 },
    4000010: { name: "Bébé Dragon", maxTh11: 5, icon: "🐉", type: "elixir", housing: 10 },
    4000011: { name: "Mineur", maxTh11: 5, icon: "⛏️", type: "elixir", housing: 6 },
    4000012: { name: "Dragon Électrique", maxTh11: 2, icon: "⚡", type: "elixir", housing: 30 },
    4000013: { name: "Yéti", maxTh11: 1, icon: "❄️", type: "elixir", housing: 18 },
    4000015: { name: "Gargouille", maxTh11: 7, icon: "🦇", type: "dark_elixir", housing: 2 },
    4000017: { name: "Chevaucheur de Cochon", maxTh11: 7, icon: "🐗", type: "dark_elixir", housing: 5 },
    4000022: { name: "Valkyrie", maxTh11: 6, icon: "🪓", type: "dark_elixir", housing: 8 },
    4000023: { name: "Golem", maxTh11: 7, icon: "🪨", type: "dark_elixir", housing: 30 },
    4000024: { name: "Sorcière", maxTh11: 4, icon: "🧙‍♀️", type: "dark_elixir", housing: 12 }
  },

  // SORTS
  spells: {
    26000000: { name: "Sort de Foudre", maxTh11: 8, icon: "⚡", type: "elixir", housing: 1 },
    26000001: { name: "Sort de Guérison", maxTh11: 7, icon: "💛", type: "elixir", housing: 2 },
    26000002: { name: "Sort de Rage", maxTh11: 5, icon: "🟣", type: "elixir", housing: 2 },
    26000003: { name: "Sort de Saut", maxTh11: 3, icon: "🟩", type: "elixir", housing: 2 },
    26000005: { name: "Sort de Gel", maxTh11: 6, icon: "❄️", type: "elixir", housing: 1 },
    26000009: { name: "Sort de Poison", maxTh11: 5, icon: "🧪", type: "dark_elixir", housing: 1 },
    26000010: { name: "Sort de Séisme", maxTh11: 5, icon: "🌋", type: "dark_elixir", housing: 1 },
    26000011: { name: "Sort de Précipitation", maxTh11: 5, icon: "💨", type: "dark_elixir", housing: 1 },
    26000016: { name: "Sort de Clone", maxTh11: 5, icon: "👥", type: "elixir", housing: 3 },
    26000017: { name: "Sort de Squelettes", maxTh11: 5, icon: "💀", type: "dark_elixir", housing: 1 },
    26000028: { name: "Sort d'Invisibilité", maxTh11: 4, icon: "🌫️", type: "elixir", housing: 1 },
    26000035: { name: "Sort de Rappel", maxTh11: 2, icon: "🌀", type: "elixir", housing: 2 }
  },

  // PIÈGES
  traps: {
    12000000: { name: "Petite Bombe", maxTh11: 8, icon: "💣" },
    12000001: { name: "Piège à Ressort", maxTh11: 6, icon: "🌀" },
    12000002: { name: "Bombe Aérienne", maxTh11: 5, icon: "🎈" },
    12000005: { name: "Mine Chercheuse", maxTh11: 4, icon: "🖤" },
    12000006: { name: "Bombe Géante", maxTh11: 5, icon: "💥" },
    12000008: { name: "Piège Squelettique", maxTh11: 4, icon: "💀" },
    12000016: { name: "Piège Tornade", maxTh11: 2, icon: "🌪️" }
  },

  // AIDES & APPRENTIS
  helpers: {
    93000000: { name: "Apprenti Ouvrier", icon: "🔨", desc: "Accélère les chantiers de construction selon son niveau." },
    93000001: { name: "Apprenti Laboratoire", icon: "🔬", desc: "Accélère les recherches du laboratoire." }
  },

  // BASE DES OUVRIERS (MDO)
  builderBase: {
    1000057: { name: "Bâtiment MDO", icon: "🛠️" },
    1000033: { name: "Remparts MDO", icon: "🧱" },
    1000034: { name: "Maison des Ouvriers", icon: "🛖" },
    1000035: { name: "Extracteur d'Élixir MDO", icon: "🟣" },
    1000036: { name: "Mine d'Or MDO", icon: "🪙" },
    1000037: { name: "Réserve d'Élixir MDO", icon: "🧪" },
    1000038: { name: "Réserve d'Or MDO", icon: "💰" },
    1000039: { name: "Caserne MDO", icon: "⚔️" },
    1000040: { name: "Laboratoire MDO", icon: "🔬" },
    1000041: { name: "Canon MDO", icon: "💣" },
    1000042: { name: "Tour d'Archers MDO", icon: "🏹" },
    1000043: { name: "Double Canon MDO", icon: "💥" },
    1000044: { name: "Défense Anti-Aérienne MDO", icon: "🚀" },
    1000045: { name: "Écrapouilleur", icon: "🔨" },
    1000046: { name: "Tour de l'Horloge", icon: "⏰" },
    1000048: { name: "Canon Géant", icon: "💣" },
    1000049: { name: "Pétards", icon: "🎆" },
    1000050: { name: "BMulti-Mortier", icon: "💥" },
    1000051: { name: "Rôtissoire", icon: "🔥" },
    1000053: { name: "Tesla Camouflée MDO", icon: "⚡" },
    1000054: { name: "Poste de Garde", icon: "💂" },
    1000055: { name: "Camp Militaire MDO", icon: "🏕️" },
    1000056: { name: "Mine de Gemmes", icon: "💎" },
    1000058: { name: "Lava Launcher", icon: "🌋" },
    1000078: { name: "Cabane B.O.B MDO", icon: "🤖" },
    1000082: { name: "Cabane de soins", icon: "🩹" }
  },

  // STATION D'ARTISANAT DÉFENSIF (CRAFTED DEFENSE - v18.600.5)
  craftedDefense: {
    types: {
      103000011: {
        id: 103000011,
        name: "Bougie Ardente (Hot Candle)",
        shortName: "Bougie Ardente",
        icon: "🕯️",
        desc: "Défense thermique projetant de la cire enflammée en zone continue avec dégâts progressifs.",
        modules: [102000033, 102000034, 102000035]
      },
      103000012: {
        id: 103000012,
        name: "Chasseur de Héros (Hero Hunter)",
        shortName: "Chasseur de Héros",
        icon: "🎯",
        desc: "Arbalète lourde spécialisée avec fléchettes empoisonnées ciblant prioritairement les héros ennemis.",
        modules: [102000036, 102000037, 102000038]
      },
      103000013: {
        id: 103000013,
        name: "Catapulte Gourmande (Cake-a-pult)",
        shortName: "Catapulte Gourmande",
        icon: "🎂",
        desc: "Catapulte festive propulsant des bombes gâteaux à fort rayon de dégâts de zone.",
        modules: [102000039, 102000040, 102000041]
      }
    },
    modules: {
      102000033: { name: "Points de Vie (PV)", type: "hitpoints", maxLvl: 10, icon: "❤️" },
      102000034: { name: "Dégâts par seconde (DPS)", type: "damage", maxLvl: 10, icon: "⚔️" },
      102000035: { name: "Durée de Fusion", type: "trait", maxLvl: 10, icon: "🔥" },
      102000036: { name: "Points de Vie (PV)", type: "hitpoints", maxLvl: 10, icon: "❤️" },
      102000037: { name: "Dégâts Anti-Héros", type: "damage", maxLvl: 10, icon: "⚔️" },
      102000038: { name: "Ralentissement Poison", type: "trait", maxLvl: 10, icon: "🧪" },
      102000039: { name: "Points de Vie (PV)", type: "hitpoints", maxLvl: 10, icon: "❤️" },
      102000040: { name: "Dégâts de Projection", type: "damage", maxLvl: 10, icon: "💥" },
      102000041: { name: "Rayon de Splash", type: "trait", maxLvl: 10, icon: "🎂" }
    }
  }
};

// Fonctions utilitaires de décodage
function decodeBuilding(id) {
  return COC_DATA.buildings[id] || COC_DATA.builderBase[id] || { name: `Bâtiment #${id}`, category: "unknown", maxTh11: 1, icon: "🏗️" };
}

function decodeHero(id) {
  return COC_DATA.heroes[id] || { name: `Héros #${id}`, maxTh11: 50, icon: "🦸", color: "from-slate-500 to-gray-700" };
}

function decodeEquipment(id) {
  return COC_DATA.equipment[id] || { name: `Équipement #${id}`, hero: "Héros", rarity: "common", maxTh11: 15, icon: "⚙️" };
}

function decodeUnit(id) {
  return COC_DATA.units[id] || { name: `Unité #${id}`, maxTh11: 1, icon: "👾", type: "elixir" };
}

function decodeSpell(id) {
  return COC_DATA.spells[id] || { name: `Sort #${id}`, maxTh11: 1, icon: "✨", type: "elixir" };
}

function decodeTrap(id) {
  return COC_DATA.traps[id] || { name: `Piège #${id}`, maxTh11: 1, icon: "🪤" };
}

function decodeHelper(id) {
  return COC_DATA.helpers[id] || { name: `Aide #${id}`, icon: "👷" };
}

function decodeCraftedDefense(buildingData) {
  if (!buildingData || buildingData.data !== 1000097 || !Array.isArray(buildingData.types)) {
    return null;
  }

  const typesList = buildingData.types.map(t => {
    const typeMeta = COC_DATA.craftedDefense.types[t.data] || {
      id: t.data,
      name: `Type #${t.data}`,
      shortName: `Défense #${t.data}`,
      icon: "⚙️",
      desc: "Configuration modulaire saisonnière.",
      modules: []
    };

    const modules = (t.modules || []).map(m => {
      const modMeta = COC_DATA.craftedDefense.modules[m.data] || {
        name: `Module #${m.data}`,
        type: "unknown",
        maxLvl: 10,
        icon: "🔧"
      };
      return {
        id: m.data,
        name: modMeta.name,
        type: modMeta.type,
        icon: modMeta.icon,
        level: m.lvl || 1,
        maxLevel: modMeta.maxLvl || 10,
        progressPct: Math.round(((m.lvl || 1) / (modMeta.maxLvl || 10)) * 100)
      };
    });

    const sumLevel = modules.reduce((acc, cur) => acc + cur.level, 0);
    const maxPossibleLevel = modules.length * 10 || 30;

    return {
      id: t.data,
      name: typeMeta.name,
      shortName: typeMeta.shortName,
      icon: typeMeta.icon,
      desc: typeMeta.desc,
      modules,
      totalLevel: sumLevel,
      maxLevel: maxPossibleLevel,
      completionPct: Math.round((sumLevel / maxPossibleLevel) * 100)
    };
  });

  return {
    id: 1000097,
    name: "Station d'Artisanat Défensif",
    icon: "⚙️",
    types: typesList,
    activeType: typesList[0] || null, // Premier type actif par défaut
    totalTypesCount: typesList.length
  };
}

COC_DATA.decodeCraftedDefense = decodeCraftedDefense;

if (typeof window !== 'undefined') {
  window.COC_DATA = COC_DATA;
}

if (typeof global !== 'undefined') {
  global.COC_DATA = COC_DATA;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COC_DATA,
    decodeBuilding,
    decodeHero,
    decodeEquipment,
    decodeUnit,
    decodeSpell,
    decodeTrap,
    decodeHelper,
    decodeCraftedDefense
  };
}

