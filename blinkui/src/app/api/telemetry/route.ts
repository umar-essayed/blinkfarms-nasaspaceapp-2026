// ==============================================================================
// BlinkFarms — Telemetry API Route
// Strictly Powered by Python Scientific Core Bridge (FastAPI Microservice)
// ==============================================================================

import { NextResponse } from 'next/server';
import { fetchTelemetryFromPython } from '@/lib/pythonBridgeClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '30.850');
    const lon = parseFloat(searchParams.get('lon') || '31.050');
    const cropId = searchParams.get('cropId') || searchParams.get('crop_id') || 'wheat_giza171';
    const soilType = searchParams.get('soilType') || searchParams.get('soil_type') || 'alluvial_clay';
    const fieldNameAr = searchParams.get('nameAr') || searchParams.get('fieldNameAr') || undefined;
    const fieldNameEn = searchParams.get('nameEn') || searchParams.get('fieldNameEn') || undefined;
    const simulateShock = searchParams.get('shock') === 'true' || searchParams.get('simulate_shock') === 'true';

    const data = await fetchTelemetryFromPython({
      lat,
      lon,
      cropId,
      soilType,
      fieldNameAr,
      fieldNameEn,
      simulateShock,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch telemetry from Python engine',
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lat = typeof body.lat === 'number' ? body.lat : 30.850;
    const lon = typeof body.lon === 'number' ? body.lon : 31.050;
    const cropId = body.crop_id || body.cropId || 'wheat_giza171';
    const soilType = body.soil_type || body.soilType || 'alluvial_clay';
    const fieldNameAr = body.nameAr || body.fieldNameAr || body.field_name_ar;
    const fieldNameEn = body.nameEn || body.fieldNameEn || body.field_name_en;
    const areaFeddan = body.areaFeddan || body.area_feddan;
    const areaHa = body.areaHa || body.area_ha;
    const simulateShock = Boolean(body.simulate_shock || body.shock);
    const lang = body.lang || 'ar';

    const data = await fetchTelemetryFromPython({
      lat,
      lon,
      cropId,
      soilType,
      fieldNameAr,
      fieldNameEn,
      areaFeddan,
      areaHa,
      lang,
      simulateShock,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute telemetry via Python bridge',
      },
      { status: 502 }
    );
  }
}
