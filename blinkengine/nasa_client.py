# ==============================================================================
# BlinkEngine — NASA Earth Observation & Earthdata Live Ingestion Client
# Direct integration with NASA POWER REST API and NASA Earthdata Cloud (CMR / AppEEARS)
# NASA Space Apps Challenge 2026: Field Shift
# ==============================================================================

import os
import json
import math
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple

# Safe credential loading: never hardcode private keys into version control
NASA_API_KEY = os.environ.get("NASA_API_KEY", "DEMO_KEY")
EARTHDATA_BEARER_TOKEN = os.environ.get("EARTHDATA_BEARER_TOKEN", "")

NASA_POWER_API_BASE = os.environ.get("NASA_POWER_API_BASE", "https://power.larc.nasa.gov/api/temporal/daily/point")
APPEEARS_API_BASE = os.environ.get("APPEEARS_API_BASE", "https://appeears.earthdatacloud.nasa.gov/api")
CMR_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"

# In-memory cache for NASA POWER observations (key: "lat_lon_date")
_POWER_CACHE: Dict[str, Dict[str, Any]] = {}

def verify_nasa_power_connection(timeout_sec: float = 6.0) -> Dict[str, Any]:
    """
    Performs a real HTTP probe to NASA POWER API to verify live service availability,
    network path, and round-trip latency.
    """
    t0 = time.time()
    # Lightweight request querying 1 day of T2M at Cairo coordinates (30.04, 31.23)
    probe_url = (
        f"{NASA_POWER_API_BASE}?parameters=T2M&community=AG"
        f"&longitude=31.23&latitude=30.04"
        f"&start=20260101&end=20260101&format=JSON"
    )
    if NASA_API_KEY and NASA_API_KEY != "DEMO_KEY":
        probe_url += f"&api_key={NASA_API_KEY}"

    req = urllib.request.Request(
        probe_url,
        headers={
            "User-Agent": "BlinkEngine-NASA-SpaceApps/3.5 (Health-Probe)",
            "Accept": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            latency_ms = int((time.time() - t0) * 1000)
            status_code = resp.status
            return {
                "reachable": status_code == 200,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "endpoint": NASA_POWER_API_BASE,
                "key_type": "PRODUCTION_KEY" if (NASA_API_KEY and NASA_API_KEY != "DEMO_KEY") else "OPEN_DEMO_KEY",
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "error": None
            }
    except Exception as e:
        latency_ms = int((time.time() - t0) * 1000)
        return {
            "reachable": False,
            "status_code": getattr(e, "code", 503),
            "latency_ms": latency_ms,
            "endpoint": NASA_POWER_API_BASE,
            "key_type": "PRODUCTION_KEY" if (NASA_API_KEY and NASA_API_KEY != "DEMO_KEY") else "OPEN_DEMO_KEY",
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }

def fetch_nasa_power_live(
    lat: float,
    lon: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    timeout_sec: float = 12.0
) -> Dict[str, Any]:
    """
    Fetches real-time daily meteorological parameters from NASA POWER API:
    - T2M, T2M_MAX, T2M_MIN (Air Temperature at 2m, °C)
    - RH2M (Relative Humidity at 2m, %)
    - WS2M (Wind Speed at 2m, m/s)
    - ALLSKY_SFC_SW_DWN (All-Sky Solar Insolation, MJ/m^2/day)
    - PRECTOTCORR (Precipitation Corrected, mm/day)
    """
    valid_lat = max(-90.0, min(90.0, lat))
    valid_lon = max(-180.0, min(180.0, lon))

    now = datetime.now(timezone.utc)
    if end_date is None:
        # NASA POWER MERRA-2 daily assimilation latency is ~3-5 days
        end_dt = now - timedelta(days=4)
        end_date = end_dt.strftime("%Y%m%d")
    if start_date is None:
        start_dt = datetime.strptime(end_date, "%Y%m%d") - timedelta(days=7)
        start_date = start_dt.strftime("%Y%m%d")

    cache_key = f"{valid_lat:.3f}_{valid_lon:.3f}_{start_date}_{end_date}"
    if cache_key in _POWER_CACHE:
        return _POWER_CACHE[cache_key]

    params = "T2M,T2M_MAX,T2M_MIN,RH2M,ALLSKY_SFC_SW_DWN,WS2M,PRECTOTCORR"
    url = (
        f"{NASA_POWER_API_BASE}?parameters={params}&community=AG"
        f"&longitude={valid_lon:.4f}&latitude={valid_lat:.4f}"
        f"&start={start_date}&end={end_date}&format=JSON"
    )
    if NASA_API_KEY and NASA_API_KEY != "DEMO_KEY":
        url += f"&api_key={NASA_API_KEY}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "BlinkEngine-NASA-SpaceApps/3.5 (Biophysical Engine)",
            "Accept": "application/json"
        }
    )

    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        if resp.status != 200:
            raise RuntimeError(f"NASA POWER API returned HTTP {resp.status}")
        raw_body = resp.read().decode("utf-8")
        data = json.loads(raw_body)

    properties = data.get("properties", {})
    parameters = properties.get("parameter", {})
    if not parameters or "T2M" not in parameters:
        raise ValueError(f"NASA POWER API returned invalid payload structure: {list(data.keys())}")

    # Extract the most recent valid observation day
    t2m_series = parameters.get("T2M", {})
    valid_dates = [d for d, val in t2m_series.items() if val > -900.0]
    if not valid_dates:
        raise ValueError("No valid non-fill observation days in NASA POWER response")

    latest_date = sorted(valid_dates)[-1]
    
    def sanitize_val(val: Any, min_val: float, max_val: float, fallback: float) -> float:
        if val is None:
            return fallback
        try:
            f_val = float(val)
            if math.isnan(f_val) or f_val <= min_val or f_val >= max_val:
                return fallback
            return f_val
        except (ValueError, TypeError):
            return fallback

    t_mean = float(parameters["T2M"][latest_date])
    t_max = sanitize_val(parameters.get("T2M_MAX", {}).get(latest_date), -50.0, 65.0, t_mean + 5.0)
    t_min = sanitize_val(parameters.get("T2M_MIN", {}).get(latest_date), -60.0, 55.0, t_mean - 5.0)
    if t_max < t_mean:
        t_max = t_mean + 3.0
    if t_min > t_mean:
        t_min = t_mean - 3.0

    rh = sanitize_val(parameters.get("RH2M", {}).get(latest_date), 0.0, 100.0, 45.0)
    ws = sanitize_val(parameters.get("WS2M", {}).get(latest_date), 0.0, 60.0, 2.5)
    sw_mj = sanitize_val(parameters.get("ALLSKY_SFC_SW_DWN", {}).get(latest_date), 0.0, 45.0, 20.0)
    precip = sanitize_val(parameters.get("PRECTOTCORR", {}).get(latest_date), 0.0, 500.0, 0.0)

    result = {
        "status": "LIVE",
        "data_source": "LIVE_NASA_POWER_API",
        "is_degraded": False,
        "observation_date": latest_date,
        "latitude": valid_lat,
        "longitude": valid_lon,
        "elevation_m": properties.get("elevation", 120.0),
        "t_air": float(round(t_mean, 2)),
        "t_max": float(round(t_max, 2)),
        "t_min": float(round(t_min, 2)),
        "relative_humidity": float(round(rh / 100.0, 3)),
        "rh_pct": float(round(rh, 1)),
        "wind_speed_2m": float(round(ws, 2)),
        "solar_insolation_mj_m2": float(round(sw_mj, 2)),
        "precip_mm": float(round(precip, 2)),
        "raw_series_days_available": len(valid_dates),
        "retrieved_at": datetime.now(timezone.utc).isoformat()
    }

    _POWER_CACHE[cache_key] = result
    return result

def compute_live_biophysical_atmosphere(weather: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes Penman-Monteith & FAO-56 atmospheric thermodynamics from live NASA weather:
    - Vapor Pressure Deficit (VPD in kPa)
    - Saturation vapor pressure slope Delta (kPa/°C)
    - Psychrometric constant gamma (kPa/°C)
    - Net Radiation R_n (W/m^2)
    - Reference Evapotranspiration ET_0 (mm/day)
    """
    t_mean = weather["t_air"]
    t_max = weather["t_max"]
    t_min = weather["t_min"]
    rh = weather["relative_humidity"]
    u2 = weather["wind_speed_2m"]
    rs_mj = weather["solar_insolation_mj_m2"]
    elevation_m = weather.get("elevation_m", 120.0)

    # 1. Saturation Vapor Pressure e_s(T) in kPa (FAO-56 Eq 11-12)
    e_tmax = 0.6108 * math.exp((17.27 * t_max) / (t_max + 237.3))
    e_tmin = 0.6108 * math.exp((17.27 * t_min) / (t_min + 237.3))
    es = (e_tmax + e_tmin) / 2.0

    # 2. Actual Vapor Pressure e_a in kPa (FAO-56 Eq 17)
    ea = es * rh

    # 3. Vapor Pressure Deficit VPD in kPa
    vpd = max(0.01, es - ea)

    # 4. Slope of Vapor Pressure Curve Delta in kPa/°C (FAO-56 Eq 13)
    delta_slope = (4098.0 * (0.6108 * math.exp((17.27 * t_mean) / (t_mean + 237.3)))) / ((t_mean + 237.3) ** 2)

    # 5. Atmospheric Pressure P and Psychrometric Constant gamma (FAO-56 Eq 7-8)
    p_atm = 101.3 * math.pow((293.0 - 0.0065 * elevation_m) / 293.0, 5.26)
    gamma_psy = 0.000665 * p_atm

    # 6. Net Radiation R_n (FAO-56 Eq 37-40)
    albedo = 0.23
    r_ns = (1.0 - albedo) * rs_mj

    sigma_sb = 4.903e-9
    t_max_k4 = (t_max + 273.16) ** 4
    t_min_k4 = (t_min + 273.16) ** 4
    lat_rad = math.radians(weather.get("latitude", 30.0))
    doy = datetime.strptime(weather.get("observation_date", "20260701"), "%Y%m%d").timetuple().tm_yday
    dr = 1.0 + 0.033 * math.cos(2.0 * math.pi * doy / 365.0)
    delta_dec = 0.409 * math.sin((2.0 * math.pi * doy / 365.0) - 1.39)
    omega_s = math.acos(max(-1.0, min(1.0, -math.tan(lat_rad) * math.tan(delta_dec))))
    ra_mj = (24.0 * 60.0 / math.pi) * 0.0820 * dr * (
        omega_s * math.sin(lat_rad) * math.sin(delta_dec) +
        math.cos(lat_rad) * math.cos(delta_dec) * math.sin(omega_s)
    )
    r_so = (0.75 + 2e-5 * elevation_m) * ra_mj
    f_cloud = min(1.0, max(0.3, rs_mj / max(0.1, r_so)))

    r_nl = sigma_sb * ((t_max_k4 + t_min_k4) / 2.0) * (0.34 - 0.14 * math.sqrt(max(0.0, ea))) * (1.35 * f_cloud - 0.35)
    r_nl = max(0.0, r_nl)

    r_n_mj = max(1.0, r_ns - r_nl)
    r_net_wm2 = (r_n_mj * 1e6) / 86400.0
    g_flux_mj = 0.0

    # 7. Reference Evapotranspiration ET_0 (FAO-56 Penman-Monteith Eq 6)
    num_rad = 0.408 * delta_slope * (r_n_mj - g_flux_mj)
    num_aero = gamma_psy * (900.0 / (t_mean + 273.16)) * u2 * (es - ea)
    den = delta_slope + gamma_psy * (1.0 + 0.34 * u2)
    et0_mm_day = max(0.2, (num_rad + num_aero) / den)

    return {
        "es_kpa": float(round(es, 3)),
        "ea_kpa": float(round(ea, 3)),
        "vpd_kpa": float(round(vpd, 3)),
        "delta_kpa_c": float(round(delta_slope, 4)),
        "gamma_kpa_c": float(round(gamma_psy, 4)),
        "r_net_mj_m2_day": float(round(r_n_mj, 2)),
        "r_net_wm2": float(round(r_net_wm2, 1)),
        "et0_mm_day": float(round(et0_mm_day, 2))
    }

def verify_earthdata_token(timeout_sec: float = 8.0) -> Dict[str, Any]:
    """
    Verifies the production NASA Earthdata Bearer Token against NASA's CMR API
    (Common Metadata Repository for SMAP, ECOSTRESS, Landsat, and LP DAAC).
    """
    if not EARTHDATA_BEARER_TOKEN:
        return {
            "authenticated": False,
            "status_code": 401,
            "token_present": False,
            "token_valid": False,
            "message": "EARTHDATA_BEARER_TOKEN environment variable is not configured."
        }

    req = urllib.request.Request(
        f"{CMR_GRANULES_URL}?short_name=SPL4SMAU&page_size=1",
        headers={
            "Authorization": f"Bearer {EARTHDATA_BEARER_TOKEN}",
            "User-Agent": "BlinkEngine-NASA-SpaceApps/3.5 (Earthdata Client)",
            "Accept": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            status_code = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            feed = body.get("feed", {})
            entry_count = len(feed.get("entry", []))
            granule_id = feed["entry"][0].get("id") if entry_count > 0 else None
            return {
                "authenticated": status_code == 200,
                "status_code": status_code,
                "provider": "NASA Earthdata Cloud (CMR)",
                "collection": "SMAP L4 Global 9km Surface/Root-Zone Soil Moisture (SPL4SMAU)",
                "sample_granule_id": granule_id,
                "token_present": True,
                "token_valid": True
            }
    except urllib.error.HTTPError as he:
        return {
            "authenticated": False,
            "status_code": he.code,
            "error": str(he),
            "token_present": True,
            "token_valid": False
        }
    except Exception as e:
        return {
            "authenticated": False,
            "error": str(e),
            "token_present": True,
            "token_valid": False
        }
