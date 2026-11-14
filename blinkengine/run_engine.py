#!/usr/bin/env python3
# ==============================================================================
# BlinkEngine — Master Runner & CLI Entrypoint
# NASA Space Apps Challenge 2026: Field Shift
# Launches the FastAPI Telemetry & Decision Support Microservice (Port 8000)
# ==============================================================================

import os
import sys
import uvicorn

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

def main():
    env = os.environ.get("ENV", "development").lower()
    is_production = env in ["production", "prod"]
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))

    print("=" * 75)
    print("  BlinkEngine — NASA Earth Observation Biophysical & Economic Microservice")
    print("  NASA Space Apps Challenge 2026 | Field Shift: Adapting Farms with NASA Data")
    print("=" * 75)
    print(f"  Environment: {env.upper()} | Host: {host} | Port: {port} | Reload: {not is_production}")
    print(f"  Swagger UI:  http://127.0.0.1:{port}/docs")
    print(f"  Health:      http://127.0.0.1:{port}/api/v1/health")
    print("=" * 75)
    uvicorn.run("api_server:app", host=host, port=port, reload=not is_production)

if __name__ == "__main__":
    main()
