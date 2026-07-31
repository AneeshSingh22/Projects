import { Link } from 'react-router-dom';
import type { TransformMode } from './Scene3D';

export function Toolbar({
  roomName,
  cameraMode,
  onCameraModeChange,
  transformMode,
  onTransformModeChange,
  gridSnap,
  onToggleGridSnap,
  wallsVisible,
  onToggleWalls,
  showReference,
  onToggleReference,
  cameraLocked,
  onToggleCameraLock,
  onSnapToTop,
  onScreenshot,
  onResetLayout,
  hasSelection,
  measureMode,
  onToggleMeasure,
  removeWallMode,
  onToggleRemoveWall,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDeleteSelected,
  selectedName,
}: {
  roomName: string;
  cameraMode: 'orbit' | 'walk';
  onCameraModeChange: (m: 'orbit' | 'walk') => void;
  transformMode: TransformMode;
  onTransformModeChange: (m: TransformMode) => void;
  gridSnap: boolean;
  onToggleGridSnap: () => void;
  wallsVisible: boolean;
  onToggleWalls: () => void;
  showReference: boolean;
  onToggleReference: () => void;
  cameraLocked: boolean;
  onToggleCameraLock: () => void;
  onSnapToTop: () => void;
  onScreenshot: () => void;
  onResetLayout: () => void;
  hasSelection: boolean;
  measureMode: boolean;
  onToggleMeasure: () => void;
  removeWallMode: boolean;
  onToggleRemoveWall: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  /** name of the selected item, shown on the delete button */
  selectedName?: string;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/" className="text-neutral-500 hover:text-neutral-300" aria-label="Back to dashboard">
          ←
        </Link>
        <h2 className="truncate font-medium text-neutral-100">{roomName}</h2>
      </div>

      <div className="flex items-center gap-2">
        {cameraMode === 'orbit' && (
          <div className="flex overflow-hidden rounded-lg border border-neutral-800">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              className="bg-neutral-900 px-2.5 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
            >
              ↶
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="border-l border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
            >
              ↷
            </button>
          </div>
        )}

        <SegButtons
          value={cameraMode}
          options={[
            { value: 'orbit', label: 'Orbit' },
            { value: 'walk', label: 'Walk' },
          ]}
          onChange={(v) => onCameraModeChange(v as 'orbit' | 'walk')}
        />

        {cameraMode === 'orbit' && hasSelection && (
          <SegButtons
            value={transformMode}
            options={[
              { value: 'translate', label: 'Move' },
              { value: 'rotate', label: 'Rotate' },
            ]}
            onChange={(v) => onTransformModeChange(v as TransformMode)}
          />
        )}

        {hasSelection && (
          <button
            type="button"
            onClick={onDeleteSelected}
            title={`Delete ${selectedName ?? 'item'} (Del)`}
            className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-sm text-red-300 hover:border-red-600 hover:bg-red-950/70"
          >
            🗑 Delete{selectedName ? ` ${selectedName}` : ''}
          </button>
        )}

        {cameraMode === 'orbit' && (
          <button
            type="button"
            onClick={onSnapToTop}
            className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600"
          >
            Top
          </button>
        )}
        {cameraMode === 'orbit' && (
          <ToolbarToggle active={cameraLocked} onClick={onToggleCameraLock} label="🔒 Lock View" />
        )}
        {cameraMode === 'orbit' && (
          <>
            <ToolbarToggle active={measureMode} onClick={onToggleMeasure} label="📏 Measure" />
            <ToolbarToggle
              active={removeWallMode}
              onClick={onToggleRemoveWall}
              label="🧱 Remove wall"
              title="Click a wall to delete it. Undo restores it."
              danger
            />
          </>
        )}
        <ToolbarToggle active={gridSnap} onClick={onToggleGridSnap} label="Snap" />
        <ToolbarToggle active={wallsVisible} onClick={onToggleWalls} label="Walls" />
        <ToolbarToggle active={showReference} onClick={onToggleReference} label="Reference" />

        <button
          type="button"
          onClick={onScreenshot}
          className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600"
        >
          Screenshot
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Remove all furniture from this room?')) onResetLayout();
          }}
          className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 hover:border-red-800 hover:text-red-400"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function SegButtons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-neutral-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm ${
            value === opt.value ? 'bg-indigo-500 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToolbarToggle({
  active,
  onClick,
  label,
  title,
  danger = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title?: string;
  /** destructive tool — highlights red rather than indigo when active */
  danger?: boolean;
}) {
  const activeClass = danger
    ? 'border-red-500 bg-red-500/10 text-red-300'
    : 'border-indigo-500 bg-indigo-500/10 text-indigo-300';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-lg border px-3 py-1.5 text-sm ${
        active ? activeClass : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
      }`}
    >
      {label}
    </button>
  );
}
