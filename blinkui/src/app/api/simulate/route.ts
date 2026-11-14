// ==============================================================================
// BlinkFarms — Simulation API Route
// Strictly Powered by Python Scientific Core Bridge (FastAPI Microservice)
// ==============================================================================

import { NextResponse } from 'next/server';
import { fetchSimulationFromPython } from '@/lib/pythonBridgeClient';
import { deriveFieldMemoryFromCoords, DEFAULT_PRIORITIES } from '@/lib/fieldPresets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const priorities = body.priorities || DEFAULT_PRIORITIES;
    const lat = typeof body.lat === 'number' ? body.lat : 30.850;
    const lon = typeof body.lon === 'number' ? body.lon : 31.050;
    const memory = body.memory || body.field_memory || deriveFieldMemoryFromCoords(lat, lon);
    const whatIfWaterCutPercent =
      typeof body.whatIfWaterCutPercent === 'number'
        ? body.whatIfWaterCutPercent
        : body.what_if_water_cut_percent ?? 0;
    const whatIfHeatwaveC =
      typeof body.whatIfHeatwaveC === 'number'
        ? body.whatIfHeatwaveC
        : body.what_if_heatwave_c ?? 0;
    const areaFeddan = body.areaFeddan || body.area_feddan || 15;
    const lang = body.lang || 'ar';

    const data = await fetchSimulationFromPython({
      lat,
      lon,
      priorities,
      fieldMemory: memory,
      whatIfWaterCutPercent,
      whatIfHeatwaveC,
      areaFeddan,
      lang,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute rotation simulation via Python bridge',
      },
      { status: 502 }
    );
  }
}
