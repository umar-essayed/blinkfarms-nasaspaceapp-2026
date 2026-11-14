# ==============================================================================
# BlinkEngine — Official Comprehensive Verification Suite (NASA Space Apps 2026)
# Tests All 24 Biophysical & Economic Equations, 6 Edge Cases, 48 FAO-56 Crops,
# 16D Vector Memory Store (Centered Cosine + RBF), and Dynamic TOPSIS Optimizer
# ==============================================================================

import os
import sys
import numpy as np

# Ensure blinkengine root is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ENGINE_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if ENGINE_ROOT not in sys.path:
    sys.path.insert(0, ENGINE_ROOT)

from models import (
    calc_ndvi, calc_savi, calc_fc, erode_polygon_buffer_30m,
    downscale_smap_mass_conserved, reconstruct_canopy_temp_sar,
    calc_pt_jpl_constraints, calc_pt_jpl_fluxes, calc_baseline_lec,
    calc_advection_decoupled_lec, calc_actual_eta, calc_esi,
    check_flash_drought_alert, calc_canopy_fever_anomaly,
    calc_prescriptive_irrigation, calc_closed_loop_soil_error,
    build_field_memory_state, simulate_fao56_daily_balance,
    calc_stewart_yield, calc_soil_health_index, solve_dynamic_topsis,
    calc_daily_gdd, calc_aquacrop_biomass, calc_harvest_index_heat_adjusted,
    calc_dual_soil_erosion_index
)

from economic_engine import (
    calc_single_crop_economics,
    convert_n_kg_ha_to_urea_bags_feddan
)

from crop_rotation_engine import (
    run_rotation_simulation,
    run_agronomic_beam_search,
    is_agronomically_valid_transition,
    ROTATION_CROPS
)

from master_crop_database import (
    get_all_master_crops,
    get_master_crop_by_id,
    get_crops_by_category,
    get_agronomic_categories,
    filter_crops_by_soil_and_climate,
    ROTATION_CROPS_48
)

from field_memory_store import (
    calc_saxton_rawls_hydrology,
    generate_16d_field_vector,
    compute_hybrid_analogue_similarity,
    GLOBAL_FIELD_MEMORY_STORE
)


def test_24_biophysical_and_economic_equations():
    """Validates numerical stability and physical conservation of all 24 equations."""
    print("\n--- [TEST SUITE 1] Validating All 24 Biophysical & Economic Equations ---")

    # Eq 1: NDVI
    ndvi_val = calc_ndvi(0.65, 0.12)
    assert 0.0 < ndvi_val <= 1.0
    assert np.isclose(ndvi_val, (0.65 - 0.12) / (0.65 + 0.12), atol=1e-4)

    # Eq 2: SAVI
    savi_val = calc_savi(0.65, 0.12, L=0.5)
    assert 0.0 < savi_val <= 1.0

    # Eq 3: fc (Fractional Cover)
    fc_val = calc_fc(0.68)
    assert 0.0 <= fc_val <= 1.0

    # Eq 4: Inward Buffer Erosion (-30m)
    raw_poly = [(41.160, -96.480), (41.160, -96.470), (41.170, -96.470), (41.170, -96.480)]
    eroded_poly = erode_polygon_buffer_30m(raw_poly)
    assert len(eroded_poly) == 4
    c_raw = np.mean(raw_poly, axis=0)
    d_raw = np.linalg.norm(np.array(raw_poly[0]) - c_raw)
    d_eroded = np.linalg.norm(np.array(eroded_poly[0]) - c_raw)
    assert d_eroded < d_raw

    # Eq 5: Mass-Conserved Downscaling
    theta_coarse = 0.280
    np.random.seed(42)
    features = np.random.uniform(0.1, 0.9, (100, 3))
    weights = np.array([0.15, 0.10, 0.08])
    theta_30m = downscale_smap_mass_conserved(theta_coarse, features, weights)
    assert np.isclose(np.mean(theta_30m), theta_coarse, atol=1e-12)

    # Eq 6: Virtual Thermal PINN under Clouds
    tc_virtual = reconstruct_canopy_temp_sar(t_air=30.0, delta_sigma_vv_vh=0.25, theta_root=0.18, vpd=2.8)
    assert tc_virtual > 30.0

    # Eq 7: PT-JPL Constraints (Baseline & Toshka Extreme Hyper-Arid)
    constraints = calc_pt_jpl_constraints(t_air=32.0, rh=0.35, f_apar=0.75, f_ipar=0.85, theta_root=0.26)
    for k in ["epsilon", "f_wet", "f_g", "f_T", "f_M", "f_SM"]:
        assert 0.0 <= constraints[k] <= 1.0
    c_extreme = calc_pt_jpl_constraints(t_air=43.5, rh=0.12, f_apar=0.70, f_ipar=0.80, theta_root=0.14)
    assert c_extreme["vpd"] > 4.0

    # Eq 8: Net Radiation Partitioning & Latent Heat
    fluxes = calc_pt_jpl_fluxes(r_net=480.0, fc=0.70, constraints=constraints)
    assert fluxes["le_c"] > 0 and fluxes["le_s"] > 0
    assert np.isclose(fluxes["r_nc"] + fluxes["r_ns"], 480.0)

    # Eq 9: Advection Decoupling
    le_c = fluxes["le_c"]
    le_c_decoupled = calc_advection_decoupled_lec(le_c, u_wind=4.5, grad_tsurface=5.0, d_edge=100.0)
    assert 0 < le_c_decoupled <= le_c

    # Eq 10: Actual Evapotranspiration ET_a
    le_total, eta_mm = calc_actual_eta(le_c_decoupled, le_soil=35.0)
    assert 1.0 <= eta_mm <= 12.0

    # Eq 11: ESI Index
    esi = calc_esi(et_a=eta_mm, pet=7.5)
    assert 0.0 <= esi <= 1.0

    # Eq 12: Flash Drought Velocity
    is_alert, delta_7d = check_flash_drought_alert(esi_t=0.32, esi_t_minus_7=0.52, gdd_accum=800, gdd_maturity=1300)
    assert is_alert is True and delta_7d <= -0.15

    # Eq 13: Canopy Fever Anomaly
    canopy_fever = calc_canopy_fever_anomaly(t_canopy=34.8, t_air=30.0, t_baseline_delta=-2.5)
    assert np.isclose(canopy_fever, 7.3)

    # Eq 14: Prescriptive Irrigation Volume
    depth_mm, vol_m3 = calc_prescriptive_irrigation(theta_fc=0.32, theta_current=0.22, z_r=1.2, area_ha=65.0)
    assert depth_mm == 120.0 and vol_m3 == 78000.0

    # Eq 15: Closed-Loop Soil Probing
    probe_diag = calc_closed_loop_soil_error(0.08, 0.18, 0.9, 2.5, 0.85, 1.8)
    assert probe_diag["hardpan_detected"] is True
    assert np.isclose(sum(probe_diag["diagnostic_breakdown"].values()), 1.0, atol=1e-2)

    # Eq 16: 10-Year Field Memory State Vector
    f_state = build_field_memory_state(
        theta_preplant=0.22, theta_wp=0.14, theta_fc=0.34,
        esi_history=[0.35, 0.38, 0.55, 0.32, 0.60],
        heat_load_accum=1420.0, xi_soil_error=probe_diag["xi_soil_error"],
        prev_crop="maize", ec_e_dsm=3.8, leaching_fraction=0.12
    )
    assert 0.0 <= f_state["phi_carryover"] <= 1.0

    # Eq 17: FAO-56 Daily Root Zone Balance
    et0_sim = np.full(30, 6.0)
    precip_sim = np.zeros(30)
    precip_sim[10] = 25.0
    kc_sim = np.full(30, 1.15)
    fao_res = simulate_fao56_daily_balance(30, et0_sim, precip_sim, kc_sim, 0.32, 0.14, 1.2, 0.55, 40.0)
    assert len(fao_res["dr"]) == 30
    assert 0.0 <= np.min(fao_res["ks"]) <= 1.0

    # Eq 18: Stewart Water-Yield Production Function
    sum_eta = float(np.sum(fao_res["eta"]))
    sum_etc = float(np.sum(kc_sim * et0_sim))
    y_ratio, fail_risk = calc_stewart_yield(sum_eta, sum_etc, ky=1.25)
    assert 0.10 <= y_ratio <= 1.0

    # Eq 19: Structural Soil Health Index
    shi_val = calc_soil_health_index(delta_n_bio=95.0, residue_biomass=3.8, z_r_max=1.6, p_pest=0.0)
    assert 50.0 <= shi_val <= 98.0

    # Eq 20: Dynamic TOPSIS Multi-Criteria Solver
    matrix = np.array([
        [2350.0, 31.0, 88.0, 11.0],
        [2210.0, 45.0, 82.0, 8.0],
        [1860.0, 0.0,  24.0, 74.0],
    ])
    weights = np.array([0.25, 0.35, 0.25, 0.15])
    is_benefit = [True, True, True, False]
    topsis_scores = solve_dynamic_topsis(matrix, weights, is_benefit)
    assert topsis_scores[0] > topsis_scores[2]

    # Eq 21: Growing Degree Days (GDD)
    gdd = calc_daily_gdd(t_max=32.0, t_min=18.0, t_base=10.0)
    assert np.isclose(gdd, 15.0)

    # Eq 22: AquaCrop Transpiration-to-Biomass
    biomass = calc_aquacrop_biomass(wp_star=32.0, sum_tr_et0=55.0, f_temp=0.95, f_salinity=0.90)
    assert np.isclose(biomass, (32.0 / 100.0) * 55.0 * 0.95 * 0.90, atol=1e-2)

    # Eq 23: AquaCrop Pollination Heat Shock
    hi_adj, f_heat, yield_loss = calc_harvest_index_heat_adjusted(0.45, 34.0, 31.0, 0.035, 0.90)
    assert f_heat < 1.0 and hi_adj < 0.45

    # Eq 24: Dual Soil Erosion Index (RUSLE Water + WEQ Wind)
    erosion_storm = calc_dual_soil_erosion_index(120.0, 32.0, 6.2, 0.85, 3.5, "alluvial_clay", 0.08, 0.70)
    assert erosion_storm["annual_wind_loss_ton_ha"] > 0.0
    erosion_calm = calc_dual_soil_erosion_index(120.0, 10.0, 3.5, 0.75, 2.0)
    assert erosion_calm["annual_wind_loss_ton_ha"] == 0.0

    print("✓ All 24 Biophysical & Economic Equations validated successfully!")


def test_6_implementation_edge_cases():
    """Validates the 6 critical agronomic and computational edge cases."""
    print("\n--- [TEST SUITE 2] Validating 6 Implementation Edge Cases ---")

    # Edge Case 1: Zero double counting & Urea Bag Conversion
    bags = convert_n_kg_ha_to_urea_bags_feddan(140.0)
    assert np.isclose(bags, (140.0 * 0.42) / 23.0, atol=1e-2)

    econ = calc_single_crop_economics(
        crop_id="wheat", yield_ratio_ya_ym=0.95, area_feddan=1.0,
        urea_bags_saved_per_feddan=2.5, water_saved_m3_per_feddan=120.0
    )
    assert econ["baseline_input_cost_per_feddan_egp"] == 14500.0
    assert econ["fertilizer_savings_egp"] == 2.5 * 950.0

    # Edge Case 2: Wind threshold strict cutoff (u <= uth -> zero erosion)
    e_calm = calc_dual_soil_erosion_index(precip_annual_mm=50, i30_burst_mm_hr=10, u_wind_ms=4.49, u_threshold_ms=4.50)
    assert e_calm["annual_wind_loss_ton_ha"] == 0.0

    # Edge Case 3: Beam Search F_state future awareness
    beam_res = run_agronomic_beam_search(
        initial_memory={"ecSalinityDsM": 3.2, "hardpanDetected": True, "previousCropId": "wheat"},
        is_sandy_soil=True, beam_width=10
    )
    assert beam_res["legal_paths_screened"] > 0
    assert len(beam_res["balanced_sequence"]) == 6

    # Edge Case 4: Perennial succession allowed & sandy soil nematode pruning
    alfalfa = ROTATION_CROPS["alfalfa"]
    maize = ROTATION_CROPS["maize"]
    beet = ROTATION_CROPS["sugar_beet"]
    peanut = ROTATION_CROPS["peanut"]
    assert is_agronomically_valid_transition(alfalfa, alfalfa, "winter", 2.0, False) is True
    assert is_agronomically_valid_transition(maize, maize, "summer", 2.0, False) is False
    assert is_agronomically_valid_transition(peanut, beet, "summer", 2.0, is_sandy_soil=True) is False

    # Edge Case 5: SAVI coupling in sandy soils (sand_fraction > 0.5)
    fc_standard = calc_fc(ndvi=0.65)
    fc_sandy = calc_fc(ndvi=0.65, savi=0.45, sand_fraction=0.75)
    assert fc_sandy != fc_standard

    # Edge Case 6: 16D Vector Centered Cosine + RBF Kernel (Zero Angle Deception)
    v_low = np.full(16, 0.15)
    v_high = np.full(16, 0.85)
    sim = compute_hybrid_analogue_similarity(v_low, v_high)
    assert sim < 0.60, f"Angle deception detected: similarity {sim} >= 0.60"

    print("✓ All 6 Implementation Edge Cases verified successfully!")


def test_master_crop_database_48_crops():
    """Validates the 48-crop database across all 8 agronomic categories."""
    print("\n--- [TEST SUITE 3] Validating 48-Crop Master Database ---")

    crops = get_all_master_crops()
    assert len(crops) == 48, f"Expected 48 crops, found {len(crops)}"

    categories = get_agronomic_categories()
    assert len(categories) == 8, f"Expected 8 agronomic categories, got {len(categories)}"

    # Check category distribution
    expected_categories = [
        "cereals", "legumes", "vegetables", "roots_tubers",
        "oilseeds_fiber", "forages", "fruits_orchards", "sugar_specialty"
    ]
    for cat in expected_categories:
        cat_crops = get_crops_by_category(cat)
        assert len(cat_crops) > 0, f"Category {cat} has 0 crops!"

    # Verify every crop has essential physical & economic parameters
    for cid, c in crops.items():
        assert c["potential_yield_ton_feddan"] > 0, f"Crop {cid} missing potential yield"
        assert c["wp_star"] > 0, f"Crop {cid} missing WP*"
        assert c["market_suitability"] > 0, f"Crop {cid} missing market suitability index"
        assert len(c["stage_days"]) == 4, f"Crop {cid} missing 4 growth stages"

    print("✓ 48-Crop Master Database across 8 Agronomic Categories verified 100%!")


def test_field_memory_and_rotation_simulation():
    """Validates 10-year field memory registration, top-K search, and multi-season rotation."""
    print("\n--- [TEST SUITE 4] Validating Field Memory Store & Rotation Simulation ---")

    rec = GLOBAL_FIELD_MEMORY_STORE.register_or_update_field(
        field_id="field_new_valley_01",
        polygon_coords=[(25.45, 30.55), (25.46, 30.55), (25.46, 30.56), (25.45, 30.56)],
        area_feddan=50.0,
        soil_type="sandy",
        sand_pct=82.0,
        clay_pct=9.0,
        soc_g_kg=4.1,
        twi=3.8,
        grace_anomaly_cm_yr=-2.1,
        current_ec_dsm=3.5,
        hardpan_detected=False,
        theta_carryover_frac=0.30,
        residual_n_kg_ha=20.0,
        drought_freq_ratio=0.60,
        mean_temp_anomaly_c=2.1,
        wind_speed_mean_ms=5.0,
        gdd_seasonal_sum=2100.0,
        mean_esi=0.42,
        flash_drought_count_3yr=2
    )
    assert rec["field_id"] == "field_new_valley_01"
    assert len(rec["state_vector_16d"]) == 16

    sim_res = run_rotation_simulation(
        lat=25.45,
        lon=30.55,
        priorities={"profit": 40, "water": 35, "soil": 15, "risk": 10},
        field_memory=rec,
        area_feddan=50.0
    )
    assert "strategies" in sim_res
    assert len(sim_res["strategies"]) >= 3
    for s in sim_res["strategies"]:
        assert len(s["seasons"]) == 6
        assert s["totalNetProfitUsdHa"] > 0
        assert s["totalWaterSavedM3Feddan"] >= 0

    print("✓ Field Memory Store & 6-Season Rotation Simulation verified 100%!")


def test_security_persistence_and_empirical_benchmarks():
    """Validates security, disk persistence, and empirical validation separation."""
    print("\n--- [TEST SUITE 5] Validating P0 & P1 Production Fixes ---")

    from nasa_client import NASA_API_KEY, EARTHDATA_BEARER_TOKEN, verify_nasa_power_connection
    from historical_validation import run_ameriflux_us_ne1_benchmark, run_synthetic_stress_benchmark

    # 1. No hardcoded private keys
    assert NASA_API_KEY in ["DEMO_KEY", ""] or not NASA_API_KEY.startswith("CfJT"), "Exposed private NASA API key detected!"
    assert not EARTHDATA_BEARER_TOKEN.startswith("eyJ0eXAiOiJKV1QiLCJvcmlnaW4iOiJFYXJ0aGRhdGEgTG9naW4iLCJzaWciOiJlZGxqd3RwdWJrZXlfb3Bz"), "Exposed private Earthdata token detected!"

    # 2. Field Memory persistence to disk
    test_id = "test_persistence_field_01"
    GLOBAL_FIELD_MEMORY_STORE.register_or_update_field(
        field_id=test_id,
        polygon_coords=[(30.0, 31.0), (30.1, 31.0), (30.1, 31.1), (30.0, 31.1)],
        area_feddan=20.0
    )
    assert GLOBAL_FIELD_MEMORY_STORE.get_field(test_id) is not None
    cache_path = os.path.join(ENGINE_ROOT, "field_memory_cache.json")
    assert os.path.exists(cache_path), f"Disk cache file {cache_path} was not created!"

    # 3. AmeriFlux Empirical Validation vs Synthetic Separation
    empirical_res = run_ameriflux_us_ne1_benchmark()
    assert empirical_res["is_synthetic"] is False
    assert empirical_res["r_squared"] >= 0.80
    assert empirical_res["rmse_mm_day"] < 2.2

    synthetic_res = run_synthetic_stress_benchmark()
    assert synthetic_res["is_synthetic"] is True
    assert synthetic_res["early_warning_lead_time_days"] == 14

    print("✓ P0 & P1 Security, Persistence, and Empirical Validation verified 100%!")


if __name__ == "__main__":
    test_24_biophysical_and_economic_equations()
    test_6_implementation_edge_cases()
    test_master_crop_database_48_crops()
    test_field_memory_and_rotation_simulation()
    test_security_persistence_and_empirical_benchmarks()
    print("\n" + "=" * 75)
    print("ALL BLINKENGINE TESTS PASSED WITH 100% SUCCESS — READY FOR NASA AUDIT!")
    print("=" * 75)
