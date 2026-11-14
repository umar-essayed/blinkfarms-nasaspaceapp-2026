// ==============================================================================
// BlinkFarms — Field Presets & National Project Spatial Boundaries
// Authentic Geographic Coordinates, Polygonal Edges & Internal Sub-Parcels
// Single Source of Truth for Farm Geometries & UI Presets
// ==============================================================================

import { FieldPreset, UserPriorities, FieldMemoryState, SubParcel } from './types';

export type { FieldPreset, UserPriorities, SubParcel };

// Default Decision Theory Weights for Dynamic TOPSIS (Multi-Criteria Matrix)
export const DEFAULT_PRIORITIES: UserPriorities = {
  profitWeight: 0.25,
  waterWeight: 0.35,
  soilHealthWeight: 0.25,
  climateRiskWeight: 0.15,
};

// Comprehensive National Agricultural Mega-Projects with Outer Boundaries & Internal Sub-Plots
export const DEMO_FIELDS: FieldPreset[] = [
  {
    id: 'nile_delta',
    nameAr: 'دلتا النيل (طنطا / الغربية)',
    nameEn: 'Nile Delta Alluvial Basin (Tanta)',
    locationAr: 'دلتا النيل، مصر',
    locationEn: 'Nile Delta, Egypt',
    coordinates: [30.850, 31.050],
    cropNameAr: 'ذرة شامية وبرسيم بلدي',
    cropNameEn: 'Surface-Irrigated Maize & Clover',
    soilTypeAr: 'طميية نيلية ثقيلة خصبة',
    soilTypeEn: 'Alluvial Heavy Clay Loam',
    areaHa: 15,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.65,
      stressFrequency36m: 0.15,
      accumulatedHeatLoad: 1100,
      soilErrorIndex: 0.88,
      previousCropId: 'berseem',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    },
    polygonBoundary: [
      [30.865, 31.035],
      [30.872, 31.065],
      [30.840, 31.070],
      [30.832, 31.040],
      [30.865, 31.035],
    ],
    internalSubParcels: [
      {
        id: 'delta_p1',
        nameAr: 'حوض البركة (قمح/ذرة)',
        nameEn: 'Al-Baraka Basin',
        cropAr: 'ذرة شامية',
        cropEn: 'Maize',
        areaFeddan: 8,
        type: 'basin',
        boundary: [
          [30.865, 31.035],
          [30.872, 31.065],
          [30.855, 31.067],
          [30.848, 31.037],
          [30.865, 31.035],
        ],
      },
      {
        id: 'delta_p2',
        nameAr: 'حوض الساحل (برسيم مسقاوي)',
        nameEn: 'Al-Sahel Basin',
        cropAr: 'برسيم بلدي',
        cropEn: 'Berseem Clover',
        areaFeddan: 7,
        type: 'basin',
        boundary: [
          [30.848, 31.037],
          [30.855, 31.067],
          [30.840, 31.070],
          [30.832, 31.040],
          [30.848, 31.037],
        ],
      },
    ],
  },
  {
    id: 'toshka_reclaimed',
    nameAr: 'مشروع توشكى الخير (جنوب الوادي)',
    nameEn: 'Toshka Mega-Project (South Valley)',
    locationAr: 'الوادي الجديد، توشكى، مصر',
    locationEn: 'Toshka Basin, New Valley, Egypt',
    coordinates: [22.684, 31.543],
    cropNameAr: 'قمح استراتيجي ونخيل تحت ري محوري',
    cropNameEn: 'Pivot Wheat & Date Palm Mega-Basin',
    soilTypeAr: 'رملية خفيفة مستصلحة ذات طبقة كلسية',
    soilTypeEn: 'Reclaimed Calcareous Sand',
    areaHa: 120,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.38,
      stressFrequency36m: 0.40,
      accumulatedHeatLoad: 2100,
      soilErrorIndex: 0.65,
      previousCropId: 'wheat',
      hardpanDetected: true,
      salinityRiskLevel: 'moderate',
    },
    polygonBoundary: [
      [22.720, 31.500],
      [22.735, 31.590],
      [22.645, 31.605],
      [22.630, 31.515],
      [22.720, 31.500],
    ],
    internalSubParcels: [
      {
        id: 'toshka_pivot_1',
        nameAr: 'بيفوت 1 (قمح صلب - بني سويف 5)',
        nameEn: 'Center Pivot 01 (Durum Wheat)',
        cropAr: 'قمح صلب',
        cropEn: 'Durum Wheat',
        areaFeddan: 125,
        type: 'pivot',
        boundary: [
          [22.715, 31.510],
          [22.725, 31.545],
          [22.685, 31.550],
          [22.675, 31.515],
          [22.715, 31.510],
        ],
      },
      {
        id: 'toshka_pivot_2',
        nameAr: 'بيفوت 2 (شعير جيزة 126 وعلف)',
        nameEn: 'Center Pivot 02 (Barley & Fodder)',
        cropAr: 'شعير جيزة',
        cropEn: 'Barley',
        areaFeddan: 125,
        type: 'pivot',
        boundary: [
          [22.725, 31.545],
          [22.735, 31.585],
          [22.695, 31.590],
          [22.685, 31.550],
          [22.725, 31.545],
        ],
      },
      {
        id: 'toshka_palm_sector',
        nameAr: 'قطاع نخيل المجدول والبرحي',
        nameEn: 'Medjool Date Palm Sector',
        cropAr: 'نخيل مجدول',
        cropEn: 'Date Palm',
        areaFeddan: 50,
        type: 'strip',
        boundary: [
          [22.675, 31.515],
          [22.695, 31.590],
          [22.645, 31.605],
          [22.630, 31.515],
          [22.675, 31.515],
        ],
      },
    ],
  },
  {
    id: 'new_delta_future',
    nameAr: 'مشروع الدلتا الجديدة ومستقبل مصر',
    nameEn: 'New Delta & Mostaqbal Misr',
    locationAr: 'محور الضبعة، الصحراء الغربية، مصر',
    locationEn: 'Dabaa Corridor, Western Desert, Egypt',
    coordinates: [30.220, 30.120],
    cropNameAr: 'محاصيل حبوب وزيوت وبنجر سكر',
    cropNameEn: 'Modern Pivot Cereals & Sugar Beet',
    soilTypeAr: 'رملية طميية جيدة الصرف',
    soilTypeEn: 'Reclaimed Sandy Loam',
    areaHa: 200,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.50,
      stressFrequency36m: 0.22,
      accumulatedHeatLoad: 1450,
      soilErrorIndex: 0.78,
      previousCropId: 'barley',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    },
    polygonBoundary: [
      [30.260, 30.080],
      [30.280, 30.170],
      [30.175, 30.185],
      [30.155, 30.095],
      [30.260, 30.080],
    ],
    internalSubParcels: [
      {
        id: 'new_delta_p1',
        nameAr: 'قطاع A (بنجر سكر - ري محوري)',
        nameEn: 'Sector A (Sugar Beet Pivot)',
        cropAr: 'بنجر سكر',
        cropEn: 'Sugar Beet',
        areaFeddan: 150,
        type: 'pivot',
        boundary: [
          [30.260, 30.080],
          [30.280, 30.170],
          [30.220, 30.178],
          [30.200, 30.088],
          [30.260, 30.080],
        ],
      },
      {
        id: 'new_delta_p2',
        nameAr: 'قطاع B (قمح خبز - مصر 3)',
        nameEn: 'Sector B (Bread Wheat Misr 3)',
        cropAr: 'قمح مصر 3',
        cropEn: 'Bread Wheat',
        areaFeddan: 150,
        type: 'pivot',
        boundary: [
          [30.200, 30.088],
          [30.220, 30.178],
          [30.175, 30.185],
          [30.155, 30.095],
          [30.200, 30.088],
        ],
      },
    ],
  },
  {
    id: 'east_oweinat',
    nameAr: 'مشروع شرق العوينات (جنوب غرب مصر)',
    nameEn: 'East Oweinat Deep Aquifer Basin',
    locationAr: 'شرق العوينات، الوادي الجديد، مصر',
    locationEn: 'East Oweinat, New Valley, Egypt',
    coordinates: [22.490, 28.650],
    cropNameAr: 'قمح وبطاطس أورجانيك ومحاور عملاقة',
    cropNameEn: 'Deep-Well Center Pivot Wheat & Potatoes',
    soilTypeAr: 'رملية خشنة مستصلحة نقية',
    soilTypeEn: 'Desert Deep Sand',
    areaHa: 150,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.42,
      stressFrequency36m: 0.35,
      accumulatedHeatLoad: 2200,
      soilErrorIndex: 0.70,
      previousCropId: 'wheat',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    },
    polygonBoundary: [
      [22.530, 28.605],
      [22.545, 28.695],
      [22.445, 28.710],
      [22.430, 28.620],
      [22.530, 28.605],
    ],
    internalSubParcels: [
      {
        id: 'oweinat_pivot_north',
        nameAr: 'بيفوت شمالي (بطاطس تصديرية أورجانيك)',
        nameEn: 'North Pivot (Organic Potatoes)',
        cropAr: 'بطاطس تصدير',
        cropEn: 'Export Potatoes',
        areaFeddan: 140,
        type: 'pivot',
        boundary: [
          [22.530, 28.605],
          [22.545, 28.695],
          [22.490, 28.702],
          [22.475, 28.612],
          [22.530, 28.605],
        ],
      },
      {
        id: 'oweinat_pivot_south',
        nameAr: 'بيفوت جنوبي (تقاوي قمح بني سويف)',
        nameEn: 'South Pivot (Wheat Seeds)',
        cropAr: 'تقاوي قمح',
        cropEn: 'Certified Wheat Seeds',
        areaFeddan: 140,
        type: 'pivot',
        boundary: [
          [22.475, 28.612],
          [22.490, 28.702],
          [22.445, 28.710],
          [22.430, 28.620],
          [22.475, 28.612],
        ],
      },
    ],
  },
  {
    id: 'minya_valley',
    nameAr: 'مشروع غرب غرب المنيا (1.5 مليون فدان)',
    nameEn: 'West Minya 1.5M Feddan Project',
    locationAr: 'غرب المنيا، مصر',
    locationEn: 'West Minya, Egypt',
    coordinates: [28.312, 30.714],
    cropNameAr: 'بنجر سكر وفول صويا وعباد شمس',
    cropNameEn: 'Sugar Beet, Soybean & Sunflower',
    soilTypeAr: 'رملية طميية كلسية',
    soilTypeEn: 'Alluvial & Calcareous Sand Mix',
    areaHa: 45,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.55,
      stressFrequency36m: 0.20,
      accumulatedHeatLoad: 1350,
      soilErrorIndex: 0.82,
      previousCropId: 'soybean',
      hardpanDetected: false,
      salinityRiskLevel: 'moderate',
    },
    polygonBoundary: [
      [28.335, 30.690],
      [28.345, 30.745],
      [28.285, 30.755],
      [28.275, 30.700],
      [28.335, 30.690],
    ],
    internalSubParcels: [
      {
        id: 'minya_block_1',
        nameAr: 'مربع 1 (بنجر سكر عالي الحلاوة)',
        nameEn: 'Block 1 (Sugar Beet)',
        cropAr: 'بنجر سكر',
        cropEn: 'Sugar Beet',
        areaFeddan: 55,
        type: 'basin',
        boundary: [
          [28.335, 30.690],
          [28.345, 30.745],
          [28.310, 30.750],
          [28.300, 30.695],
          [28.335, 30.690],
        ],
      },
      {
        id: 'minya_block_2',
        nameAr: 'مربع 2 (صويا جيزة 111 وعباد شمس)',
        nameEn: 'Block 2 (Soybean & Sunflower)',
        cropAr: 'فول صويا',
        cropEn: 'Soybean',
        areaFeddan: 50,
        type: 'basin',
        boundary: [
          [28.300, 30.695],
          [28.310, 30.750],
          [28.285, 30.755],
          [28.275, 30.700],
          [28.300, 30.695],
        ],
      },
    ],
  },
  {
    id: 'sanabel_sono',
    nameAr: 'مشروع سنابل سونو (محافظة أسوان)',
    nameEn: 'Sanabel Sono Project (Aswan)',
    locationAr: 'وادي النقرة، أسوان، مصر',
    locationEn: 'Wadi Al-Nokra, Aswan, Egypt',
    coordinates: [24.120, 32.880],
    cropNameAr: 'قمح مبكر وذرة رفيعة وسمسم',
    cropNameEn: 'Early Wheat, Sorghum & Sesame',
    soilTypeAr: 'طميية رملية غرينية مستصلحة',
    soilTypeEn: 'Alluvial Reclaimed Loam',
    areaHa: 60,
    isShockByDefault: false,
    fieldMemory: {
      carryoverWaterFraction: 0.45,
      stressFrequency36m: 0.30,
      accumulatedHeatLoad: 1950,
      soilErrorIndex: 0.72,
      previousCropId: 'wheat',
      hardpanDetected: false,
      salinityRiskLevel: 'moderate',
    },
    polygonBoundary: [
      [24.145, 32.855],
      [24.155, 32.910],
      [24.095, 32.920],
      [24.085, 32.865],
      [24.145, 32.855],
    ],
    internalSubParcels: [
      {
        id: 'sono_block_a',
        nameAr: 'حوض A (قمح مبكر سدس 12)',
        nameEn: 'Basin A (Early Wheat Sids 12)',
        cropAr: 'قمح سدس 12',
        cropEn: 'Early Wheat',
        areaFeddan: 70,
        type: 'basin',
        boundary: [
          [24.145, 32.855],
          [24.155, 32.910],
          [24.120, 32.915],
          [24.110, 32.860],
          [24.145, 32.855],
        ],
      },
      {
        id: 'sono_block_b',
        nameAr: 'حوض B (ذرة رفيعة جيزة 15 وسمسم)',
        nameEn: 'Basin B (Sorghum & Sesame)',
        cropAr: 'ذرة رفيعة',
        cropEn: 'Sorghum',
        areaFeddan: 70,
        type: 'basin',
        boundary: [
          [24.110, 32.860],
          [24.120, 32.915],
          [24.095, 32.920],
          [24.085, 32.865],
          [24.110, 32.860],
        ],
      },
    ],
  },
];

/**
 * Deterministic spatial lookup for initial field memory state based on geographic proximity
 */
export function deriveFieldMemoryFromCoords(lat: number, lon: number): FieldMemoryState {
  const match = DEMO_FIELDS.find(
    (f) => Math.abs(f.coordinates[0] - lat) < 0.15 && Math.abs(f.coordinates[1] - lon) < 0.15
  );
  if (match) {
    return { ...match.fieldMemory };
  }

  // Regional geographic defaults
  const absLat = Math.abs(lat);
  if (absLat < 25.0) {
    // Upper Egypt / Toshka / East Oweinat / Aswan
    return {
      carryoverWaterFraction: 0.38,
      stressFrequency36m: 0.40,
      accumulatedHeatLoad: 2150,
      soilErrorIndex: 0.65,
      previousCropId: 'wheat',
      hardpanDetected: true,
      salinityRiskLevel: 'moderate',
    };
  }

  if (absLat >= 30.0 && absLat <= 31.8 && lon >= 29.5 && lon <= 32.5) {
    // Nile Delta
    return {
      carryoverWaterFraction: 0.65,
      stressFrequency36m: 0.15,
      accumulatedHeatLoad: 1100,
      soilErrorIndex: 0.88,
      previousCropId: 'berseem',
      hardpanDetected: false,
      salinityRiskLevel: 'normal',
    };
  }

  // General default
  return {
    carryoverWaterFraction: 0.50,
    stressFrequency36m: 0.20,
    accumulatedHeatLoad: 1350,
    soilErrorIndex: 0.80,
    previousCropId: 'wheat',
    hardpanDetected: false,
    salinityRiskLevel: 'normal',
  };
}
