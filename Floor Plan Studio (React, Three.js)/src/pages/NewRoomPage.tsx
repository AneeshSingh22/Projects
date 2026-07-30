import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DimensionForm } from '../components/rooms/DimensionForm';
import { ImageUploader } from '../components/rooms/ImageUploader';
import { FloorPlanTracer } from '../components/floorplan/FloorPlanTracer';
import { dedupeWalls, resolveDoorsToWalls, type RawDoor, type RawFixture, type RawTracedSpace } from '../lib/floorPlan';
import { extractStyleFromPhotos } from '../lib/floorPlanAi';
import { useRoomsStore } from '../store/useRoomsStore';
import type { RoomDimensions, Unit } from '../types';

type Flow = 'quick' | 'trace';
type QuickStep = 'name' | 'dimensions' | 'photos';
type TraceStep = 'name' | 'floorplan' | 'trace' | 'ceiling' | 'photos';

const QUICK_STEPS: { key: QuickStep; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'photos', label: 'Photos' },
];

const TRACE_STEPS: { key: TraceStep; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'floorplan', label: 'Floor Plan' },
  { key: 'trace', label: 'Trace Rooms' },
  { key: 'ceiling', label: 'Ceiling Height' },
  { key: 'photos', label: 'Photos' },
];

export function NewRoomPage() {
  const navigate = useNavigate();
  const createRoom = useRoomsStore((s) => s.createRoom);

  const [flow, setFlow] = useState<Flow | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('ft');
  const [dimensions, setDimensions] = useState<RoomDimensions>({ width: 12, length: 10, height: 9 });
  const [floorPlanFile, setFloorPlanFile] = useState<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [tracedSpaces, setTracedSpaces] = useState<RawTracedSpace[]>([]);
  const [tracedDoors, setTracedDoors] = useState<RawDoor[]>([]);
  const [tracedWindows, setTracedWindows] = useState<RawDoor[]>([]);
  const [tracedFixtures, setTracedFixtures] = useState<RawFixture[]>([]);
  const [ceilingHeightIn, setCeilingHeightIn] = useState(96);
  const [saving, setSaving] = useState(false);
  const [savingStage, setSavingStage] = useState<string | null>(null);

  const steps = flow === 'trace' ? TRACE_STEPS : QUICK_STEPS;
  const currentStep = steps[stepIndex]?.key;

  const canProceed =
    currentStep === 'name'
      ? name.trim().length > 0
      : currentStep === 'floorplan'
        ? floorPlanFile.length > 0
        : currentStep === 'trace'
          ? tracedSpaces.length > 0
          : true;

  async function handleFinish() {
    setSaving(true);

    // Extract the apartment's real finishes from the uploaded photos (non-fatal if the AI
    // server isn't running — the room just keeps the default styling).
    let styleProfile;
    if (photoFiles.length > 0) {
      setSavingStage('Matching 3D style to your photos (up to a minute)…');
      try {
        styleProfile = await extractStyleFromPhotos(photoFiles);
      } catch {
        styleProfile = undefined;
      }
    }

    setSavingStage('Saving room…');
    const walls = flow === 'trace' ? dedupeWalls(tracedSpaces, undefined, tracedDoors) : [];
    const id =
      flow === 'trace'
        ? await createRoom({
            name: name.trim(),
            unit: 'ft',
            layout: { spaces: tracedSpaces, walls },
            ceilingHeightIn,
            floorPlanFile: floorPlanFile[0],
            photoFiles,
            // Wide openings dissolved their wall entirely (see dedupeWalls), so only narrow
            // openings still need a doorway item cut into a remaining wall.
            doors: resolveDoorsToWalls(
              tracedDoors.filter((d) => d.widthIn < 72),
              walls,
            ),
            windows: resolveDoorsToWalls(tracedWindows, walls),
            fixtures: tracedFixtures,
            styleProfile,
          })
        : await createRoom({
            name: name.trim(),
            unit,
            dimensions,
            floorPlanFile: floorPlanFile[0],
            photoFiles,
            styleProfile,
          });
    navigate(`/rooms/${id}`);
  }

  if (!flow) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-2xl font-semibold text-neutral-100">New Room</h1>
          <p className="mb-8 text-neutral-400">How would you like to set this space up?</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFlow('quick')}
              className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-left transition hover:border-indigo-500"
            >
              <div className="mb-2 text-2xl">📐</div>
              <h3 className="mb-1 font-medium text-neutral-100">Quick rectangular room</h3>
              <p className="text-sm text-neutral-400">
                Just type width, length, and ceiling height. Fastest way to get started with one room.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setFlow('trace')}
              className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-left transition hover:border-indigo-500"
            >
              <div className="mb-2 text-2xl">🗺️</div>
              <h3 className="mb-1 font-medium text-neutral-100">Trace from floor plan</h3>
              <p className="text-sm text-neutral-400">
                Upload a floor plan image and trace each room's outline on top of it, using the printed
                dimensions. Builds a connected, walkable, multi-room apartment.
              </p>
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const isTracerStep = currentStep === 'trace';

  return (
    <AppShell>
      <div className={isTracerStep ? 'mx-auto max-w-5xl' : 'mx-auto max-w-xl'}>
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i <= stepIndex ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-500'
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm ${i <= stepIndex ? 'text-neutral-200' : 'text-neutral-500'}`}>{s.label}</span>
              {i < steps.length - 1 && <div className="mx-2 h-px w-8 bg-neutral-800" />}
            </div>
          ))}
        </div>

        <div className={isTracerStep ? '' : 'rounded-xl border border-neutral-800 bg-neutral-900/50 p-6'}>
          {currentStep === 'name' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-300">Room name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={flow === 'trace' ? 'e.g. My Apartment' : 'e.g. Living Room'}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-neutral-100 outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {currentStep === 'dimensions' && (
            <DimensionForm unit={unit} dimensions={dimensions} onUnitChange={setUnit} onDimensionsChange={setDimensions} />
          )}

          {currentStep === 'floorplan' && (
            <ImageUploader
              label="Floor plan image"
              hint="A clear photo or scan of your floor plan with dimensions printed on it."
              files={floorPlanFile}
              onChange={setFloorPlanFile}
            />
          )}

          {currentStep === 'trace' && floorPlanFile[0] && (
            <FloorPlanTracer
              imageFile={floorPlanFile[0]}
              onComplete={(spaces, doors, windows, fixtures) => {
                setTracedSpaces(spaces);
                setTracedDoors(doors);
                setTracedWindows(windows);
                setTracedFixtures(fixtures);
                setStepIndex((i) => i + 1);
              }}
              onCancel={() => setStepIndex((i) => i - 1)}
            />
          )}

          {currentStep === 'ceiling' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-300">Ceiling height (inches)</label>
              <input
                type="number"
                min={60}
                step={1}
                value={ceilingHeightIn}
                onChange={(e) => setCeilingHeightIn(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-neutral-100 outline-none focus:border-indigo-500"
              />
              <p className="mt-2 text-xs text-neutral-500">Applies to the whole apartment. Standard is 96" (8 ft).</p>
            </div>
          )}

          {currentStep === 'photos' && (
            <div className="space-y-6">
              {flow === 'quick' && (
                <ImageUploader
                  label="Floor plan (optional)"
                  hint="Used as a visual reference alongside the 3D view — not required."
                  files={floorPlanFile}
                  onChange={setFloorPlanFile}
                />
              )}
              <ImageUploader
                label="Room photos (optional)"
                hint="Real photos of the room, shown side-by-side while you decorate."
                multiple
                files={photoFiles}
                onChange={setPhotoFiles}
              />
            </div>
          )}
        </div>

        {!isTracerStep && (
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => (stepIndex === 0 ? setFlow(null) : setStepIndex((s) => s - 1))}
              className="rounded-lg px-4 py-2.5 text-neutral-400 hover:text-neutral-200"
            >
              Back
            </button>
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                disabled={!canProceed}
                onClick={() => setStepIndex((s) => s + 1)}
                className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium text-white disabled:opacity-40 hover:bg-indigo-400"
              >
                Next
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {saving && savingStage && <span className="text-sm text-neutral-400">{savingStage}</span>}
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium text-white disabled:opacity-40 hover:bg-indigo-400"
                >
                  {saving ? 'Creating…' : 'Create Room'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
