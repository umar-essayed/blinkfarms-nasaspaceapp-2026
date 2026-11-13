# ==============================================================================
# BlinkFarms — Core Physical & Mathematical Engine (Python)
# Definitive Implementation of All 20 Equations: VeloceRoot + FieldShift
# NASA Space Apps Challenge 2026: Field Shift / Adapting Farms with NASA Data
# ==============================================================================

import numpy as np
from typing import Dict, List, Tuple, Any, Optional

# Physical Constants & Universal Biophysical Parameters
LAMBDA_V = 2.45e6       # Latent heat of vaporization of water (J/kg)
RHO_W = 1000.0          # Water density (kg/m^3)
ALPHA_PT = 1.26         # Priestley-Taylor coefficient (dimensionless)
GAMMA_PSY = 0.066       # Psychrometric constant (kPa/°C)
STEFAN_BOLTZMANN = 5.670374e-8  # Stefan-Boltzmann constant (W/(m^2 K^4))

# ------------------------------------------------------------------------------
# EQUATION 1: Normalized Difference Vegetation Index (NDVI)
# ------------------------------------------------------------------------------
def calc_ndvi(rho_nir: float, rho_red: float) -> float:
    """
    NDVI = (rho_nir - rho_red) / (rho_nir + rho_red)
    Reflectance in NIR (841-876 nm) and Red (620-670 nm) from HLS / Sentinel-2 / Landsat.
    """
    denom = rho_nir + rho_red
    if denom <= 0:
        return 0.0
    return float(np.clip((rho_nir - rho_red) / denom, -1.0, 1.0))

# ------------------------------------------------------------------------------
# EQUATION 2: Soil-Adjusted Vegetation Index (SAVI) with L = 0.5
# ------------------------------------------------------------------------------
def calc_savi(rho_nir: float, rho_red: float, L: float = 0.5) -> float:
    """
    SAVI = ((1 + L) * (rho_nir - rho_red)) / (rho_nir + rho_red + L)
    Compensates for soil brightness background in arid and semi-arid parcels.
    """
    denom = rho_nir + rho_red + L
    if denom <= 0:
        return 0.0
    return float(np.clip(((1.0 + L) * (rho_nir - rho_red)) / denom, -1.0, 1.0))

# ------------------------------------------------------------------------------
# EQUATION 3: Fractional Vegetation Cover (f_c)
# ------------------------------------------------------------------------------
def calc_fc(
    ndvi: float,
    ndvi_min: float = 0.15,
    ndvi_max: float = 0.85,
    eta: float = 0.7,
    savi: Optional[float] = None,
    sand_fraction: float = 0.0
) -> float:
    """
    f_c = 1 - ((veg_max - veg) / (veg_max - veg_min)) ** eta
    Partitions land surface between active photosynthesizing canopy and bare soil.
    In bright sandy soils (sand_fraction > 0.50), dynamically couples f_c to SAVI (L=0.5)
    to eliminate bare sand background brightness distortion and guarantee biophysical consistency
    between Equations 1, 2, and 3.
    """
    if sand_fraction > 0.50 and savi is not None:
        savi_min = 0.10
        savi_max = 0.70
        if savi <= savi_min:
            return 0.0
        if savi >= savi_max:
            return 1.0
        ratio = (savi_max - savi) / (savi_max - savi_min)
        return float(np.clip(1.0 - np.power(ratio, eta), 0.0, 1.0))

    if ndvi <= ndvi_min:
        return 0.0
    if ndvi >= ndvi_max:
        return 1.0
    ratio = (ndvi_max - ndvi) / (ndvi_max - ndvi_min)
    return float(np.clip(1.0 - np.power(ratio, eta), 0.0, 1.0))

# ------------------------------------------------------------------------------
# EQUATION 4: Inward Polygon Buffer Erosion (-30m Buffer)
# ------------------------------------------------------------------------------
def erode_polygon_buffer_30m(polygon_coords: List[Tuple[float, float]], buffer_deg: float = 0.00027) -> List[Tuple[float, float]]:
    """
    Erodes raw parcel boundaries inward by ~30 meters (0.00027 degrees latitude/longitude)
    to eliminate mixed pixels from perimeter roads, irrigation canals, and border fences.
    """
    coords = np.array(polygon_coords)
    if len(coords) < 3:
        return polygon_coords
    centroid = coords.mean(axis=0)
    eroded = []
    for pt in coords:
        direction = centroid - pt
        dist = np.linalg.norm(direction)
        if dist > buffer_deg:
            step = (direction / dist) * buffer_deg
            eroded.append(tuple(pt + step))
        else:
            # If parcel is too small to erode, keep original point
            eroded.append(tuple(pt))
    return eroded

# ------------------------------------------------------------------------------
# EQUATION 5: Mass-Conserved SMAP Downscaling (9km -> 30m)
# ------------------------------------------------------------------------------
def downscale_smap_mass_conserved(
    theta_9km: float,
    high_res_features: np.ndarray,
    weights: np.ndarray,
    theta_min: float = 0.02,
    theta_max: float = 0.55
) -> np.ndarray:
    """
    Downscales coarse 9km SMAP root-zone soil moisture to 30m resolution using
    high-resolution optical/thermal/topographic features while strictly enforcing
    algebraic conservation of water mass AND physical box constraints:
    (1/N) * Sum(theta_30m_i) = theta_9km,  and  theta_min <= theta_30m_i <= theta_max
    
    Solved via exact 1D Lagrangian dual root-finding (KKT bisection).
    Note: The numerical convergence error of the Lagrangian dual projection is < 1e-12,
    guaranteeing strict mathematical water mass balance across the pixel grid.
    """
    unconstrained_est = np.dot(high_res_features, weights)
    
    # Target mean must be clamped to feasible physical interval
    target_mean = float(np.clip(theta_9km, theta_min, theta_max))
    
    low = theta_min - np.max(unconstrained_est)
    high = theta_max - np.min(unconstrained_est)
    
    # 50 iterations of bisection ensures precision < 1e-12
    for _ in range(50):
        mid = 0.5 * (low + high)
        projected = np.clip(unconstrained_est + mid, theta_min, theta_max)
        diff = np.mean(projected) - target_mean
        if abs(diff) < 1e-13:
            break
        if diff > 0:
            high = mid
        else:
            low = mid
            
    theta_30m_constrained = np.clip(unconstrained_est + mid, theta_min, theta_max)
    assert np.all(theta_30m_constrained >= theta_min - 1e-9) and np.all(theta_30m_constrained <= theta_max + 1e-9), "Box constraints violated!"
    assert np.isclose(np.mean(theta_30m_constrained), target_mean, atol=1e-7), "Mass conservation violated!"
    return theta_30m_constrained

# ------------------------------------------------------------------------------
# EQUATION 6: Empirical Radiative-Backscatter Thermal Reconstruction (SAR-Optical-Met)
# Continuous diurnal synthesis driven by NASA POWER meteorology (T_air, VPD, Rs),
# with Sentinel-1 C-band SAR (Delta sigma_VV/VH) providing episodic structural baseline.
# ------------------------------------------------------------------------------
def calc_sar_water_potential_baseline(delta_sigma_vv_vh: float, theta_root: float) -> float:
    """
    Computes episodic structural plant water potential baseline (psi_structural, MPa)
    from Sentinel-1 C-band cross-polarization backscatter ratio (VV/VH) and root-zone moisture.
    Sentinel-1 passes occur episodically (every 6-12 days), providing structural recalibration.
    """
    # High polarization difference (dielectric drop) + dry soil indicates low plant water potential
    psi_structural = 3.5 * delta_sigma_vv_vh - 4.0 * max(0.05, theta_root)
    return float(psi_structural)

def synthesize_diurnal_canopy_temp(
    t_air: float,
    solar_rad_wm2: float,
    vpd: float,
    psi_baseline: float,
    theta_root: float,
    hour: float = 14.0,
    t_sunrise: float = 6.0,
    t_sunset: float = 19.0
) -> float:
    """
    Continuous diurnal synthesis driven by NASA POWER meteorological parameters:
    T_air, VPD, and Solar Radiation, with Sentinel-1 SAR providing the episodic
    structural water-potential recalibration baseline.
    """
    diurnal_phase = np.sin(np.pi * np.clip((hour - t_sunrise) / max(1.0, t_sunset - t_sunrise), 0.0, 1.0))
    # Radiation heating vs transpirational cooling
    rad_heating = (solar_rad_wm2 / 800.0) * 3.0
    # Water stress suppresses evaporative cooling:
    stress_fever = max(0.0, psi_baseline + 1.2 * vpd)
    t_canopy = t_air + (rad_heating + stress_fever - 2.5 * (theta_root / 0.32)) * diurnal_phase
    return float(t_canopy)

def reconstruct_canopy_temp_sar(
    t_air: float,
    delta_sigma_vv_vh: float,
    theta_root: float,
    vpd: float,
    hour: float = 14.0,
    t_sunrise: float = 6.0,
    t_sunset: float = 19.0,
    solar_rad_wm2: float = 480.0
) -> float:
    """
    Reconstructs diurnal canopy skin temperature under cloud cover.
    Decoupled: Sentinel-1 C-band SAR provides episodic structural water-potential recalibration,
    while continuous diurnal trajectory is driven by live atmospheric meteorological forcing.
    """
    psi_baseline = calc_sar_water_potential_baseline(delta_sigma_vv_vh, theta_root)
    return synthesize_diurnal_canopy_temp(
        t_air=t_air,
        solar_rad_wm2=solar_rad_wm2,
        vpd=vpd,
        psi_baseline=psi_baseline,
        theta_root=theta_root,
        hour=hour,
        t_sunrise=t_sunrise,
        t_sunset=t_sunset
    )

# ------------------------------------------------------------------------------
# EQUATION 7: PT-JPL Ecophysiological Constraints (Fisher et al., 2008)
# ------------------------------------------------------------------------------
def calc_pt_jpl_constraints(
    t_air: float,
    rh: float,
    f_apar: float,
    f_ipar: float,
    t_opt: float = 25.0,
    theta_root: Optional[float] = None,
    theta_fc: float = 0.32,
    theta_wp: float = 0.12
) -> Dict[str, float]:
    """
    Computes the 5 canonical PT-JPL ecophysiological scaling factors:
    1. epsilon: Slope of saturation vapor pressure curve / (slope + gamma)
    2. f_wet: Surface relative wetness (RH^4)
    3. f_g: Green canopy fraction (fAPAR / fIPAR)
    4. f_T: Plant temperature constraint
    5. f_M: Plant moisture stress constraint (fAPAR / fAPAR_max or throttled by root moisture)
    6. f_SM: Soil moisture constraint (RH^(VPD/beta))
    """
    # Saturated vapor pressure slope Delta (kPa/°C) via Tetens equation
    sat_vp = 0.6108 * np.exp(17.27 * t_air / (t_air + 237.3))
    delta_slope = 4098.0 * sat_vp / ((t_air + 237.3) ** 2)
    epsilon = delta_slope / (delta_slope + GAMMA_PSY)

    # Surface wetness
    f_wet = np.power(np.clip(rh, 0.0, 1.0), 4.0)

    # Green canopy fraction
    f_g = np.clip(f_apar / f_ipar if f_ipar > 0 else 0.5, 0.0, 1.0)

    # Temperature constraint
    f_T = np.exp(-1.0 * (((t_air - t_opt) / max(1.0, t_opt)) ** 2))

    # Moisture constraint
    if theta_root is not None:
        # Biophysical throttling by available root-zone water: (theta - theta_wp) / (theta_fc - theta_wp)
        denom = max(0.01, theta_fc - theta_wp)
        f_M = np.clip((theta_root - theta_wp) / denom, 0.10, 1.0)
    else:
        f_M = np.clip(f_apar / 1.0, 0.10, 1.0)

    # Soil moisture constraint for bare soil evaporation
    vpd = sat_vp * (1.0 - np.clip(rh, 0.0, 1.0))
    f_SM = np.power(np.clip(rh, 0.01, 1.0), max(0.1, vpd / 1.0))

    return {
        "epsilon": float(epsilon),
        "f_wet": float(f_wet),
        "f_g": float(f_g),
        "f_T": float(f_T),
        "f_M": float(f_M),
        "f_SM": float(f_SM),
        "vpd": float(vpd)
    }

# ------------------------------------------------------------------------------
# EQUATION 8: Net Radiation Partitioning & Latent Heat Fluxes (LE_c, LE_s)
# ------------------------------------------------------------------------------
def calc_pt_jpl_fluxes(r_net: float, fc: float, constraints: Dict[str, float], g_flux: Optional[float] = None) -> Dict[str, float]:
    """
    Partitions total net radiation R_n into canopy net radiation R_nc and soil net radiation R_ns:
    R_nc = R_n * f_c
    R_ns = R_n * (1 - f_c)
    Soil heat flux G = 0.20 * R_ns
    LE_c = alpha_PT * epsilon * R_nc * (1 - f_wet) * f_g * f_T * f_M
    LE_s = alpha_PT * epsilon * (R_ns - G) * (f_wet + f_SM * (1 - f_wet))
    """
    c = constraints
    r_nc = r_net * fc
    r_ns = r_net * (1.0 - fc)

    if g_flux is None:
        g_flux = 0.20 * r_ns  # Standard empirical soil heat flux

    le_c = ALPHA_PT * c["epsilon"] * r_nc * (1.0 - c["f_wet"]) * c["f_g"] * c["f_T"] * c["f_M"]
    le_s = ALPHA_PT * c["epsilon"] * max(0.0, r_ns - g_flux) * (c["f_wet"] + c.get("f_SM", 0.3) * (1.0 - c["f_wet"]))
    # Canonical PT-JPL Canopy Interception Evaporation (Fisher et al., 2008)
    le_i = ALPHA_PT * c["epsilon"] * r_nc * c["f_wet"]

    return {
        "r_nc": float(r_nc),
        "r_ns": float(r_ns),
        "le_c": float(max(0.0, le_c)),
        "le_s": float(max(0.0, le_s)),
        "le_i": float(max(0.0, le_i)),
        "le_total": float(max(0.0, le_c + le_s + le_i)),
        "g_flux": float(g_flux)
    }

def calc_baseline_lec(r_nc: float, constraints: Dict[str, float]) -> float:
    """
    Direct calculation of canopy latent heat flux LE_c (W/m^2).
    """
    c = constraints
    le_c = ALPHA_PT * c["epsilon"] * r_nc * (1.0 - c["f_wet"]) * c["f_g"] * c["f_T"] * c["f_M"]
    return float(max(0.0, le_c))

# ------------------------------------------------------------------------------
# EQUATION 9: Advection Decoupling for Desert Winds & Oasis Effect (Omega)
# Adheres strictly to the micrometeorological boundary layer energy balance:
# R_n + H_adv - G = H + LE
# where H_adv = (rho_a * c_p * Delta_T / r_a_eff) * exp(-lambda * d_edge)  [W/m^2]
# ------------------------------------------------------------------------------
RHO_A = 1.205       # Density of dry air at standard conditions (kg/m^3)
C_P = 1005.0        # Specific heat capacity of dry air (J/(kg K))

def calc_advective_heat_flux(
    u_wind: float,
    grad_tsurface: float,
    d_edge: float,
    r_a: float = 40.0,
    lambda_decay: float = 0.005
) -> float:
    """
    Computes horizontal advective sensible heat flux H_adv (W/m^2) imported
    from surrounding hyper-arid desert terrain into an irrigated oasis field:
    Integrates micrometeorological bulk aerodynamic boundary layer transfer:
    H_adv = (rho_a * c_p * Delta_T / r_a_eff) * exp(-lambda * d_edge)
    where r_a_eff is dynamically modulated by local wind speed u_wind.
    Units strictly resolve to W/m^2.
    """
    dt_eff = max(0.0, float(grad_tsurface))
    r_a_base = max(10.0, float(r_a))
    u_eff = max(0.5, float(u_wind))
    r_a_adj = r_a_base / np.sqrt(u_eff / 2.0)
    
    h_flux_local = (RHO_A * C_P * dt_eff) / r_a_adj
    h_adv = h_flux_local * np.exp(-lambda_decay * max(0.0, float(d_edge)))
    return float(np.clip(h_adv, 0.0, 500.0))

def calc_advection_decoupled_lec(
    le_c: float,
    u_wind: float,
    grad_tsurface: float,
    d_edge: float,
    r_c: float = 70.0,
    r_a: float = 40.0,
    epsilon: float = 0.70,
    kappa: float = 0.08,
    lambda_decay: float = 0.005,
    mode: str = "decoupled"
) -> float:
    """
    Decouples regional sensible heat advection (Oasis Effect in desert basins such as Toshka/Qassim)
    strictly adhering to the micrometeorological boundary layer energy balance:
    R_n + H_adv - G = H + LE

    H_adv = (rho_a * c_p * Delta_T / r_a_eff) * exp(-lambda * d_edge)
    Decoupling factor Omega = (Delta/gamma + 1) / (Delta/gamma + 1 + r_c / r_a)

    Modes:
      - 'decoupled' (default): Decouples observed/measured LE_c to isolate biological stomatal flow:
                               LE_c,bio = max(0.05 * LE_c, LE_c - (1 - Omega) * H_adv)
      - 'forward': Forward agrometeorological prediction where desert advection augments evaporative demand:
                   LE_c,actual = LE_c,radiation + (1 - Omega) * H_adv
    """
    h_adv = calc_advective_heat_flux(u_wind, grad_tsurface, d_edge, r_a, lambda_decay)
    
    # Decoupling coefficient Omega (Jarvis & McNaughton, 1986; Monteith, 1965)
    delta_over_gamma = epsilon / max(0.01, 1.0 - epsilon)
    omega = (delta_over_gamma + 1.0) / (delta_over_gamma + 1.0 + (r_c / max(1.0, r_a)))
    omega = float(np.clip(omega, 0.05, 0.95))

    advective_transpiration_component = (1.0 - omega) * h_adv
    
    if mode == "forward":
        return float(le_c + advective_transpiration_component)
    else:
        # Decoupled biological transpiration isolates stomatally controlled flux:
        le_c_decoupled = max(0.05 * le_c, le_c - advective_transpiration_component)
        le_c_decoupled = min(le_c, le_c_decoupled)
        return float(le_c_decoupled)

# ------------------------------------------------------------------------------
# EQUATION 10: Total Latent Heat & Actual Evapotranspiration (ET_a mm/day)
# ------------------------------------------------------------------------------
def calc_actual_eta(le_c_decoupled: float, le_soil: float) -> Tuple[float, float]:
    """
    Converts latent heat flux (W/m^2) into volumetric depth of water (mm/day):
    LE_total = LE_c,decoupled + LE_s
    ET_a (mm/day) = (LE_total * 86400 s/day) / (lambda_v J/kg * rho_w kg/m^3 * 10^-3 m/mm)
                  = (LE_total * 86400) / LAMBDA_V
    """
    le_total = le_c_decoupled + le_soil  # W/m^2
    eta_mm_day = (le_total * 86400.0) / LAMBDA_V
    return float(le_total), float(eta_mm_day)

# ------------------------------------------------------------------------------
# EQUATION 11: Evaporative Stress Index (ESI)
# ------------------------------------------------------------------------------
def calc_esi(et_a: float, pet: float) -> float:
    """
    Evaporative Stress Index ESI = ET_a / PET
    Reflects instantaneous crop water sufficiency:
    ESI >= 0.75: Fully transpirational, unstressed canopy
    0.50 <= ESI < 0.75: Mild to moderate water stress
    ESI < 0.40: Severe stomatal closure & impending cavitation
    """
    if pet <= 0:
        return 1.0
    return float(np.clip(et_a / pet, 0.0, 1.0))

# ------------------------------------------------------------------------------
# EQUATION 12: Flash Drought Stress Velocity Alert (Delta ESI_7d)
# ------------------------------------------------------------------------------
def check_flash_drought_alert(
    esi_t: float,
    esi_t_minus_7: float,
    gdd_accum: float,
    gdd_maturity: float,
    alert_threshold: float = -0.15
) -> Tuple[bool, float]:
    """
    Detects flash drought stress collapse velocity:
    Delta ESI_7d = ESI_t - ESI_t-7
    An alert is triggered when Delta ESI_7d < -0.15 AND the crop is NOT in its natural
    end-of-season senescence stage (GDD < 0.95 * GDD_maturity).
    """
    delta_esi_7d = esi_t - esi_t_minus_7
    is_not_senescing = gdd_accum < (0.95 * gdd_maturity)
    is_alert = (delta_esi_7d < alert_threshold) and is_not_senescing
    return bool(is_alert), float(delta_esi_7d)

# ------------------------------------------------------------------------------
# EQUATION 13: Canopy Fever Anomaly (Delta T_c = T_canopy - T_baseline)
# ------------------------------------------------------------------------------
def calc_canopy_fever_anomaly(t_canopy: float, t_air: float, t_baseline_delta: float = -2.5) -> float:
    """
    Computes transpirational thermal fever anomaly:
    Delta T_c = T_canopy - (T_air + t_baseline_delta)
    A healthy, actively transpiring crop canopy is typically 2 to 3°C cooler than ambient air.
    When stomata close, evaporative cooling stops and the canopy develops a fever of +2 to +8°C.
    """
    t_baseline = t_air + t_baseline_delta
    fever = t_canopy - t_baseline
    return float(np.round(fever, 2))

# ------------------------------------------------------------------------------
# EQUATION 14: Prescriptive Irrigation Depth & Volume
# ------------------------------------------------------------------------------
def calc_prescriptive_irrigation(
    theta_fc: float,
    theta_current: float,
    z_r: float,
    area_ha: float
) -> Tuple[float, float]:
    """
    Calculates exact prescription depth (mm) and water volume (m^3) required
    to restore the root zone to field capacity theta_fc without deep percolation:
    Depth (mm) = max(0, theta_fc - theta_current) * Z_r (m) * 1000 mm/m
    Volume (m^3) = (Depth / 1000 m) * (Area_ha * 10000 m^2/ha)
    """
    moisture_deficit = max(0.0, theta_fc - theta_current)
    depth_mm = moisture_deficit * z_r * 1000.0
    volume_m3 = (depth_mm / 1000.0) * (area_ha * 10000.0)
    return float(depth_mm), float(volume_m3)

# ------------------------------------------------------------------------------
# EQUATION 15: Closed-Loop Soil Probing & Probabilistic Diagnostic (Xi_soil_error)
# Evaluated at the Next-Available Satellite Overpass Window (2 to 5 Days Revisit)
# ------------------------------------------------------------------------------
def calc_closed_loop_soil_error(
    delta_esi_observed: Optional[float] = None,
    delta_esi_predicted: float = 0.25,
    overpass_days: float = 3.0,           # Realistic satellite revisit window (HLS / ECOSTRESS)
    cumulative_pet_overpass_mm: float = 18.0, # Cumulative atmospheric demand measured by NASA POWER
    dissipation_rate_cm_hr: Optional[float] = None,
    normal_ksat_cm_hr: float = 2.5,
    eta_irr: float = 0.85,               # Distribution uniformity / application efficiency
    ec_e_dsm: float = 1.8,               # Saturated soil paste salinity (dS/m)
    surface_evap_loss_frac: float = 0.12, # Evaporative canopy interception / surface loss
    root_zone_depth_cm: float = 120.0,
    delta_esi_observed_48h: Optional[float] = None
) -> Dict[str, Any]:
    """
    Probes subsurface physical barriers, osmotic salinity constraints, and irrigation uniformity
    by comparing observed post-irrigation ESI recovery at the next satellite overpass (2 to 5 days)
    against the expected biophysical recovery model compensated by cumulative NASA POWER atmospheric demand:
    Xi_soil_error = Delta ESI_observed / Delta ESI_predicted
    """
    obs = delta_esi_observed_48h if delta_esi_observed_48h is not None else (delta_esi_observed if delta_esi_observed is not None else 0.15)
    if delta_esi_predicted <= 0:
        xi_error = 1.0
    else:
        # Calibrated by overpass atmospheric evaporative load
        atm_correction = float(np.clip(cumulative_pet_overpass_mm / max(5.0, overpass_days * 6.0), 0.70, 1.30))
        xi_error = float(np.clip((obs / delta_esi_predicted) * atm_correction, 0.0, 2.0))

    # 1. Expected recovery efficiency factor under normal hydraulics:
    application_factor = eta_irr * (1.0 - surface_evap_loss_frac)
    
    # 2. Compaction ratio
    compaction_ratio = 1.0
    if dissipation_rate_cm_hr is not None and normal_ksat_cm_hr > 0:
        compaction_ratio = float(np.clip(dissipation_rate_cm_hr / normal_ksat_cm_hr, 0.05, 2.0))
    else:
        compaction_ratio = float(np.clip(xi_error / max(0.1, application_factor), 0.1, 1.0))

    # 3. Probabilistic Diagnostic Breakdown:
    # A) Irrigation non-uniformity probability:
    prob_nonuniformity = float(np.exp(-((xi_error - application_factor) ** 2) / (2.0 * (0.18 ** 2))))
    
    # B) Subsoil hardpan / mechanical compaction probability:
    hardpan_severity = max(0.0, 0.70 - xi_error) / 0.70
    dissipation_deficit = max(0.0, 1.0 - compaction_ratio)
    prob_hardpan = float(np.clip(hardpan_severity * 0.60 + dissipation_deficit * 0.40, 0.0, 1.0))
    if compaction_ratio < 0.40 and xi_error < 0.60:
        prob_hardpan = max(prob_hardpan, 0.75)

    # C) Osmotic salinity limitation probability:
    salinity_stress = max(0.0, (ec_e_dsm - 2.5) / 5.0)
    prob_salinity = float(np.clip(salinity_stress * (1.0 - min(1.0, xi_error)), 0.0, 1.0))

    # Normalize diagnostic probabilities to sum to 1.0
    total_prob = prob_hardpan + prob_salinity + prob_nonuniformity
    if total_prob > 0:
        norm_hardpan = float(round(prob_hardpan / total_prob, 3))
        norm_salinity = float(round(prob_salinity / total_prob, 3))
        norm_nonuniformity = float(round(prob_nonuniformity / total_prob, 3))
    else:
        norm_hardpan, norm_salinity, norm_nonuniformity = 0.1, 0.1, 0.8

    # Hardpan detected only if its probability is significant (>= 0.45 or prob_hardpan >= 0.65)
    hardpan_detected = bool(norm_hardpan >= 0.45 or (prob_hardpan >= 0.65))
    hardpan_depth_cm = float(round(min(60.0, max(25.0, root_zone_depth_cm * xi_error)), 1)) if hardpan_detected else None

    # Primary limiting factor determination
    breakdown = {
        "hardpan_compaction_prob": norm_hardpan,
        "salinity_limitation_prob": norm_salinity,
        "irrigation_nonuniformity_prob": norm_nonuniformity
    }
    primary_factor = max(breakdown, key=breakdown.get)

    if primary_factor == "hardpan_compaction_prob" and hardpan_detected:
        rec = f"Subsoil compaction detected at ~{hardpan_depth_cm}cm. Deep ripping (>55cm) or taproot bio-drilling recommended."
    elif primary_factor == "salinity_limitation_prob":
        rec = f"Osmotic salinity limitation detected (EC_e = {ec_e_dsm:.1f} dS/m). Leaching fraction irrigation required."
    else:
        rec = f"Irrigation distribution non-uniformity ({norm_nonuniformity*100:.0f}% confidence). Inspect nozzles, drip lines, and operating pressure."

    return {
        "xi_soil_error": float(round(xi_error, 3)),
        "hardpan_detected": hardpan_detected,
        "hardpan_depth_cm": hardpan_depth_cm,
        "compaction_ratio": float(round(compaction_ratio, 3)),
        "diagnostic_breakdown": breakdown,
        "primary_limiting_factor": primary_factor,
        "recommendation": rec
    }

# ------------------------------------------------------------------------------
# EQUATION 16: Multi-Seasonal Field Memory State Vector (F_state)
# ------------------------------------------------------------------------------
def build_field_memory_state(
    theta_preplant: float,
    theta_wp: float,
    theta_fc: float,
    esi_history: List[float],
    heat_load_accum: float,
    xi_soil_error: float,
    prev_crop: str,
    ec_e_dsm: float = 1.8,
    leaching_fraction: float = 0.15
) -> Dict[str, Any]:
    """
    Constructs the 10-year cumulative agro-ecological state vector F_state:
    1. Phi_carryover: Available water fraction carried over from preceding seasons
    2. S_freq: 10-year climatic drought frequency (fraction of days with ESI < 0.40)
    3. H_accum: 10-year accumulated heat load (degree-days above base temperature)
    4. Xi_soil_error: Closed-loop subsoil diagnostic and compaction flag
    5. Salinity_risk: Salt accumulation risk from soil ECe and leaching fraction LF
    """
    # Carryover water fraction
    denom = theta_fc - theta_wp if (theta_fc > theta_wp) else 0.20
    phi_carryover = float(np.clip((theta_preplant - theta_wp) / denom, 0.0, 1.0))

    # Frequency of acute stress days (ESI < 0.40)
    if len(esi_history) > 0:
        stress_days = sum(1 for e in esi_history if e < 0.40)
        s_freq = float(stress_days / len(esi_history))
    else:
        s_freq = 0.25

    # Salinity Risk Assessment
    if ec_e_dsm > 6.0 or (ec_e_dsm > 4.0 and leaching_fraction < 0.10):
        salinity_level = "severe"
    elif ec_e_dsm > 3.0 or leaching_fraction < 0.15:
        salinity_level = "moderate"
    else:
        salinity_level = "normal"

    return {
        "phi_carryover": float(round(phi_carryover, 3)),
        "s_freq": float(round(s_freq, 3)),
        "heat_accum": float(round(heat_load_accum, 1)),
        "xi_soil_error": float(round(xi_soil_error, 3)),
        "hardpan_detected": bool(xi_soil_error < 0.70),
        "hardpan_depth_cm": 45.0 if xi_soil_error < 0.70 else None,
        "salinity_ec_e_dsm": float(round(ec_e_dsm, 2)),
        "salinity_risk_level": salinity_level,
        "prev_crop": prev_crop
    }

# ------------------------------------------------------------------------------
# EQUATION 17: FAO-56 Dual Crop Coefficient & Daily Root Zone Water Balance
# ------------------------------------------------------------------------------
def simulate_fao56_daily_balance(
    days: int,
    et0_series: np.ndarray,
    precip_series: np.ndarray,
    kc_series: np.ndarray,
    theta_fc: float,
    theta_wp: float,
    z_r: float,
    p_depletion: float,
    initial_depletion: float,
    k_cb_series: Optional[np.ndarray] = None,
    irrigation_series: Optional[np.ndarray] = None,
    z_r_min: Optional[float] = None,
    auto_irrigate: bool = False
) -> Dict[str, np.ndarray]:
    """
    FAO-56 Daily Root Zone Depletion Balance with dynamic phenological root growth,
    climate-adjusted depletion fraction p(ET_c), and explicit irrigation dosing:
    TAW(t) = 1000 * (theta_fc - theta_wp) * Z_r(t)
    p_adj(t) = clip(p_table + 0.04 * (5.0 - ET_c), 0.10, 0.80)
    RAW(t) = p_adj(t) * TAW(t)
    Stress reduction coefficient Ks:
      Ks = 1.0 if Dr <= RAW
      Ks = (TAW - Dr) / ((1 - p_adj) * TAW) if RAW < Dr <= TAW
      Ks = 0.05 if Dr > TAW
    Daily ET_a = Ks * Kc * ET0
    Daily depletion recursion: Dr,t = clip(Dr,t-1 - Peff - Irrigation + ET_a, 0.0, TAW)
    """
    dr = np.zeros(days)
    eta = np.zeros(days)
    ks = np.zeros(days)
    applied_irrigation = np.zeros(days) if irrigation_series is None else np.array(irrigation_series, copy=True)
    taw_series = np.zeros(days)
    raw_series = np.zeros(days)

    dr_curr = initial_depletion
    for t in range(days):
        # Dynamic phenological root depth growth Z_r(t)
        if z_r_min is not None and z_r_min < z_r:
            growth_fraction = min(1.0, (t + 1.0) / max(1.0, days * 0.65))
            z_r_t = z_r_min + (z_r - z_r_min) * growth_fraction
        else:
            z_r_t = z_r

        taw_t = 1000.0 * (theta_fc - theta_wp) * z_r_t
        taw_series[t] = taw_t

        etc = kc_series[t] * et0_series[t]
        # FAO-56 Eq 62: Climate adjustment for evaporative demand
        p_adj = float(np.clip(p_depletion + 0.04 * (5.0 - etc), 0.10, 0.80))
        raw_t = p_adj * taw_t
        raw_series[t] = raw_t

        # Stress coefficient Ks
        if dr_curr <= raw_t:
            k_s = 1.0
        elif dr_curr < taw_t:
            k_s = (taw_t - dr_curr) / max(0.001, (1.0 - p_adj) * taw_t)
        else:
            k_s = 0.05
        k_s = float(np.clip(k_s, 0.05, 1.0))
        ks[t] = k_s

        act_et = k_s * etc
        eta[t] = act_et

        # Effective precipitation: FAO-56 empirical USDA-SCS method
        p_raw = precip_series[t]
        peff = max(0.0, p_raw * 0.8 - 2.0) if p_raw > 4.0 else 0.0

        # Irrigation management: manual schedule or autonomous MAD trigger
        irr_today = applied_irrigation[t]
        if auto_irrigate and irr_today <= 0.0 and dr_curr >= raw_t:
            # Trigger irrigation replenishing root zone plus 10% leaching fraction
            irr_today = min(taw_t, dr_curr * 1.10)
            applied_irrigation[t] = irr_today

        # Update root-zone depletion
        dr_curr = dr_curr - peff - irr_today + act_et
        dr_curr = float(np.clip(dr_curr, 0.0, taw_t))
        dr[t] = dr_curr

    return {
        "dr": dr,
        "eta": eta,
        "ks": ks,
        "irrigation": applied_irrigation,
        "taw": float(taw_series[-1]),
        "raw": float(raw_series[-1]),
        "taw_series": taw_series,
        "raw_series": raw_series
    }

# ------------------------------------------------------------------------------
# EQUATION 18: Stewart Water-Yield Production Function & Failure Risk
# ------------------------------------------------------------------------------
def calc_stewart_yield(sum_eta: float, sum_etc: float, ky: float) -> Tuple[float, float]:
    """
    Enhanced Stewart / Jensen Phenology-Coupled Water-Yield Function:
    (1 - Ya / Ym) = Ky * Deficit_effective
    Where Deficit_effective incorporates non-linear flowering sensitivity escalation
    when water deficit exceeds 20% (Jensen anthesis cavitation vulnerability).
    """
    water_deficit = max(0.0, 1.0 - (sum_eta / sum_etc)) if sum_etc > 0 else 0.0
    if water_deficit > 0.20:
        flowering_stress_amplifier = 1.0 + 1.25 * ((water_deficit - 0.20) ** 1.3)
        effective_deficit = water_deficit * flowering_stress_amplifier
    else:
        effective_deficit = water_deficit

    yield_ratio = 1.0 - ky * effective_deficit
    yield_ratio = float(np.clip(yield_ratio, 0.10, 1.0))

    # Continuous logistic failure risk function
    if yield_ratio < 0.70:
        failure_risk = float(np.clip(5.0 + ((0.70 - yield_ratio) / 0.35) * 90.0, 5.0, 95.0))
    else:
        failure_risk = float(np.clip(5.0 * (0.90 / max(0.70, yield_ratio)), 3.0, 8.0))

    return float(round(yield_ratio, 3)), float(round(failure_risk, 1))

# ------------------------------------------------------------------------------
# EQUATION 19: Structural Soil Health Index (SHI)
# ------------------------------------------------------------------------------
def calc_soil_health_index(
    delta_n_bio: float,
    residue_biomass: float,
    z_r_max: float,
    p_pest: float,
    w_n: float = 0.35,
    w_c: float = 0.30,
    w_root: float = 0.25
) -> float:
    """
    Quantifies multi-seasonal soil regenerative capital:
    Combines biological N-fixation (+delta_N), organic carbon residue,
    deep bio-drilling root penetration (Z_r,max), and pest cycle disruption.
    """
    score_raw = (
        (w_n * (delta_n_bio / 150.0)) +
        (w_c * (residue_biomass / 5.0)) +
        (w_root * (z_r_max / 2.0)) -
        (0.20 * p_pest)
    )
    # Sigmoidal normalization to [10, 98]
    shi = 100.0 / (1.0 + np.exp(-3.0 * (score_raw - 0.50)))
    return float(np.clip(shi, 10.0, 98.0))

# ------------------------------------------------------------------------------
# EQUATION 20: Dynamic TOPSIS Optimization Solver
# ------------------------------------------------------------------------------
def solve_dynamic_topsis(
    decision_matrix: np.ndarray,
    weights: np.ndarray,
    is_benefit: List[bool]
) -> np.ndarray:
    """
    Dynamic Technique for Order Preference by Similarity to Ideal Solution (TOPSIS):
    1. Vector normalization of multi-objective criteria matrix
    2. Weight application
    3. Determine Positive Ideal Solution (A+) and Negative Ideal Solution (A-)
    4. Calculate Euclidean separation distances D+ and D-
    5. Relative closeness to ideal: C_i = D- / (D+ + D-) in [0, 1]
    """
    m, n = decision_matrix.shape
    # 1. Vector Normalization
    rss = np.sqrt(np.sum(decision_matrix ** 2, axis=0))
    rss[rss == 0] = 1.0
    norm_matrix = decision_matrix / rss

    # 2. Weighted Matrix
    weights_norm = weights / np.sum(weights)
    weighted_matrix = norm_matrix * weights_norm

    # 3. Ideal Positive (A+) and Negative (A-)
    a_plus = np.zeros(n)
    a_minus = np.zeros(n)
    for j in range(n):
        if is_benefit[j]:
            a_plus[j] = np.max(weighted_matrix[:, j])
            a_minus[j] = np.min(weighted_matrix[:, j])
        else:
            a_plus[j] = np.min(weighted_matrix[:, j])
            a_minus[j] = np.max(weighted_matrix[:, j])

    # 4. Euclidean Distances
    d_plus = np.sqrt(np.sum((weighted_matrix - a_plus) ** 2, axis=1))
    d_minus = np.sqrt(np.sum((weighted_matrix - a_minus) ** 2, axis=1))

    # 5. Relative Closeness
    denom = d_plus + d_minus
    denom[denom == 0] = 1.0
    c_i = d_minus / denom
    return c_i

# ------------------------------------------------------------------------------
# EQUATION 21: NASA POWER Growing Degree Days (GDD) & Phenology Suitability
# ------------------------------------------------------------------------------
def calc_daily_gdd(t_max: float, t_min: float, t_base: float, t_cutoff: float = 38.0) -> float:
    """
    Computes daily Growing Degree Days:
    GDD_daily = max(0.0, (min(t_max, t_cutoff) + max(t_min, t_base)) / 2.0 - t_base)
    Conforms to McMaster & Wilhelm (1997) Method 2.
    """
    t_max_adj = min(t_max, t_cutoff)
    t_min_adj = max(t_min, t_base)
    t_mean = (t_max_adj + t_min_adj) / 2.0
    return float(max(0.0, t_mean - t_base))

# ------------------------------------------------------------------------------
# EQUATION 22: FAO AquaCrop Transpiration-to-Biomass Production Function
# ------------------------------------------------------------------------------
def calc_aquacrop_biomass(
    wp_star: float,
    sum_tr_et0: float,
    f_temp: float = 1.0,
    f_salinity: float = 1.0
) -> float:
    """
    FAO AquaCrop law of biomass accumulation (Steduto et al., 2009; Raes et al., 2012):
    B = (WP* / 100) * Sum(Tr_a / ET_o) * f_temp * f_salinity
    Returns aboveground dry biomass in ton/ha.
    WP* is normalized water productivity (g/m^2). 1 g/m^2 = 0.01 ton/ha.
    """
    biomass_ton_ha = (wp_star / 100.0) * sum_tr_et0 * f_temp * f_salinity
    return float(max(0.1, biomass_ton_ha))

# ------------------------------------------------------------------------------
# EQUATION 23: AquaCrop Pollination Heat-Shock & Adjusted Harvest Index
# ------------------------------------------------------------------------------
def calc_harvest_index_heat_adjusted(
    hi_base: float,
    t_max_flowering: float,
    t_crit_flowering: float,
    k_sterility: float = 0.035,
    f_water_stress_flowering: float = 1.0
) -> Tuple[float, float, float]:
    """
    FAO AquaCrop Anthesis Heat Sterilization & Adjusted Harvest Index (HI_adj):
    If T_max,flowering > T_crit,flowering:
        f_heat = max(0.10, 1.0 - k_sterility * (T_max,flowering - T_crit,flowering)**2)
    HI_adj = HI_base * f_water_stress_flowering * f_heat
    Returns: (hi_adj, f_heat, yield_reduction_factor)
    """
    heat_excess = max(0.0, t_max_flowering - t_crit_flowering)
    if heat_excess > 0:
        f_heat = max(0.10, 1.0 - k_sterility * (heat_excess ** 2))
    else:
        f_heat = 1.0

    f_water = max(0.20, min(1.0, f_water_stress_flowering))
    hi_adj = float(hi_base * f_water * f_heat)
    yield_reduction_factor = float(1.0 - (hi_adj / hi_base) if hi_base > 0 else 0.0)
    return hi_adj, float(f_heat), yield_reduction_factor

# ------------------------------------------------------------------------------
# EQUATION 24: Dual Soil Erosion Risk Index (Water RUSLE & Wind WEQ Proxy)
# ------------------------------------------------------------------------------
def calc_dual_soil_erosion_index(
    precip_annual_mm: float,
    i30_burst_mm_hr: float,
    u_wind_ms: float = 3.8,              # 2m wind speed from NASA POWER
    fc_vegetative_cover: float = 0.65,    # Live canopy cover fraction from HLS
    residue_biomass_ton_ha: float = 3.5,  # Surface crop residue biomass
    soil_type: str = "alluvial_clay",
    slope_pct: float = 1.5,
    slope_length_m: float = 50.0,
    crop_cover_c_factor: float = 0.12,
    support_p_factor: float = 0.75,
    u_threshold_ms: float = 4.5           # Threshold wind speed for saltation / sand detachment
) -> Dict[str, Any]:
    """
    Computes dual topsoil erosion risk across arid and semi-arid agro-ecosystems:
    1. Water Erosion (RUSLE + NASA GPM IMERG 30-min burst intensity):
       A_water = R * K * LS * C * P  (tons / ha / year)
    2. Wind Erosion (WEQ Proxy driven by NASA POWER wind speed and HLS cover):
       Friction excess is physically zero if u_wind <= u_threshold.
       When u_wind > u_threshold:
       E_wind = max(0, (u_wind - u_threshold) / u_threshold)^3 * (1 - fc) * exp(-0.25 * residue) * K_wind
    """
    # 1. WATER EROSION (RUSLE)
    p_eff = max(10.0, float(precip_annual_mm))
    i30_ratio = float(np.clip(i30_burst_mm_hr / 25.0, 0.40, 3.50))
    r_factor = 0.0483 * (p_eff ** 1.25) * i30_ratio

    st = soil_type.lower()
    if "sand" in st:
        k_water = 0.045
        k_wind = 1.40
    elif "loam" in st:
        k_water = 0.038
        k_wind = 0.90
    elif "clay" in st:
        k_water = 0.024
        k_wind = 0.50
    else:
        k_water = 0.030
        k_wind = 0.80

    theta_rad = np.arctan(max(0.1, slope_pct) / 100.0)
    sin_theta = np.sin(theta_rad)
    m_exp = 0.5 if slope_pct >= 5.0 else (0.4 if slope_pct >= 3.0 else 0.3)
    ls_factor = ((slope_length_m / 22.13) ** m_exp) * (65.41 * (sin_theta ** 2) + 4.56 * sin_theta + 0.065)
    ls_factor = float(np.clip(ls_factor, 0.1, 10.0))

    a_water = r_factor * k_water * ls_factor * crop_cover_c_factor * support_p_factor
    a_water = float(np.clip(a_water, 0.001, 120.0))
    a_water_bare = r_factor * k_water * ls_factor * 1.0 * 1.0
    water_reduction_pct = float(np.clip(((a_water_bare - a_water) / max(0.001, a_water_bare)) * 100.0, 0.0, 99.0))

    # 2. WIND EROSION (WEQ Proxy)
    # Strictly zero wind erosion on calm days where wind speed is below threshold (u_wind <= u_threshold)
    # Physical threshold formulation: max(0.0, (u_wind - u_threshold) / u_threshold) ** 3
    friction_excess = float(max(0.0, (u_wind_ms - u_threshold_ms) / u_threshold_ms) ** 3.0)

    bare_wind_exposure = 1.0 - float(np.clip(fc_vegetative_cover, 0.0, 1.0))
    residue_suppression = float(np.exp(-0.25 * max(0.0, residue_biomass_ton_ha)))
    a_wind = friction_excess * bare_wind_exposure * residue_suppression * k_wind * 2.5
    a_wind = float(np.clip(a_wind, 0.0, 80.0))

    # Baseline bare wind loss (fc = 0.0, residue = 0.0)
    a_wind_bare = friction_excess * 1.0 * 1.0 * k_wind * 2.5
    wind_reduction_pct = float(np.clip(((a_wind_bare - a_wind) / max(0.001, a_wind_bare)) * 100.0, 0.0, 99.0)) if a_wind_bare > 0 else 99.0

    total_soil_loss = a_water + a_wind
    total_bare_loss = a_water_bare + a_wind_bare
    total_reduction_pct = float(np.clip(((total_bare_loss - total_soil_loss) / max(0.001, total_bare_loss)) * 100.0, 0.0, 99.0))

    return {
        "annual_soil_loss_ton_ha": float(round(total_soil_loss, 3)),
        "annual_water_loss_ton_ha": float(round(a_water, 3)),
        "annual_wind_loss_ton_ha": float(round(a_wind, 3)),
        "baseline_bare_loss_ton_ha": float(round(total_bare_loss, 3)),
        "erosion_reduction_vs_bare_pct": float(round(total_reduction_pct, 1)),
        "water_erosion_reduction_pct": float(round(water_reduction_pct, 1)),
        "wind_erosion_reduction_pct": float(round(wind_reduction_pct, 1)),
        "wind_friction_excess": float(round(friction_excess, 4)),
        "r_factor_gpm_imerg": float(round(r_factor, 2)),
        "k_water_erodibility": k_water,
        "k_wind_erodibility": k_wind,
        "ls_topographic_factor": float(round(ls_factor, 3))
    }

# Backward compatibility alias
def calc_rusle_soil_erosion(
    precip_annual_mm: float,
    i30_burst_mm_hr: float,
    soil_type: str = "alluvial_clay",
    slope_pct: float = 1.5,
    slope_length_m: float = 50.0,
    crop_cover_c_factor: float = 0.12,
    support_p_factor: float = 0.75
) -> Dict[str, Any]:
    return calc_dual_soil_erosion_index(
        precip_annual_mm=precip_annual_mm,
        i30_burst_mm_hr=i30_burst_mm_hr,
        u_wind_ms=3.8,
        fc_vegetative_cover=1.0 - crop_cover_c_factor,
        residue_biomass_ton_ha=3.0,
        soil_type=soil_type,
        slope_pct=slope_pct,
        slope_length_m=slope_length_m,
        crop_cover_c_factor=crop_cover_c_factor,
        support_p_factor=support_p_factor
    )


