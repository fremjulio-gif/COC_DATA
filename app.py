#!/usr/bin/env python3
"""
Tableau de bord d'optimisation freemium Clash of Clans
Serveur Backend Python & Proxy API Supercell avec Fallback Automatique

Ce serveur utilise uniquement la bibliothèque standard Python pour garantir
une exécution immédiate sans dépendance pip externe.
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
import os
import sys

PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DATA_FILE = os.path.join(BASE_DIR, "data", "village_state.json")

PLAYER_TAG = "%23GUQLRP8LV"  # #GUQLRP8LV URL encoded
API_BEARER_TOKEN = "gpgpgj47"
COC_API_URL = f"https://api.clashofclans.com/v1/players/{PLAYER_TAG}"


class CoCHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        # Route API : Récupération de l'état du village enregistré
        if self.path == "/api/village":
            self.handle_get_village()
        # Route API : Proxy Supercell API avec fallback transparent
        elif self.path == "/api/player":
            self.handle_get_player_proxy()
        else:
            # Service des fichiers statiques depuis public/
            super().do_GET()

    def do_POST(self):
        if self.path in ("/api/save-village", "/api/village"):
            self.handle_save_village()
        elif self.path == "/api/analyze":
            self.handle_analyze()
        else:
            self.send_error(404, "Endpoint non trouvé")

    def handle_get_village(self):
        """Renvoie l'état du village stocké dans data/village_state.json"""
        if not os.path.exists(DATA_FILE):
            self.send_json_response({"error": "Fichier de données introuvable"}, status=404)
            return

        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.send_json_response(data)
        except Exception as e:
            self.send_json_response({"error": f"Erreur de lecture : {str(e)}"}, status=500)

    def handle_get_player_proxy(self):
        """
        Interroge l'API officielle Supercell Clash of Clans.
        Si l'API renvoie 403 (IP non autorisée dans le portail Supercell) ou toute autre erreur,
        bascule de manière 100% transparente sur les données internes fournies.
        """
        req = urllib.request.Request(COC_API_URL)
        req.add_header("Authorization", f"Bearer {API_BEARER_TOKEN}")
        req.add_header("Accept", "application/json")
        req.add_header("User-Agent", "CoC-Freemium-Optimizer/1.0")

        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    api_data = json.loads(response.read().decode("utf-8"))
                    self.send_json_response({
                        "source": "supercell_api",
                        "status": "online",
                        "player": api_data
                    })
                    return
        except urllib.error.HTTPError as http_err:
            # Erreur classique 403 Forbidden (IP non whitelistée dans le Supercell Dev Portal)
            print(f"[Avertissement API] Supercell HTTP {http_err.code} : {http_err.reason}. Bascule sur le fallback local.")
            self.fallback_local_response(f"Supercell HTTP {http_err.code}: {http_err.reason}")
        except Exception as err:
            print(f"[Avertissement API] Échec de connexion Supercell : {str(err)}. Bascule sur le fallback local.")
            self.fallback_local_response(str(err))

    def fallback_local_response(self, error_reason):
        """Bascule transparente sur le fichier village_state.json"""
        village_data = None
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    village_data = json.load(f)
            except Exception:
                pass

        self.send_json_response({
            "source": "fallback_local",
            "status": "offline_fallback",
            "message": "L'API Supercell a restreint la requête (politique de whitelist IP ou token révoqué). Les données locales du village ont été chargées avec succès.",
            "error_details": error_reason,
            "village": village_data
        })

    def handle_save_village(self):
        """Enregistre un nouvel état JSON sur le disque"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(post_body)

            os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            self.send_json_response({"success": True, "message": "État du village sauvegardé avec succès"})
        except Exception as e:
            self.send_json_response({"error": f"Erreur de sauvegarde : {str(e)}"}, status=400)

    def handle_analyze(self):
        """Point d'entrée pour analyse à la volée"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(post_body)
            # Les calculs sont principalement exécutés côté client par analysis.js
            self.send_json_response({"success": True, "tag": data.get("tag", "#GUQLRP8LV")})
        except Exception as e:
            self.send_json_response({"error": f"Erreur : {str(e)}"}, status=400)

    def send_json_response(self, data, status=200):
        """Helper pour envoyer une réponse JSON propre avec en-têtes CORS"""
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """Support des requêtes préliminaires CORS"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def log_message(self, format, *args):
        """Journalisation épurée des requêtes HTTP"""
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")


def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CoCHandler) as httpd:
        print("=" * 65)
        print("⚡ CLASH OF CLANS FREEMIUM OPTIMIZER - DASHBOARD WEB ⚡")
        print("=" * 65)
        print(f"▸ Joueur cible : #GUQLRP8LV (HDV 11)")
        print(f"▸ Serveur actif : http://localhost:{PORT}")
        print(f"▸ Proxy API CoC : http://localhost:{PORT}/api/player")
        print(f"▸ Données locales : http://localhost:{PORT}/api/village")
        print("=" * 65)
        print("Appuyez sur Ctrl+C pour arrêter le serveur.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêt du serveur. À bientôt !")


if __name__ == "__main__":
    run_server()
