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
    print("=" * 75)
    print("  BlinkEngine — NASA Earth Observation Biophysical & Economic Microservice")
    print("  NASA Space Apps Challenge 2026 | Field Shift: Adapting Farms with NASA Data")
    print("=" * 75)
    print("  Host: 0.0.0.0 | Port: 8000 | Reload: Enabled")
    print("  Swagger UI: http://127.0.0.1:8000/docs")
    print("  Health:     http://127.0.0.1:8000/health")
    print("=" * 75)
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
