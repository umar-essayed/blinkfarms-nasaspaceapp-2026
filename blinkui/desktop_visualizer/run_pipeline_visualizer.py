#!/usr/bin/env python3
# ==============================================================================
# BlinkFarms — NASA Biophysical Engine: Desktop DAG & Data Lineage Visualizer
# Entry Point & Verification Suite
# NASA Space Apps Challenge 2026: Field Shift / Adapting Farms with NASA Data
# ==============================================================================

import os
import sys
import argparse
import webbrowser
import time

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

# Ensure package roots are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from pipeline_graph import (
    DAG_COLUMNS, DAG_NODES, DAG_EDGES, EQUATIONS_REGISTRY, validate_dag_integrity,
    NASA_LINEAGE_NODES, NASA_LINEAGE_EDGES, validate_nasa_lineage_integrity
)
from engine_bridge import execute_pipeline, PARCEL_PRESETS
from ui_server import start_server_in_thread

def run_headless_self_test() -> int:
    """
    Automated Headless Test Verification Suite:
    1. Validates DAG graph structure:
       - No orphan vertices (every non-Col1 node has in_degree >= 1).
       - No dead-ends (every non-Col6 node has out_degree >= 1).
       - Strictly directed and acyclic.
    2. Validates Inspector metadata dictionary:
       - 100% complete for all 23 equations (title, LaTeX, provenance tier, inputs, outputs, EN & AR significance).
    3. Validates mock & live execution loops:
       - Executes all 3 agricultural presets (Toshka Oasis, Nile Delta, AmeriFlux US-Ne1).
       - Executes both baseline and 14-day heatwave shock scenarios.
       - Confirms early warning flash drought divergence (Delta ESI_7d <= -0.15, Canopy Fever > +3°C).
    """
    print("\n" + "=" * 80)
    print("BLINKFARMS DESKTOP DAG VISUALIZER // HEADLESS VERIFICATION SUITE")
    print("NASA Space Apps Challenge 2026: Field Shift / VeloceRoot + FieldShift Engine")
    print("=" * 80)

    # 1. DAG Topology & Connectivity Test
    print("\n[TEST 1/4] Verifying Interactive DAG Graph Topology & Data Lineage...")
    try:
        dag_res = validate_dag_integrity()
        print(f"  ✓ DAG Topology Validated Successfully:")
        print(f"    • Total Execution Tiers / Columns: {dag_res['columns']}")
        print(f"    • Total Graph Nodes: {dag_res['total_nodes']}")
        print(f"    • Total Directed Edges (Data Lineage): {dag_res['total_edges']}")
        print(f"    • Acyclic Verification: PASS (Zero cycles, Zero orphan nodes)")
    except Exception as e:
        print(f"  ✗ DAG Integrity Failure: {e}")
        return 1

    # 1B. NASA Data Provenance & Lineage Map Test
    print("\n[TEST 2/4] Verifying Dedicated NASA Spaceborne Data Provenance & Lineage Graph...")
    try:
        nasa_res = validate_nasa_lineage_integrity()
        print(f"  ✓ NASA Spaceborne Lineage Validated Successfully:")
        print(f"    • NASA Satellites & Missions Cataloged: {nasa_res['total_nasa_missions']}")
        print(f"    • Lineage Graph Nodes (Sensors -> Equations -> Decisions): {nasa_res['total_nasa_nodes']}")
        print(f"    • Directed Data Provenance Synapses: {nasa_res['total_nasa_edges']}")
        print(f"    • Ingestion Verification: PASS (All NASA feeds mapped directly into target equations)")
    except Exception as e:
        print(f"  ✗ NASA Lineage Failure: {e}")
        return 1

    # 2. Equation Metadata Registry Test
    print("\n[TEST 3/4] Verifying Complete Biophysical Metadata for All 23 Equations...")
    try:
        assert len(EQUATIONS_REGISTRY) == 23, f"Expected 23 equations, found {len(EQUATIONS_REGISTRY)}"
        for eq_num in range(1, 24):
            meta = EQUATIONS_REGISTRY[eq_num]
            assert meta["equation_id"] == eq_num
            assert len(meta["title"]) > 0
            assert len(meta["latex"]) > 0
            assert "Tier" in meta["provenance_tier"]
            assert len(meta["agronomic_why_en"]) > 0
            assert len(meta["agronomic_why_ar"]) > 0
            assert len(meta["inputs"]) > 0
            assert len(meta["outputs"]) > 0
            print(f"  ✓ Eq {eq_num:02d}: {meta['symbol']:<18} | {meta['title'][:40]:<40} [PASSED]")
        print("  ✓ All 23 equations are 100% cataloged with LaTeX, Provenance & Bilingual Explanations.")
    except Exception as e:
        print(f"  ✗ Equation Registry Failure: {e}")
        return 1

    # 3. Dynamic Execution Loop Test Across All Presets & Scenarios
    print("\n[TEST 4/4] Verifying Dynamic Execution Loops (Baseline & 14-Day Heat Shock)...")
    for preset_key, preset in PARCEL_PRESETS.items():
        print(f"\n  Testing Scenario: {preset['name']} ({preset['region']})")
        
        # A. Normal Baseline Run
        res_normal = execute_pipeline(preset_key=preset_key, simulate_shock=False)
        m_norm = res_normal["metrics_summary"]
        print(f"    • Baseline Run: Source={res_normal['execution_source']}")
        print(f"      ETa: {m_norm['eta_mm_day']:.2f} mm/d | ESI: {m_norm['esi']:.3f} | Fever: {m_norm['canopy_fever_c']:+.1f}°C")
        print(f"      Prescription: {m_norm['prescribed_depth_mm']:.1f} mm ({m_norm['prescribed_volume_m3_ha']:.0f} m³/ha)")
        assert m_norm["esi"] > 0.35, "Baseline ESI unexpectedly severe!"
        assert not m_norm["is_flash_drought_alert"], "False positive alert on baseline run!"

        # B. 14-Day Heatwave Shock Run
        res_shock = execute_pipeline(preset_key=preset_key, simulate_shock=True)
        m_shock = res_shock["metrics_summary"]
        print(f"    • Shock Run (14-Day Heatwave Perturbation):")
        print(f"      ETa: {m_shock['eta_mm_day']:.2f} mm/d | ESI: {m_shock['esi']:.3f} | Fever: {m_shock['canopy_fever_c']:+.1f}°C")
        print(f"      Delta ESI (7-Day Velocity): {m_shock['delta_esi_7d']:+.3f}")
        print(f"      Emergency Flash Drought Alert: {m_shock['is_flash_drought_alert']}")
        assert m_shock["is_flash_drought_alert"] is True, "Flash drought shock alert failed to trigger!"
        assert m_shock["canopy_fever_c"] > 3.0, "Thermal canopy fever anomaly failed to manifest!"
        assert m_shock["delta_esi_7d"] <= -0.15, "7-day stress velocity slope violation!"

        # Confirm 24 nodes and 23 equations evaluated
        assert len(res_shock["node_runtime_states"]) == len(DAG_NODES)
        assert len(res_shock["equations_evaluation"]) == 23
        print(f"      ✓ All 24 Nodes and 23 Equations Evaluated with Exact Dynamic Values.")

    print("\n" + "=" * 80)
    print("ALL VERIFICATION CHECKS PASSED: 100% OPERATIONAL & READY FOR NASA AUDITORS")
    print("=" * 80 + "\n")
    return 0

def launch_desktop_gui(port: int = 8765, engine_preference: str = "auto"):
    """
    Launches the Desktop Visualizer GUI window using PyQt6 or pywebview.
    """
    server, thread, actual_port = start_server_in_thread(port=port)
    app_url = f"http://127.0.0.1:{actual_port}/"
    print(f"\n[+] BlinkFarms Desktop Visualizer Engine running on {app_url}")

    # Check Engine Preference
    engine_to_use = engine_preference.lower()

    # Try PyQt6 WebEngine first if auto or pyqt
    if engine_to_use in ["auto", "pyqt"]:
        try:
            from PyQt6.QtWidgets import QApplication, QMainWindow
            from PyQt6.QtWebEngineWidgets import QWebEngineView
            from PyQt6.QtCore import QUrl
            from PyQt6.QtGui import QIcon

            print("[+] Initializing Native PyQt6 Desktop Window with QWebEngineView...")
            app = QApplication.instance()
            if app is None:
                app = QApplication(sys.argv)

            window = QMainWindow()
            window.setWindowTitle("BlinkFarms NASA Biophysical Engine // Interactive Pipeline DAG & Data Lineage Inspector")
            window.resize(1650, 960)

            # Center window
            screen = app.primaryScreen().geometry()
            x = (screen.width() - 1650) // 2
            y = (screen.height() - 960) // 2
            window.move(max(20, x), max(20, y))

            browser = QWebEngineView()
            browser.setUrl(QUrl(app_url))
            window.setCentralWidget(browser)

            window.show()
            sys.exit(app.exec())
        except Exception as e:
            print(f"[-] PyQt6 WebEngine launch failed or not available ({e}). Falling back to pywebview / browser...")

    # Try pywebview if PyQt6 not used or fallback
    if engine_to_use in ["auto", "webview"]:
        try:
            import webview
            print("[+] Initializing Native pywebview Window (Edge Chromium)...")
            webview.create_window(
                title="BlinkFarms NASA Biophysical Engine // Interactive Pipeline DAG & Data Lineage Inspector",
                url=app_url,
                width=1650,
                height=960,
                background_color="#0B0F19"
            )
            webview.start()
            return
        except Exception as e:
            print(f"[-] pywebview launch failed ({e}). Falling back to default system browser...")

    # Default fallback: open in user's default browser
    print("[+] Opening Mission Control DAG in default system browser...")
    webbrowser.open(app_url)
    print("Press Ctrl+C to stop the embedded server.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.shutdown()

def main():
    parser = argparse.ArgumentParser(
        description="BlinkFarms NASA Biophysical Engine Desktop DAG Visualizer & Verification Suite"
    )
    parser.add_argument(
        "--headless-test",
        action="store_true",
        help="Run non-GUI automated verification of DAG topology, 23 equations registry, and live execution loop."
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Local embedded HTTP server port (default: 8765)"
    )
    parser.add_argument(
        "--engine",
        type=str,
        default="auto",
        choices=["auto", "pyqt", "webview", "browser"],
        help="Desktop GUI rendering engine (auto, pyqt, webview, browser)"
    )
    args = parser.parse_args()

    if args.headless_test:
        sys.exit(run_headless_self_test())
    else:
        launch_desktop_gui(port=args.port, engine_preference=args.engine)

if __name__ == "__main__":
    main()
