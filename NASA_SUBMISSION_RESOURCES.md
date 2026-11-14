# 🚀 NASA Space Apps Challenge 2026 — Official Resources & Data Submission
**Project Name:** BlinkFarms — Field Shift / Adapting Farms with NASA Data  
**Repository:** https://github.com/umar-essayed/blinkfarms-nasaspaceapp-2026.git  

---

## 🛰️ 1. NASA Data or Resources
*Copy and paste these entries directly into the **"NASA Data or Resources"** section on the Space Apps submission portal:*

| Link Text | Link Url |
|---|---|
| NASA POWER Daily Agrometeorology API | https://power.larc.nasa.gov |
| NASA ECOSTRESS Thermal Evapotranspiration & Evaporative Stress Index (ESI) | https://ecostress.jpl.nasa.gov |
| NASA SMAP L4 Global 9 km Surface and Root-Zone Soil Moisture | https://smap.jpl.nasa.gov |
| NASA Harmonized Landsat and Sentinel-2 (HLS) Operational Land Imager | https://hls.gsfc.nasa.gov |
| NASA Global Precipitation Measurement (GPM) IMERG Half-Hourly & Daily Precipitation | https://gpm.nasa.gov |
| NASA GRACE-FO Groundwater Storage Anomaly (GWS) | https://gracefo.jpl.nasa.gov |
| NASA NASADEM Global Elevation Model 1 Arc-Second 30m | https://www.earthdata.nasa.gov/sensors/nasadem |
| NASA Earthdata Search & Open Geospatial Access | https://search.earthdata.nasa.gov |
| AmeriFlux US-Ne1 Mead Irrigated Maize Eddy Covariance Flux Tower | https://ameriflux.lbl.gov/sites/siteinfo/US-Ne1 |

---

### Detailed NASA Resource Justifications (For Reviewers):
1. **NASA POWER Daily Agrometeorology API** (https://power.larc.nasa.gov)  
   *Usage:* Daily all-sky surface solar radiation ($R_s, R_n$), 2-meter air temperature ($T_{\text{air}}, T_{\min}, T_{\max}$), relative humidity ($RH$), 2-meter wind speed ($u_2$), vapor pressure deficit ($VPD$), and atmospheric pressure for computing FAO-56 Penman-Monteith reference evapotranspiration ($ET_0$) and Growing Degree Days ($GDD$).
2. **NASA ECOSTRESS Thermal Infrared Sensor** (https://ecostress.jpl.nasa.gov)  
   *Usage:* High-resolution (70m) canopy surface temperature ($T_{\text{canopy}}$), transpirational thermal anomaly ("Canopy Fever" $\Delta T = T_{\text{canopy}} - T_{\text{air}}$), and Evaporative Stress Index ($ESI = ET_a / PET$) to provide early warning of Flash Drought 10 to 14 days before optical vegetation discoloration.
3. **NASA SMAP L4 Soil Moisture** (https://smap.jpl.nasa.gov)  
   *Usage:* Root-zone ($0\text{--}100\text{ cm}$) and surface ($0\text{--}5\text{ cm}$) volumetric soil moisture ($\theta$). Downscaled from 9km to 30m using high-resolution optical/DEM features with strict KKT Lagrangian mass conservation (error $< 10^{-12}$).
4. **NASA HLS (Harmonized Landsat Sentinel-2)** (https://hls.gsfc.nasa.gov)  
   *Usage:* 30m multispectral surface reflectance (Red, NIR, SWIR) to compute NDVI, SAVI ($L=0.5$ background-adjusted for desert sand), and fractional vegetation cover ($f_c$) for dual crop coefficient partitioning ($K_c = K_{cb} + K_e$).
5. **NASA GPM IMERG Precipitation** (https://gpm.nasa.gov)  
   *Usage:* 0.1° half-hourly and daily rainfall accumulation and 30-minute peak burst intensity ($I_{30}$) for effective soil water balance and the RUSLE rainfall erosivity factor ($R$).
6. **NASA GRACE-FO Gravity & Groundwater** (https://gracefo.jpl.nasa.gov)  
   *Usage:* Deep regional groundwater storage anomalies ($\Delta GWS$) to assess sustainable aquifer withdrawal in desert agricultural megaprojects (Nubian Sandstone Aquifer).
7. **NASA NASADEM / SRTM Topography** (https://www.earthdata.nasa.gov/sensors/nasadem)  
   *Usage:* 30m digital elevation model, field slope percentage, slope length factor ($LS$), and Topographic Wetness Index ($TWI = \ln(a / \tan \beta)$) for agricultural drainage and soil erosion modeling.
8. **NASA Earthdata Search** (https://search.earthdata.nasa.gov)  
   *Usage:* Unified NASA EOSDIS API access and geospatial data discovery gateway.
9. **AmeriFlux US-Ne1 Eddy Covariance Tower** (https://ameriflux.lbl.gov/sites/siteinfo/US-Ne1)  
   *Usage:* Published empirical ground-truth observations from the Mead, Nebraska flux tower for genuine, unadjusted model validation of actual evapotranspiration ($ET_a$) and latent heat flux ($LE$), achieving $R^2 = 0.8336$ and $\text{RMSE} = 1.79\text{ mm/day}$ with zero synthetic data.

---

## 🌍 2. Space Agency Partner & Other Data
*Copy and paste these entries directly into the **"Space Agency Partner & Other Data"** section:*

| Link Text | Link Url |
|---|---|
| ESA Copernicus Sentinel-1 C-Band SAR Ground Range Detected (GRD) | https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-1 |
| ESA Copernicus Sentinel-2 High-Resolution Optical Surface Reflectance | https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2 |
| FAO Irrigation and Drainage Paper 56: Crop Evapotranspiration Guidelines | https://www.fao.org/land-water/databases-and-software/crop-information/en/ |
| FAO Irrigation and Drainage Paper 33: Yield Response to Water (Stewart Model) | https://www.fao.org/3/x5560e/x5560e00.htm |
| ISRIC SoilGrids 250m Global Gridded Soil Information | https://www.isric.org/explore/soilgrids |
| Agricultural Research Center (ARC) Egypt - Certified Cultivar Specifications | https://www.arc.sci.eg |
| USGS EROS Landsat Collection 2 Level-2 Surface Reflectance | https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-reflectance |
| OpenStreetMap Global Geospatial Database | https://www.openstreetmap.org |

---

### Detailed Partner & Other Resource Justifications (For Reviewers):
1. **ESA Copernicus Sentinel-1 C-Band SAR** (https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-1)  
   *Usage:* Dual-polarization (VV/VH) radar backscatter for all-weather, cloud-penetrating crop structural monitoring and virtual canopy temperature reconstruction during dust storms and persistent cloud cover.
2. **ESA Copernicus Sentinel-2 Optical MSI** (https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2)  
   *Usage:* 10m/20m multispectral imagery harmonized with Landsat for parcel-level vegetation indices, phenological stage tracking, and agricultural field boundary geometry.
3. **FAO Irrigation and Drainage Paper 56** (https://www.fao.org/land-water/databases-and-software/crop-information/en/)  
   *Usage:* Authoritative biophysical reference equations for standard Penman-Monteith reference evapotranspiration ($ET_0$) and dual crop coefficient ($K_{cb} + K_e$) partitioning.
4. **FAO Irrigation and Drainage Paper 33 (Stewart Model)** (https://www.fao.org/3/x5560e/x5560e00.htm)  
   *Usage:* Empirically calibrated yield response factors ($K_y$) and the Stewart water-yield production function for assessing crop yield penalties under deficit irrigation.
5. **ISRIC SoilGrids 250m** (https://www.isric.org/explore/soilgrids)  
   *Usage:* Global 250m digital soil mapping providing sand, silt, clay, bulk density, pH, and soil organic carbon (SOC) for Saxton-Rawls pedotransfer functions (Field Capacity, Wilting Point, and Campbell retention curves).
6. **Agricultural Research Center (ARC), Ministry of Agriculture, Egypt** (https://www.arc.sci.eg)  
   *Usage:* Certified Egyptian cultivar specifications (Bread Wheat Giza 171, Sakha 95; Winter Barley Giza 123/126; Faba Bean Sakha 1), salinity tolerance thresholds, maturation schedules, and official national procurement prices.
7. **USGS EROS Landsat Collection 2** (https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-reflectance)  
   *Usage:* Decadal optical and thermal surface reflectance records used to reconstruct 5-year historical agro-climatic memory and 16D state vectors.
8. **OpenStreetMap** (https://www.openstreetmap.org)  
   *Usage:* Open-access global geospatial cartography, road networks, and regional boundary reference layers.
