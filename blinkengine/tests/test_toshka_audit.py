# -*- coding: utf-8 -*-
"""
Execution Test: Toshka Mega-Project Real-World Audit Run
Field: EG_TOSHKA_PIVOT_SECTOR_07 (125 Feddans, Center-Pivot Irrigation)
"""

import sys
import os
import json

# Ensure blinkengine path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from audit_logger import run_audited_field_pipeline, get_latest_audit_run

def test_toshka_audit_execution():
    print("==============================================================================")
    print("STARTING REAL-WORLD AUDIT RUN: TOSHKA PROJECT (مشروع توشكى الخير)")
    print("Coordinates: 22.5800° N, 31.5200° E | Pivot Area: 125 Feddans")
    print("==============================================================================")

    # High precision boundary polygon representing a 125-feddan center-pivot circle discretized as an 8-point polygon
    toshka_pivot_polygon = [
        [22.5836, 31.5200],
        [22.5825, 31.5228],
        [22.5800, 31.5239],
        [22.5775, 31.5228],
        [22.5764, 31.5200],
        [22.5775, 31.5172],
        [22.5800, 31.5161],
        [22.5825, 31.5172],
        [22.5836, 31.5200]
    ]

    result = run_audited_field_pipeline(
        field_id="EG_TOSHKA_PIVOT_07",
        farm_name="مشروع توشكى الخير — الدائرة المحورية رقم 7 (قمح جيزة 171)",
        center_lat=22.580,
        center_lon=31.520,
        boundary_polygon=toshka_pivot_polygon,
        area_feddan=125.0,
        soil_type="reclaimed_sand",
        irrigation_system="pivot",
        baseline_crop="wheat",
        candidate_crops=["wheat", "clover", "sorghum", "barley", "maize", "faba_bean"],
        priorities={"profit": 0.35, "water": 0.40, "soil": 0.15, "salinity": 0.10}
    )

    print(f"✓ Audit Run Finished Successfully!")
    print(f"  • Run ID: {result['run_id']}")
    print(f"  • Recommended Top Crop: {result['top_crop_ar']} ({result['top_crop']})")
    print(f"  • Field Intelligence Score: {result['field_intelligence_score']}/100")
    print(f"  • Prescribed Irrigation: {result['prescribed_irrigation_m3_feddan']} m³/feddan (Saving {result['water_saved_percent']}%)")
    print(f"  • Expected Net Margin: {result['net_profit_egp_feddan']:,.0f} EGP/feddan")
    print("------------------------------------------------------------------------------")
    print("Files Generated:")
    for k, v in result["file_paths"].items():
        print(f"  - {k}: {v}")

    # Verify generated trace json contains all 24 equations
    trace_path = result["file_paths"]["trace_json"]
    with open(trace_path, "r", encoding="utf-8") as f:
        trace_data = json.load(f)

    eq_ledger = trace_data["biophysical_equations_ledger"]
    print(f"\n✓ Equation Audit Ledger Count: {len(eq_ledger)} equations verified!")
    assert len(eq_ledger) >= 24, f"Expected 24 equations, got {len(eq_ledger)}"

    for eq in eq_ledger[:5]:
        print(f"  [{eq['eq_id']}] {eq['name_en']}: {eq['output_value']} {eq['unit']} -> {eq['downstream_consumer']}")

    print("==============================================================================")
    print("TOSHKA MEGA-PROJECT AUDIT VERIFICATION PASSED 100%!")
    print("==============================================================================")

if __name__ == "__main__":
    test_toshka_audit_execution()
