#!/usr/bin/env python3
"""
CoC Freemium Optimizer — Serveur Local Python Standard (Exécuté via uv)
Prise en charge de /api/village (GET/POST sécurisé) et /api/player (Proxy Supercell avec fallback)
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
COC_API_TOKEN = os.environ.get("COC_API_TOKEN", "gpgpgj47")
SYNC_SECRET = os.environ.get("SYNC_SECRET", None)
COC_API_URL = f"https://api.clashofclans.com/v1/players/{PLAYER_TAG}"


class CoCHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/api/village":
            self.handle_get_village()
        elif self.path == "/api/player":
            self.handle_get_player_proxy()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path in ("/api/village", "/api/save-village"):
            self.handle_save_village()
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
        """Interroge l'API officielle Supercell ou bascule sur le fallback local"""
        req = urllib.request.Request(COC_API_URL)
        req.add_header("Authorization", f"Bearer {COC_API_TOKEN}")
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
            print(f"[Avertissement API] Supercell HTTP {http_err.code} : {http_err.reason}. Bascule locale.")
            self.fallback_local_response(f"Supercell HTTP {http_err.code}: {http_err.reason}")
        except Exception as err:
            print(f"[Avertissement API] Erreur : {str(err)}. Bascule locale.")
            self.fallback_local_response(str(err))

    def fallback_local_response(self, error_reason):
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
            "message": "Données locales chargées avec succès.",
            "error_details": error_reason,
            "village": village_data
        })

    def handle_save_village(self):
        """Sauvegarde sécurisée d'un état JSON"""
        # Contrôle du jeton SYNC_SECRET si configuré
        if SYNC_SECRET:
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()
            if token != SYNC_SECRET:
                self.send_json_response({"error": "Accès refusé : SYNC_SECRET invalide."}, status=401)
                return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 512000:
                self.send_json_response({"error": "Charge utile trop volumineuse (> 500 Ko)."}, status=413)
                return

            post_body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(post_body)

            if not isinstance(data, dict) or not data.get("tag"):
                self.send_json_response({"error": "Données invalides : champ 'tag' requis."}, status=400)
                return

            os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            self.send_json_response({"success": True, "message": "État du village sauvegardé localement."})
        except Exception as e:
            self.send_json_response({"error": f"Erreur de sauvegarde : {str(e)}"}, status=400)

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Sync-Secret")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Sync-Secret")
        self.end_headers()

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")


def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CoCHandler) as httpd:
        print("=" * 65)
        print("⚡ CLASH OF CLANS FREEMIUM OPTIMIZER — SERVEUR LOCAL UV ⚡")
        print("=" * 65)
        print(f"▸ Serveur actif : http://localhost:{PORT}")
        print(f"▸ Données locales : http://localhost:{PORT}/api/village")
        print(f"▸ Proxy API CoC : http://localhost:{PORT}/api/player")
        print("=" * 65)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêt du serveur. À bientôt !")


if __name__ == "__main__":
    run_server()
