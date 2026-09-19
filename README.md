# ⚡ CoC Freemium Optimizer

Salut ! Voici ton dashboard perso pour optimiser ton village Clash of Clans (**HDV 11**, compte `#GUQLRP8LV`). 

L'idée : analyser l'état de ton village en un coup d'œil, éviter les erreurs de rush et maximiser ta progression sans mettre un centime dans le jeu.

---

## 🚀 Démarrage en 2 secondes

Tu as deux façons ultra simples de le lancer :

### Option 1 : Avec le serveur Python (recommandé)
Pas besoin d'installer de paquets `pip`, tout tourne avec la bibliothèque standard :
```bash
python3 app.py
```
👉 Ouvre ensuite ton navigateur sur **[http://localhost:8080](http://localhost:8080)**.

### Option 2 : Mode chill / hors ligne
Tu peux aussi double-cliquer directement sur le fichier `public/index.html` dans ton navigateur. Tout fonctionne en local avec les données embarquées.

---

## 🎯 Ce que fait le dashboard

- 🚨 **Alerte Anti-Rush Héros** : Te dit cash où tu en es. Tes héros (Roi 24, Reine 24, Gardien 10) sont à ~48% de leur niveau max HDV 11. Le conseil d'or : **ne passe surtout pas HDV 12** avant d'avoir monté tes héros au moins au niveau 45/45/18 sous peine de souffrir en guerre et en farm.
- 💰 **Plan de Farm Super Gobelins** : Vu que tes gobelins sont niveau 7, les Super Gobelins sont débloqués. Le dashboard te donne la compo parfaite (76 Super Gobelins, 4 Sauts, 3 Invisi) pour engranger 25k à 40k d'Élixir Noir par heure en ligue Or/Cristal.
- 💎 **Paliers Équipements (Multiples de 3)** : Les équipements ne débloquent leurs gros boosts qu'aux niveaux 3, 6, 9, 12, 15 et 18. Le dashboard repère les *Quick Wins* (ceux qui ne demandent qu'un seul niveau) et te dit où claquer tes minerais en priorité (Gantelet Géant, Tome Éternel).
- 🧱 **Suivi des Murs & Chronos en direct** : 194 murs maxés sur 300 (64.7%) et des comptes à rebours qui défilent à la seconde pour tous tes chantiers en cours (bâtiments, labo et ouvriers).
- 📂 **Drag & Drop à chaud** : Tu as un nouveau JSON de ton village ? Glisse-le directement sur la page ou colle-le dans la modale : tout se recalcule instantanément sans recharger.

---

## 📁 En coulisses

```text
├── app.py                 # Le petit serveur Python (proxy API + fallback local)
├── data/
│   └── village_state.json # Les données sources de ton village
└── public/
    ├── index.html         # La page web (interface Dark Liquid Glass)
    ├── css/style.css      # Le style glassmorphism soigné
    └── js/
        ├── coc_data.js    # Dico pour traduire les IDs du jeu en noms clairs
        ├── analysis.js    # Moteur de calculs et de conseils freemium
        └── app.js         # Gestion des timers live et graphiques
```

Bon farm et bon jeu ! ⚔️
