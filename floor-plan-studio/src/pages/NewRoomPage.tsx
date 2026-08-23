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
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-neutral-50">Create a space</h1>
          <p className="mb-10 text-neutral-400">
            Start from a floor plan image, or skip straight to a single room.
          </p>

          {/* --- Option 1: from a floor plan, with the three detection methods spelled out --- */}
          <button
            type="button"
            onClick={() => setFlow('trace')}
            className="group w-full rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-900/40 p-6 text-left shadow-lg shadow-black/20 transition hover:border-indigo-500/70 hover:shadow-indigo-500/5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-xl ring-1 ring-inset ring-indigo-500/20">
                🗺️
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-neutral-100">I have a floor plan image</h3>
                  <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-300">
                    Recommended
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  Upload it, then pick how to turn it into a walkable multi-room apartment. You'll
                  choose one of three methods on the next screen:
                </p>

                <div className="mt-4 space-y-2">
                  <MethodRow
                    icon="✏️"
                    title="Trace it yourself"
                    tag="Free"
                    tagClass="bg-emerald-500/15 text-emerald-300"
                    body="Most accurate — you click each room's corners and type the printed dimensions. Takes a few minutes, and it captures rooms, walls and doors only, not furniture like kitchen counters or bathroom fixtures."
                  />
                  <MethodRow
                    icon="✨"
                    title="Analyze with AI"
                    tag="API key"
                    tagClass="bg-indigo-500/15 text-indigo-300"
                    body="Fast and thorough — reads room shapes, dimensions, doors, windows and built-in fixtures (kitchen counters, appliances, toilets, showers). Not 100% accurate and can make mistakes, but anything wrong is fixable by hand afterwards. Needs your own Anthropic key, ~25¢ per plan."
                  />
                  <MethodRow
                    icon="🧪"
                    title="Computer vision scan"
                    tag="Experimental"
                    tagClass="bg-amber-500/15 text-amber-300"
                    body="Runs entirely offline in your browser, no key and no cost. Detects room outlines only — no furniture or fixtures — and on a real 2-bedroom plan it found 4 of 10 rooms with rough, jagged edges. Included to show honestly why the AI step earns its cost. Treat it as a rough starting outline to clean up by hand."
                  />
                </div>
              </div>
            </div>
          </button>

          {/* --- Option 2: no floor plan --- */}
          <button
            type="button"
            onClick={() => setFlow('quick')}
            className="group mt-4 w-full rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 text-left transition hover:border-neutral-600"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-800/70 text-xl ring-1 ring-inset ring-neutral-700">
                📐
              </div>
              <div>
                <h3 className="font-medium text-neutral-100">I don't have a floor plan</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  Type a width, length and ceiling height to get one rectangular room. The quickest
                  way to start experimenting with furniture.
                </p>
              </div>
            </div>
          </button>
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

/** One detection method in the "I have a floor plan" card, with its honest trade-off. */
function MethodRow({
  icon,
  title,
  tag,
  tagClass,
  body,
}: {
  icon: string;
  title: string;
  tag: string;
  tagClass: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-sm font-medium text-neutral-200">{title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tagClass}`}>
          {tag}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{body}</p>
    </div>
  );
}
