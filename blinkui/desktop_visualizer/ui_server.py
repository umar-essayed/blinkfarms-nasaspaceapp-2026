# ==============================================================================
# BlinkFarms — Desktop Visualizer Local Embedded Server
# Provides High-Performance HTTP & JSON APIs for the Desktop DAG UI
# NASA Space Apps Challenge 2026: Field Shift
# ==============================================================================

import os
import sys
import json
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from typing import Dict, Any, Optional, Tuple

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from pipeline_graph import (
    DAG_COLUMNS, DAG_NODES, DAG_EDGES, EQUATIONS_REGISTRY, validate_dag_integrity,
    NASA_DATA_MISSIONS, NASA_LINEAGE_NODES, NASA_LINEAGE_EDGES, validate_nasa_lineage_integrity
)
from engine_bridge import execute_pipeline, PARCEL_PRESETS

ASSETS_DIR = os.path.join(CURRENT_DIR, "assets")

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class VisualizerHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ASSETS_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS for local development and desktop webviews
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/graph":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            payload = {
                "columns": DAG_COLUMNS,
                "nodes": DAG_NODES,
                "edges": DAG_EDGES,
                "equations": EQUATIONS_REGISTRY,
                "nasa_missions": NASA_DATA_MISSIONS,
                "nasa_lineage_nodes": NASA_LINEAGE_NODES,
                "nasa_lineage_edges": NASA_LINEAGE_EDGES
            }
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
        elif path == "/api/presets":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            summary_presets = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "region": p["region"],
                    "lat": p["lat"],
                    "lon": p["lon"],
                    "crop_name": p["crop_name"],
                    "soil_name": p["soil_name"],
                    "area_ha": p["area_ha"]
                }
                for p in PARCEL_PRESETS.values()
            ]
            self.wfile.write(json.dumps(summary_presets, ensure_ascii=False).encode("utf-8"))
        elif path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy", "service": "BlinkFarms-Desktop-DAG"}).encode("utf-8"))
        else:
            # Fall back to serving static files from ASSETS_DIR
            super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/execute":
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
            try:
                data = json.loads(raw_body)
            except Exception:
                data = {}

            preset_key = data.get("preset", "toshka")
            simulate_shock = bool(data.get("simulate_shock", False))

            result = execute_pipeline(preset_key=preset_key, simulate_shock=simulate_shock)

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))
        else:
            self.send_error(404, "Endpoint Not Found")

def start_server_in_thread(host: str = "127.0.0.1", port: int = 8765) -> Tuple[ThreadedHTTPServer, threading.Thread]:
    # If port is in use, try incrementing up to 5 times
    server = None
    for p in range(port, port + 10):
        try:
            server = ThreadedHTTPServer((host, p), VisualizerHTTPHandler)
            port = p
            break
        except OSError:
            continue

    if server is None:
        raise RuntimeError(f"Could not bind server to {host} on any port near {port}")

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread, port

if __name__ == "__main__":
    server, thread, actual_port = start_server_in_thread()
    print(f"Visualizer Server running at http://127.0.0.1:{actual_port}/")
    print("Press Ctrl+C to stop.")
    try:
        thread.join()
    except KeyboardInterrupt:
        server.shutdown()
