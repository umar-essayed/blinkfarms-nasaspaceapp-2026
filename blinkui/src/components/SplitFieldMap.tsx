'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Language, SubParcel } from '@/lib/types';

interface SplitFieldMapProps {
  lat: number;
  lon: number;
  fieldName: string;
  lang: Language;
  onLocationChange: (lat: number, lon: number, locationName?: string) => void;
  canopyTempAnomaly?: number;
  isShockActive?: boolean;
  isSimulatingTelemetry?: boolean;
  polygonBoundary?: [number, number][];
  subParcels?: SubParcel[];
  onCustomPolygonChange?: (coords: [number, number][], areaFeddan: number) => void;
}

// Geodesic spherical polygon area calculation in Egyptian Feddans (1 Feddan = 4200.83 m²)
function calculatePolygonAreaFeddans(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137; // Earth radius in meters
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
    area += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 4.0);
  const feddan = area / 4200.83;
  return Number(feddan.toFixed(1));
}

export default function SplitFieldMap({
  lat,
  lon,
  fieldName,
  lang,
  onLocationChange,
  isShockActive = false,
  polygonBoundary,
  subParcels,
  onCustomPolygonChange,
}: SplitFieldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const parcelLayerGroupRef = useRef<any>(null);
  const editLayerGroupRef = useRef<any>(null);

  // Edit / Boundary Mode state
  const [isEditingBounds, setIsEditingBounds] = useState<boolean>(false);
  const [editableCorners, setEditableCorners] = useState<[number, number][]>([]);
  const [liveFeddans, setLiveFeddans] = useState<number>(0);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // References to keep event handlers current without re-binding Leaflet listeners
  const isEditingBoundsRef = useRef<boolean>(false);
  isEditingBoundsRef.current = isEditingBounds;

  const editableCornersRef = useRef<[number, number][]>([]);
  editableCornersRef.current = editableCorners;

  // 1. Initialize Map ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isCancelled = false;

    import('leaflet').then((leafletModule) => {
      if (isCancelled || !mapContainerRef.current) return;
      const L = leafletModule.default || leafletModule;
      leafletRef.current = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        // High-performance Leaflet container
        const map = L.map(mapContainerRef.current, {
          center: [lat, lon],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: true,
          zoomAnimation: true,
        });

        // Crystal-Clear Esri High-Resolution Satellite Map (Ultra Reliable & Pure)
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            errorTileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          }
        ).addTo(map);

        // Dedicated layer groups for safe updates
        parcelLayerGroupRef.current = L.layerGroup().addTo(map);
        editLayerGroupRef.current = L.layerGroup().addTo(map);

        // Apple / Forest Ruin Center Marker
        const customIcon = L.divIcon({
          className: 'apple-pulsing-marker',
          html: `<div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(47,110,62,0.35); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:22px; height:22px; background:#384536; border:3px solid #FAF7F2; border-radius:50%; box-shadow:0 4px 14px rgba(0,0,0,0.45); z-index:2; display:flex; align-items:center; justify-content:center;">
              <div style="width:6px; height:6px; background:#EFDFC8; border-radius:50%;"></div>
            </div>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([lat, lon], { icon: customIcon, draggable: true }).addTo(map);
        centerMarkerRef.current = marker;

        marker.on('dragend', () => {
          if (isEditingBoundsRef.current) return;
          const pos = marker.getLatLng();
          const nLat = Number(pos.lat.toFixed(4));
          const nLon = Number(pos.lng.toFixed(4));
          onLocationChange(nLat, nLon);
        });

        // Click on map
        map.on('click', (e: any) => {
          if (isEditingBoundsRef.current) {
            // In bounds edit mode: if user clicks, add or update nearest corner
            const clickLat = Number(e.latlng.lat.toFixed(5));
            const clickLon = Number(e.latlng.lng.toFixed(5));
            const currentCorners = editableCornersRef.current;

            if (currentCorners.length < 32) {
              const updated = [...currentCorners, [clickLat, clickLon] as [number, number]];
              setEditableCorners(updated);
              setLiveFeddans(calculatePolygonAreaFeddans(updated));
              renderEditableCornerHandles(L, map, updated);
            }
          } else {
            marker.setLatLng(e.latlng);
            const nLat = Number(e.latlng.lat.toFixed(4));
            const nLon = Number(e.latlng.lng.toFixed(4));
            onLocationChange(nLat, nLon);
          }
        });

        mapInstanceRef.current = map;
        renderStaticPolygons(L, map, polygonBoundary, subParcels, [lat, lon], isShockActive);
      }
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Safely re-render polygons when props change
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng([lat, lon]);
    }

    if (!isEditingBounds) {
      renderStaticPolygons(L, map, polygonBoundary, subParcels, [lat, lon], isShockActive);
    }
  }, [lat, lon, polygonBoundary, subParcels, isShockActive, isEditingBounds]);

  // Render static parcels and official national project polygons
  const renderStaticPolygons = (
    L: any,
    map: any,
    boundary: [number, number][] | undefined,
    subs: SubParcel[] | undefined,
    center: [number, number],
    shock: boolean
  ) => {
    if (!parcelLayerGroupRef.current) return;
    parcelLayerGroupRef.current.clearLayers();

    // Internal sub-parcels
    if (subs && subs.length > 0) {
      subs.forEach((sp) => {
        if (sp.boundary && sp.boundary.length >= 3) {
          const subPoly = L.polygon(sp.boundary, {
            color: sp.type === 'pivot' ? '#38BDF8' : '#22C55E',
            weight: 2.5,
            dashArray: '4, 4',
            fillOpacity: 0.22,
            fillColor: sp.type === 'pivot' ? '#0284C7' : '#16A34A',
          }).addTo(parcelLayerGroupRef.current);

          subPoly.bindTooltip(
            `<div style="font-family:Cairo,sans-serif; font-size:11px; font-weight:bold; padding:2px 4px; text-align:center;">
              <div>${lang === 'ar' ? sp.nameAr : sp.nameEn}</div>
              <div style="color:#2F6E3E; font-size:10px;">${lang === 'ar' ? sp.cropAr : sp.cropEn} (${sp.areaFeddan} ${lang === 'ar' ? 'فدان' : 'fed'})</div>
            </div>`,
            { sticky: true, className: 'leaflet-apple-tooltip' }
          );
        }
      });
    }

    // Outer boundary polygon
    if (boundary && boundary.length >= 3) {
      const poly = L.polygon(boundary, {
        color: shock ? '#EF4444' : '#22C55E',
        weight: 3.5,
        fillOpacity: shock ? 0.32 : 0.22,
        fillColor: shock ? '#EF4444' : '#16A34A',
      }).addTo(parcelLayerGroupRef.current);

      try {
        map.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 15 });
      } catch {}
      return;
    }

    // Default parcel rectangle around center
    const delta = 0.0028;
    const defaultBox: [number, number][] = [
      [center[0] - delta, center[1] - delta],
      [center[0] - delta, center[1] + delta],
      [center[0] + delta, center[1] + delta],
      [center[0] + delta, center[1] - delta],
    ];

    const defPoly = L.polygon(defaultBox, {
      color: shock ? '#EF4444' : '#22C55E',
      weight: 2.5,
      dashArray: '4, 4',
      fillOpacity: shock ? 0.28 : 0.18,
      fillColor: shock ? '#EF4444' : '#16A34A',
    }).addTo(parcelLayerGroupRef.current);

    try {
      map.setView(center, 14, { animate: true });
    } catch {}

    map.setView(center, map.getZoom() || 15, { animate: true });
  };

  // Render interactive draggable corners in Boundary Edit Mode
  const renderEditableCornerHandles = (L: any, map: any, corners: [number, number][]) => {
    if (!editLayerGroupRef.current) return;
    editLayerGroupRef.current.clearLayers();

    if (corners.length === 0) return;

    // Draw polygon connection
    if (corners.length >= 3) {
      L.polygon(corners, {
        color: '#2F6E3E',
        weight: 3,
        dashArray: '5, 5',
        fillColor: '#2F6E3E',
        fillOpacity: 0.26,
      }).addTo(editLayerGroupRef.current);
    } else if (corners.length === 2) {
      L.polyline(corners, {
        color: '#2F6E3E',
        weight: 3,
        dashArray: '5, 5',
      }).addTo(editLayerGroupRef.current);
    }

    // Draw Draggable Corner Handle Markers
    corners.forEach((cornerCoord, idx) => {
      const handleIcon = L.divIcon({
        className: 'corner-drag-handle',
        html: `<div style="width:24px; height:24px; border-radius:50%; background:#FAF7F2; border:3px solid #2F6E3E; box-shadow:0 2px 8px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; cursor:move;">
          <div style="width:8px; height:8px; border-radius:50%; background:#2F6E3E;"></div>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const handleMarker = L.marker(cornerCoord, {
        icon: handleIcon,
        draggable: true,
      }).addTo(editLayerGroupRef.current);

      handleMarker.on('contextmenu', () => {
        if (editableCornersRef.current.length > 3) {
          const filtered = editableCornersRef.current.filter((_, i) => i !== idx);
          editableCornersRef.current = filtered;
          setEditableCorners(filtered);
          setLiveFeddans(calculatePolygonAreaFeddans(filtered));
          renderEditableCornerHandles(L, map, filtered);
        }
      });

      handleMarker.on('drag', (e: any) => {
        const newPos = e.target.getLatLng();
        const updatedCorners = [...editableCornersRef.current];
        updatedCorners[idx] = [
          Number(newPos.lat.toFixed(5)),
          Number(newPos.lng.toFixed(5)),
        ];
        editableCornersRef.current = updatedCorners;
        setEditableCorners(updatedCorners);
        setLiveFeddans(calculatePolygonAreaFeddans(updatedCorners));

        // Re-render only polygon outline smoothly
        const poly = editLayerGroupRef.current
          .getLayers()
          .find((layer: any) => layer instanceof L.Polygon);
        if (poly) {
          poly.setLatLngs(updatedCorners);
        }
      });
    });
  };

  // Start Boundary Editing: Creates 4 draggable corners matching current boundary
  const handleStartBoundaryEdit = () => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    let initialCorners: [number, number][];

    if (polygonBoundary && polygonBoundary.length >= 3) {
      // Retain full polygon coordinates with all jagged corners and curves
      initialCorners = polygonBoundary.map((p) => [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))]);
    } else {
      // Create clean 4-corner box around current pin (~15 feddans)
      const delta = 0.003;
      initialCorners = [
        [Number((lat - delta).toFixed(5)), Number((lon - delta).toFixed(5))],
        [Number((lat - delta).toFixed(5)), Number((lon + delta).toFixed(5))],
        [Number((lat + delta).toFixed(5)), Number((lon + delta).toFixed(5))],
        [Number((lat + delta).toFixed(5)), Number((lon - delta).toFixed(5))],
      ];
    }

    setEditableCorners(initialCorners);
    setLiveFeddans(calculatePolygonAreaFeddans(initialCorners));
    setIsEditingBounds(true);

    if (parcelLayerGroupRef.current) {
      parcelLayerGroupRef.current.clearLayers();
    }

    renderEditableCornerHandles(L, map, initialCorners);
  };

  // Align Corners into a Clean Rectangle / Square (Auto-Snap)
  const handleAlignSquare = () => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map || editableCorners.length < 2) return;

    const lats = editableCorners.map((p) => p[0]);
    const lons = editableCorners.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const alignedBox: [number, number][] = [
      [minLat, minLon],
      [minLat, maxLon],
      [maxLat, maxLon],
      [maxLat, minLon],
    ];

    setEditableCorners(alignedBox);
    setLiveFeddans(calculatePolygonAreaFeddans(alignedBox));
    renderEditableCornerHandles(L, map, alignedBox);
  };

  // Save & Apply Defined Boundary
  const handleSaveBoundary = () => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    if (editableCorners.length >= 3) {
      const area = liveFeddans || calculatePolygonAreaFeddans(editableCorners);
      if (onCustomPolygonChange) {
        onCustomPolygonChange(editableCorners, area);
      }
    }

    setIsEditingBounds(false);
    if (editLayerGroupRef.current) {
      editLayerGroupRef.current.clearLayers();
    }

    if (L && map) {
      renderStaticPolygons(L, map, editableCorners, undefined, [lat, lon], isShockActive);
    }
  };

  // Cancel Boundary Editing
  const handleCancelBoundary = () => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    setIsEditingBounds(false);
    setEditableCorners([]);
    if (editLayerGroupRef.current) {
      editLayerGroupRef.current.clearLayers();
    }

    if (L && map) {
      renderStaticPolygons(L, map, polygonBoundary, subParcels, [lat, lon], isShockActive);
    }
  };

  // Map Recenter
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([lat, lon], 15, { animate: true });
  };

  // GPS Locate
  const handleGps = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const uLat = Number(pos.coords.latitude.toFixed(4));
        const uLon = Number(pos.coords.longitude.toFixed(4));
        onLocationChange(uLat, uLon, lang === 'ar' ? 'موقعي (GPS)' : 'My GPS Location');
      },
      () => setIsLocating(false),
      { timeout: 8000 }
    );
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
  };

  return (
    <div className="relative w-full h-[280px] sm:h-[360px] md:h-[420px] lg:h-[480px] xl:h-[500px] rounded-3xl overflow-hidden border border-[#384536]/15 shadow-md bg-[#222822] select-none">
      {/* Real Interactive Leaflet Satellite Canvas (Clean, High-Res, Zero Flashing) */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Controls: Clean & Uncrowded */}
      <div className="absolute top-3.5 inset-x-3.5 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        {/* Farm Boundary Mode Trigger */}
        {!isEditingBounds ? (
          <button
            onClick={handleStartBoundaryEdit}
            className="pointer-events-auto h-9 lg:h-11 px-3.5 lg:px-5 rounded-2xl bg-[#FAF7F2]/95 hover:bg-white text-[#243023] hover:text-[#2F6E3E] text-xs lg:text-sm font-bold flex items-center gap-2 shadow-md border border-[#384536]/15 transition-all active:scale-95"
            title={lang === 'ar' ? 'تعديل وتحديد حدود الأرض' : 'Define Farm Boundary'}
          >
            <span className="lg:text-base">✏️</span>
            <span>{lang === 'ar' ? 'تحديد حدود الحقل' : 'Set Field Bounds'}</span>
          </button>
        ) : (
          /* Active Editing Status Pill */
          <div className="pointer-events-auto flex items-center gap-2 bg-[#FAF7F2]/95 backdrop-blur-md px-3.5 lg:px-5 py-1.5 lg:py-2 rounded-2xl border border-[#2F6E3E]/40 shadow-lg text-xs lg:text-sm font-bold text-[#243023]">
            <span className="w-2 h-2 rounded-full bg-[#2F6E3E] animate-ping shrink-0" />
            <span>{lang === 'ar' ? 'اسحب زوايا المربع لتطابق أرضك' : 'Drag corners to match field'}</span>
            <span className="font-mono text-[#2F6E3E] bg-[#2F6E3E]/10 px-2 py-0.5 rounded-lg">
              ~{liveFeddans} {lang === 'ar' ? 'فدان' : 'fed'}
            </span>
          </div>
        )}

        {/* Right Tools: Recenter & GPS */}
        <div className="pointer-events-auto flex items-center gap-1.5 lg:gap-2">
          <button
            onClick={handleRecenter}
            className="w-9 h-9 lg:w-11 lg:h-11 flex items-center justify-center bg-[#FAF7F2]/95 backdrop-blur-md hover:bg-white text-[#243023] rounded-2xl shadow-md border border-[#384536]/15 text-sm lg:text-base transition-all active:scale-95"
            title={lang === 'ar' ? 'إعادة التمركز' : 'Recenter'}
          >
            🎯
          </button>

          <button
            onClick={handleGps}
            disabled={isLocating}
            className="h-9 lg:h-11 px-3 lg:px-4 flex items-center gap-1.5 bg-[#FAF7F2]/95 backdrop-blur-md hover:bg-white text-[#243023] rounded-2xl shadow-md border border-[#384536]/15 text-xs lg:text-sm font-bold transition-all active:scale-95"
            title={lang === 'ar' ? 'موقعي بالـ GPS' : 'GPS Location'}
          >
            <span className={`w-2 h-2 rounded-full ${isLocating ? 'bg-[#B87314] animate-ping' : 'bg-[#2F6E3E]'}`} />
            <span className="hidden sm:inline">{lang === 'ar' ? 'موقعي' : 'GPS'}</span>
          </button>
        </div>
      </div>

      {/* Editing Action Bar (Visible ONLY when editing boundaries) */}
      {isEditingBounds && (
        <div className="absolute top-14 inset-x-3.5 z-[1000] flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#FAF7F2]/95 backdrop-blur-md border border-[#2F6E3E]/30 shadow-xl animate-fadeIn text-xs">
          <div className="text-[#576855] font-semibold text-[11px]">
            💡 {lang === 'ar' ? 'اسحب الدوائر للحدود، أو انقر بالخريطة لإضافة تعرجات جديدة' : 'Drag circles to borders, or click map to add curve points'}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAlignSquare}
              className="px-2.5 py-1 rounded-xl bg-[#EDE6D9] hover:bg-[#E3D9C9] text-[#384536] font-bold transition-all active:scale-95 flex items-center gap-1"
              title={lang === 'ar' ? 'محاذاة زوايا المربع' : 'Align rectangle'}
            >
              <span>📐</span>
              <span>{lang === 'ar' ? 'ضبط المربع' : 'Align Square'}</span>
            </button>

            <button
              onClick={handleSaveBoundary}
              className="px-3.5 py-1 rounded-xl bg-[#2F6E3E] hover:bg-[#255831] text-white font-bold transition-all active:scale-95 shadow-sm flex items-center gap-1"
            >
              <span>✓</span>
              <span>{lang === 'ar' ? 'حفظ الحدود' : 'Save Bounds'}</span>
            </button>

            <button
              onClick={handleCancelBoundary}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-red-50 text-[#A8382B] border border-[#A8382B]/20 font-bold transition-all active:scale-95"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Location Pill & Zoom */}
      <div className="absolute bottom-3.5 inset-x-3.5 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        <div className="pointer-events-auto bg-[#FAF7F2]/95 backdrop-blur-md px-3.5 lg:px-5 py-1.5 lg:py-2.5 rounded-2xl text-xs lg:text-sm text-[#243023] flex items-center gap-2 lg:gap-3 border border-[#384536]/15 shadow-md font-bold max-w-[70%]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2F6E3E] shrink-0" />
          <span className="truncate">{fieldName}</span>
          <span className="text-[#576855]/30 hidden sm:inline">|</span>
          <span className="font-mono text-[#576855] text-[11px] lg:text-xs hidden sm:inline shrink-0">
            {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
          </span>
        </div>

        {/* Clean Zoom Buttons */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#FAF7F2]/95 backdrop-blur-md p-1 lg:p-1.5 rounded-2xl border border-[#384536]/15 shadow-md">
          <button
            onClick={() => handleZoom(1)}
            className="w-7 h-7 lg:w-9 lg:h-9 flex items-center justify-center hover:bg-[#EDE6D9] text-[#243023] rounded-xl text-base lg:text-lg font-bold active:scale-90 transition-all"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(-1)}
            className="w-7 h-7 lg:w-9 lg:h-9 flex items-center justify-center hover:bg-[#EDE6D9] text-[#243023] rounded-xl text-base lg:text-lg font-bold active:scale-90 transition-all"
            title="Zoom Out"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}
