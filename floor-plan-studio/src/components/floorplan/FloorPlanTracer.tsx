import { useEffect, useRef, useState } from 'react';
import type { Point2D } from '../../types';
import { pixelPolygonToInches, type RawDoor, type RawFixture, type RawTracedSpace } from '../../lib/floorPlan';
import { detectRoomPolygons, type DetectedRoom } from '../../lib/floorPlanVision';
import { associateTextToRooms, runOcr, type RoomTextMatch } from '../../lib/floorPlanOcr';
import { analyzeFloorPlanWithAi } from '../../lib/floorPlanAi';
import { formatInches } from '../../lib/units';
import { hasApiKey } from '../../lib/apiKey';

const SNAP_RADIUS_CANVAS_PX = 12;
const MAX_CANVAS_WIDTH = 780;
const MAX_CANVAS_HEIGHT = 640;

type Mode = 'choose' | 'analyzing' | 'calibrate' | 'trace' | 'idle';

interface EdgeOverride {
  lengthIn: number;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** A detected room's pixel bounding box vs its OCR'd real dimensions gives a scale estimate on
 * each axis; since we don't know which printed number is width vs depth, try both pairings and
 * keep whichever is more internally consistent (a correct pairing yields near-equal x/y scale). */
function estimateScaleForRoom(room: DetectedRoom, dims: { widthIn: number; depthIn: number }): number {
  const pxW = room.bboxPx.maxX - room.bboxPx.minX;
  const pxH = room.bboxPx.maxY - room.bboxPx.minY;
  const optA = { rx: pxW / dims.widthIn, ry: pxH / dims.depthIn };
  const optB = { rx: pxW / dims.depthIn, ry: pxH / dims.widthIn };
  const diffA = Math.abs(optA.rx - optA.ry);
  const diffB = Math.abs(optB.rx - optB.ry);
  const best = diffA <= diffB ? optA : optB;
  return (best.rx + best.ry) / 2;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function FloorPlanTracer({
  imageFile,
  onComplete,
  onCancel,
}: {
  imageFile: File;
  onComplete: (spaces: RawTracedSpace[], doors: RawDoor[], windows: RawDoor[], fixtures: RawFixture[]) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displayScale, setDisplayScale] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: MAX_CANVAS_WIDTH, height: MAX_CANVAS_HEIGHT });

  const [mode, setMode] = useState<Mode>('choose');
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeStage, setAnalyzeStage] = useState('Detecting room shapes…');
  const [detectedRooms, setDetectedRooms] = useState<DetectedRoom[]>([]);
  const [detectedMatches, setDetectedMatches] = useState<RoomTextMatch[]>([]);
  const [autoDetectFailed, setAutoDetectFailed] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analyzeElapsedSec, setAnalyzeElapsedSec] = useState(0);
  const keyPresent = hasApiKey();
  /** Openings in image-pixel space; converted to inches on submit using the final scale. */
  const [detectedDoorsPx, setDetectedDoorsPx] = useState<{ x: number; y: number; widthIn: number }[]>([]);
  const [detectedWindowsPx, setDetectedWindowsPx] = useState<{ x: number; y: number; widthIn: number }[]>([]);
  const [detectedFixturesPx, setDetectedFixturesPx] = useState<
    { type: string; x: number; y: number; widthIn: number; depthIn: number; facing: RawFixture['facing'] }[]
  >([]);

  const [calibrationClicksImg, setCalibrationClicksImg] = useState<{ x: number; y: number }[]>([]);
  const [calibrationLengthInput, setCalibrationLengthInput] = useState('');
  const [pxPerInch, setPxPerInch] = useState<number | null>(null);

  const [tracedSpaces, setTracedSpaces] = useState<RawTracedSpace[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [currentPolygon, setCurrentPolygon] = useState<Point2D[]>([]);
  const [hoverPointImg, setHoverPointImg] = useState<{ x: number; y: number } | null>(null);
  const [closingRoom, setClosingRoom] = useState<{ polygon: Point2D[]; name: string; edgeOverrides: EdgeOverride[] } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const scale = Math.min(MAX_CANVAS_WIDTH / img.naturalWidth, MAX_CANVAS_HEIGHT / img.naturalHeight, 1);
      setDisplayScale(scale);
      setCanvasSize({ width: Math.round(img.naturalWidth * scale), height: Math.round(img.naturalHeight * scale) });
      setImageLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);

  /** Shared by both detection paths: given detected room polygons and whatever name/dimension
   * text was associated with each, auto-calibrates a pixels-per-inch scale (median across every
   * room with both a polygon and a readable dimension) and populates the traced-spaces review
   * screen, or falls back to manual 2-click calibration if no room's dimensions could be read. */
  function finalizeDetection(rooms: DetectedRoom[], matches: RoomTextMatch[]) {
    setDetectedRooms(rooms);
    setDetectedMatches(matches);

    const estimates: number[] = [];
    rooms.forEach((room, i) => {
      const m = matches[i];
      if (m.widthIn && m.depthIn) estimates.push(estimateScaleForRoom(room, { widthIn: m.widthIn, depthIn: m.depthIn }));
    });

    if (estimates.length > 0) {
      const scale = median(estimates);
      setPxPerInch(scale);
      setTracedSpaces(
        rooms.map((room, i) => ({
          id: `space-auto-${i}`,
          name: matches[i]?.name?.trim() || `Room ${i + 1}`,
          polygon: pixelPolygonToInches(room.polygonPx, scale),
        })),
      );
      setMode('idle');
    } else {
      setAutoDetectFailed(true);
      setMode('calibrate');
    }
  }

  async function runAutoDetect(img: HTMLImageElement) {
    setMode('analyzing');
    setAiError(null);
    setAnalyzeStage('Detecting room shapes…');
    setAnalyzeProgress(0);
    const rooms = detectRoomPolygons(img);

    let ocrBlocks: Awaited<ReturnType<typeof runOcr>> = [];
    try {
      setAnalyzeStage('Reading dimensions and labels…');
      ocrBlocks = await runOcr(img, (f) => setAnalyzeProgress(f));
    } catch {
      ocrBlocks = [];
    }

    const matches = associateTextToRooms(ocrBlocks, rooms);
    finalizeDetection(rooms, matches);
  }

  async function runAiDetect(img: HTMLImageElement, file: File) {
    setMode('analyzing');
    setAiError(null);
    setAnalyzeStage('Asking Claude to read the floor plan…');
    setAnalyzeProgress(0.35);
    try {
      const { rooms: results, doors, windows, fixtures } = await analyzeFloorPlanWithAi(file, img);
      setAnalyzeProgress(0.9);
      if (results.length === 0) throw new Error('Claude did not detect any rooms in this image.');
      setDetectedDoorsPx(doors.map((d) => ({ x: d.centerPx.x, y: d.centerPx.y, widthIn: d.widthIn })));
      setDetectedWindowsPx(windows.map((d) => ({ x: d.centerPx.x, y: d.centerPx.y, widthIn: d.widthIn })));
      setDetectedFixturesPx(
        fixtures.map((f) => ({ type: f.type, x: f.centerPx.x, y: f.centerPx.y, widthIn: f.widthIn, depthIn: f.depthIn, facing: f.facing })),
      );
      const rooms: DetectedRoom[] = results.map((r) => ({
        polygonPx: r.polygonPx,
        bboxPx: r.bboxPx,
        areaPx: (r.bboxPx.maxX - r.bboxPx.minX) * (r.bboxPx.maxY - r.bboxPx.minY),
      }));
      const matches: RoomTextMatch[] = results.map((r) => ({
        name: r.name,
        widthIn: r.widthIn > 0 ? r.widthIn : undefined,
        depthIn: r.depthIn > 0 ? r.depthIn : undefined,
      }));
      finalizeDetection(rooms, matches);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analysis failed.');
      setMode('choose');
    }
  }

  useEffect(() => {
    if (mode !== 'analyzing') {
      setAnalyzeElapsedSec(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => setAnalyzeElapsedSec(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  function skipToManualTrace() {
    setAiError(null);
    setAutoDetectFailed(false);
    setMode('calibrate');
  }

  function canvasEventToImagePoint(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    return { x: canvasX / displayScale, y: canvasY / displayScale };
  }

  function snapToExistingVertex(ptIn: Point2D): Point2D {
    const radiusIn = SNAP_RADIUS_CANVAS_PX / displayScale / (pxPerInch ?? 1);
    let best: Point2D = ptIn;
    let bestDist = radiusIn;
    for (const space of tracedSpaces) {
      for (const v of space.polygon) {
        const d = Math.hypot(v.x - ptIn.x, v.z - ptIn.z);
        if (d < bestDist) {
          bestDist = d;
          best = v;
        }
      }
    }
    return best;
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const imgPt = canvasEventToImagePoint(e);

    if (mode === 'calibrate') {
      if (calibrationClicksImg.length >= 2) return;
      const next = [...calibrationClicksImg, imgPt];
      setCalibrationClicksImg(next);
      return;
    }

    if (mode === 'trace' && pxPerInch) {
      const clickIn: Point2D = { x: imgPt.x / pxPerInch, z: imgPt.y / pxPerInch };

      if (currentPolygon.length >= 3) {
        const first = currentPolygon[0];
        const distToFirstPx = Math.hypot(first.x - clickIn.x, first.z - clickIn.z) * pxPerInch * displayScale;
        if (distToFirstPx < SNAP_RADIUS_CANVAS_PX) {
          finishPolygon(currentPolygon);
          return;
        }
      }

      const snapped = snapToExistingVertex(clickIn);
      setCurrentPolygon((prev) => [...prev, snapped]);
    }
  }

  function finishPolygon(polygon: Point2D[]) {
    setClosingRoom({
      polygon,
      name: '',
      edgeOverrides: polygon.map((p, i) => {
        const next = polygon[(i + 1) % polygon.length];
        return { lengthIn: Math.hypot(next.x - p.x, next.z - p.z) };
      }),
    });
    setCurrentPolygon([]);
  }

  function applyEdgeOverridesToPolygon(polygon: Point2D[], overrides: EdgeOverride[]): Point2D[] {
    // Walk the polygon rebuilding each vertex from the previous one using the (possibly edited)
    // edge length, preserving each edge's original direction.
    const result: Point2D[] = [polygon[0]];
    for (let i = 0; i < polygon.length - 1; i++) {
      const from = result[i];
      const originalFrom = polygon[i];
      const originalTo = polygon[i + 1];
      const dx = originalTo.x - originalFrom.x;
      const dz = originalTo.z - originalFrom.z;
      const len = Math.hypot(dx, dz) || 1;
      const targetLen = overrides[i].lengthIn;
      result.push({ x: from.x + (dx / len) * targetLen, z: from.z + (dz / len) * targetLen });
    }
    return result;
  }

  function confirmRoom() {
    if (!closingRoom || !closingRoom.name.trim()) return;
    const adjusted = applyEdgeOverridesToPolygon(closingRoom.polygon, closingRoom.edgeOverrides);
    setTracedSpaces((prev) => [...prev, { id: `space-${prev.length}-${Date.now()}`, name: closingRoom.name.trim(), polygon: adjusted }]);
    setClosingRoom(null);
    setMode('idle');
  }

  function cancelClosingRoom() {
    setClosingRoom(null);
    setMode('trace');
  }

  function undoLastPoint() {
    setCurrentPolygon((prev) => prev.slice(0, -1));
  }

  function confirmCalibration() {
    const lengthIn = Number(calibrationLengthInput);
    if (!lengthIn || calibrationClicksImg.length < 2) return;
    const pxDist = dist(calibrationClicksImg[0], calibrationClicksImg[1]);
    const scale = pxDist / lengthIn;
    setPxPerInch(scale);
    if (detectedRooms.length > 0 && tracedSpaces.length === 0) {
      setTracedSpaces(
        detectedRooms.map((room, i) => ({
          id: `space-auto-${i}`,
          name: detectedMatches[i]?.name?.trim() || `Room ${i + 1}`,
          polygon: pixelPolygonToInches(room.polygonPx, scale),
        })),
      );
    }
    setMode('idle');
  }

  function recalibrate() {
    setPxPerInch(null);
    setCalibrationClicksImg([]);
    setCalibrationLengthInput('');
    setMode('calibrate');
  }

  function startRename(space: RawTracedSpace) {
    setRenamingId(space.id);
    setRenameValue(space.name);
  }

  function commitRename() {
    if (renamingId) {
      setTracedSpaces((prev) => prev.map((s) => (s.id === renamingId ? { ...s, name: renameValue.trim() || s.name } : s)));
    }
    setRenamingId(null);
  }

  // ---- drawing ----
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);

    const toCanvas = (p: { x: number; y: number }) => ({ x: p.x * displayScale, y: p.y * displayScale });
    const inchesToCanvas = (p: Point2D) => {
      if (!pxPerInch) return { x: 0, y: 0 };
      return toCanvas({ x: p.x * pxPerInch, y: p.z * pxPerInch });
    };

    // calibration markers
    if (mode === 'calibrate') {
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      calibrationClicksImg.forEach((p) => {
        const c = toCanvas(p);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      if (calibrationClicksImg.length === 2) {
        const a = toCanvas(calibrationClicksImg[0]);
        const b = toCanvas(calibrationClicksImg[1]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // finished rooms
    const palette = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];
    tracedSpaces.forEach((space, idx) => {
      const color = palette[idx % palette.length];
      ctx.beginPath();
      space.polygon.forEach((p, i) => {
        const c = inchesToCanvas(p);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      ctx.fillStyle = color + '33';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      const cx = space.polygon.reduce((s, p) => s + p.x, 0) / space.polygon.length;
      const cz = space.polygon.reduce((s, p) => s + p.z, 0) / space.polygon.length;
      const c = inchesToCanvas({ x: cx, z: cz });
      ctx.fillStyle = color;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(space.name, c.x, c.y);
    });

    // in-progress polygon
    if (currentPolygon.length > 0 && pxPerInch) {
      ctx.strokeStyle = '#f97316';
      ctx.fillStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      currentPolygon.forEach((p, i) => {
        const c = inchesToCanvas(p);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      if (hoverPointImg) {
        const hc = toCanvas(hoverPointImg);
        ctx.lineTo(hc.x, hc.y);
      }
      ctx.stroke();
      currentPolygon.forEach((p) => {
        const c = inchesToCanvas(p);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      // highlight closable start point
      if (currentPolygon.length >= 3) {
        const c = inchesToCanvas(currentPolygon[0]);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [imageLoaded, canvasSize, displayScale, mode, calibrationClicksImg, tracedSpaces, currentPolygon, hoverPointImg, pxPerInch]);

  const canConfirmCalibration = calibrationClicksImg.length === 2 && Number(calibrationLengthInput) > 0;

  return (
    <div className="flex gap-4">
      <div className="shrink-0 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        {imageLoaded ? (
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="cursor-crosshair"
            onClick={handleCanvasClick}
            onMouseMove={(e) => setHoverPointImg(canvasEventToImagePoint(e))}
            onMouseLeave={() => setHoverPointImg(null)}
          />
        ) : (
          <div style={{ width: MAX_CANVAS_WIDTH, height: 300 }} className="grid place-items-center text-neutral-500">
            Loading image…
          </div>
        )}
      </div>

      <div className="w-72 shrink-0 space-y-4">
        {mode === 'choose' && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <h4 className="mb-1 text-sm font-medium text-neutral-100">How should we read this plan?</h4>
            <p className="mb-3 text-xs text-neutral-500">
              Whichever you pick, you can fix anything by hand afterwards.
            </p>
            {aiError && (
              <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/40 p-2.5 text-xs text-red-300">
                {aiError}
              </div>
            )}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => imageRef.current && runAiDetect(imageRef.current, imageFile)}
                className="w-full rounded-lg bg-indigo-500 px-3 py-2.5 text-left text-sm font-medium text-white"
              >
                <span className="flex items-center gap-1.5">
                  ✨ Analyze with AI
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
                    Recommended
                  </span>
                </span>
                <span className="mt-0.5 block text-xs font-normal text-indigo-100/80">
                  Reads room shapes, dimensions, doors, windows and built-in fixtures — kitchen
                  counters, appliances, toilets, showers. Not 100% accurate; mistakes are fixable by
                  hand. {keyPresent ? 'Costs ~25¢, billed to you by Anthropic.' : 'Needs your own API key.'}
                </span>
              </button>
              {!keyPresent && (
                <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-2.5 py-2 text-xs leading-snug text-amber-300/90">
                  No API key set — AI analysis will fail. Add one from the dashboard, or just trace
                  the plan yourself below. Manual tracing is free and works offline.
                </p>
              )}
              <button
                type="button"
                onClick={skipToManualTrace}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-left text-sm text-neutral-200 hover:border-emerald-600"
              >
                <span className="flex items-center gap-1.5">
                  ✏️ Trace it myself
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-300">
                    Free
                  </span>
                </span>
                <span className="mt-0.5 block text-xs font-normal text-neutral-500">
                  Most accurate. Click each room's corners and type its printed dimensions. Takes a
                  few minutes, and captures rooms, walls and doors only — no kitchen or bathroom
                  fixtures.
                </span>
              </button>
              <button
                type="button"
                onClick={() => imageRef.current && runAutoDetect(imageRef.current)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-left text-sm text-neutral-200 hover:border-amber-600"
              >
                <span className="flex items-center gap-1.5">
                  🧪 Computer vision scan
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-300">
                    Experimental
                  </span>
                </span>
                <span className="mt-0.5 block text-xs font-normal text-neutral-500">
                  Offline, no key, no cost — but it finds room outlines only, misses rooms on busy
                  plans, and its edges come out rough. A starting outline to clean up, not a finished
                  layout.
                </span>
              </button>
            </div>
          </div>
        )}

        {mode === 'analyzing' && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="mb-1 flex items-center justify-between">
              <h4 className="text-sm font-medium text-neutral-100">Analyzing floor plan…</h4>
              <span className="font-mono text-xs text-neutral-500">{analyzeElapsedSec}s</span>
            </div>
            <p className="mb-3 text-xs text-neutral-500">{analyzeStage}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
              {analyzeStage.startsWith('Asking Claude') ? (
                <div className="h-full w-full animate-pulse rounded-full bg-indigo-500" />
              ) : (
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${Math.round(analyzeProgress * 100)}%` }}
                />
              )}
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              {analyzeStage.startsWith('Asking Claude')
                ? 'Claude is reading room shapes, dimensions, and how rooms connect — this typically takes 1-2 minutes for a detailed plan. Feel free to wait; there is no need to refresh.'
                : 'Detecting room shapes and reading the printed dimensions and labels automatically — this runs entirely in your browser.'}
            </p>
          </div>
        )}

        {mode === 'calibrate' && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <h4 className="mb-1 text-sm font-medium text-neutral-100">Calibrate scale</h4>
            <p className="mb-3 text-xs text-neutral-500">
              {autoDetectFailed
                ? "Couldn't read a dimension automatically from this image — click both ends of a wall whose length is printed on the plan, then enter that length."
                : "Click both ends of a wall whose length is printed on the plan, then enter that length."}
            </p>
            <p className="mb-2 text-xs text-neutral-400">Points placed: {calibrationClicksImg.length} / 2</p>
            {calibrationClicksImg.length === 2 && (
              <div className="space-y-2">
                <label className="block text-xs text-neutral-400">Real length (inches)</label>
                <input
                  type="number"
                  value={calibrationLengthInput}
                  onChange={(e) => setCalibrationLengthInput(e.target.value)}
                  placeholder='e.g. 173 for 14ft 5in'
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canConfirmCalibration}
                    onClick={confirmCalibration}
                    className="flex-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalibrationClicksImg([])}
                    className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300"
                  >
                    Redo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode !== 'calibrate' && mode !== 'analyzing' && pxPerInch && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium text-neutral-100">Rooms</h4>
              <button type="button" onClick={recalibrate} className="text-xs text-neutral-500 underline hover:text-neutral-300">
                Recalibrate
              </button>
            </div>

            {mode === 'idle' && (
              <button
                type="button"
                onClick={() => setMode('trace')}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:border-indigo-500"
              >
                + Trace a room
              </button>
            )}

            {mode === 'trace' && !closingRoom && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-500">
                  Click each corner of the room in order. Click the first point again (or use Close Shape) once
                  you've placed at least 3 corners.
                </p>
                <p className="text-xs text-neutral-400">Points: {currentPolygon.length}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPolygon.length < 3}
                    onClick={() => finishPolygon(currentPolygon)}
                    className="flex-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Close Shape
                  </button>
                  <button
                    type="button"
                    disabled={currentPolygon.length === 0}
                    onClick={undoLastPoint}
                    className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 disabled:opacity-40"
                  >
                    Undo
                  </button>
                </div>
              </div>
            )}

            {tracedSpaces.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-neutral-800 pt-3">
                {tracedSpaces.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm text-neutral-300">
                    {renamingId === s.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                        className="w-full rounded-md border border-indigo-500 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRename(s)}
                        className="truncate text-left hover:text-indigo-300"
                        title="Click to rename"
                      >
                        {s.name}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTracedSpaces((prev) => prev.filter((sp) => sp.id !== s.id))}
                      className="shrink-0 text-xs text-neutral-500 hover:text-red-400"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {closingRoom && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <h4 className="mb-2 text-sm font-medium text-neutral-100">Name this room</h4>
            <input
              autoFocus
              value={closingRoom.name}
              onChange={(e) => setClosingRoom({ ...closingRoom, name: e.target.value })}
              placeholder="e.g. Living Room"
              className="mb-3 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
            />
            <p className="mb-2 text-xs text-neutral-500">
              Edge lengths (edit to match what's printed on the plan). The last edge closes the
              shape automatically from the others, so it isn't independently editable.
            </p>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {closingRoom.edgeOverrides.map((edge, i) => {
                const isClosingEdge = i === closingRoom.edgeOverrides.length - 1;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-neutral-500">
                      {isClosingEdge ? 'closing' : `#${i + 1}`}
                    </span>
                    <input
                      type="number"
                      step={0.5}
                      disabled={isClosingEdge}
                      value={Math.round(edge.lengthIn * 10) / 10}
                      onChange={(e) => {
                        const next = [...closingRoom.edgeOverrides];
                        next[i] = { lengthIn: Number(e.target.value) };
                        setClosingRoom({ ...closingRoom, edgeOverrides: next });
                      }}
                      className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-indigo-500 disabled:opacity-50"
                    />
                    <span className="w-14 shrink-0 text-right text-xs text-neutral-500">
                      {formatInches(edge.lengthIn)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={!closingRoom.name.trim()}
                onClick={confirmRoom}
                className="flex-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Add Room
              </button>
              <button
                type="button"
                onClick={cancelClosingRoom}
                className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={tracedSpaces.length === 0}
            onClick={() => {
              const toInches = (list: { x: number; y: number; widthIn: number }[]) =>
                pxPerInch
                  ? list.map((d) => ({ center: { x: d.x / pxPerInch, z: d.y / pxPerInch }, widthIn: d.widthIn }))
                  : [];
              const fixturesIn: RawFixture[] = pxPerInch
                ? detectedFixturesPx.map((f) => ({
                    type: f.type,
                    center: { x: f.x / pxPerInch, z: f.y / pxPerInch },
                    widthIn: f.widthIn,
                    depthIn: f.depthIn,
                    facing: f.facing,
                  }))
                : [];
              onComplete(tracedSpaces, toInches(detectedDoorsPx), toInches(detectedWindowsPx), fixturesIn);
            }}
            className="flex-1 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Done tracing ({tracedSpaces.length} room{tracedSpaces.length === 1 ? '' : 's'})
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-800 px-4 py-2.5 text-sm text-neutral-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
