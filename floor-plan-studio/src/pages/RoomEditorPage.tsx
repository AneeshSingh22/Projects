import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Scene3D, type TransformMode } from '../components/editor/Scene3D';
import { FurnitureCatalogPanel } from '../components/editor/FurnitureCatalogPanel';
import { RoomSwitcher } from '../components/editor/RoomSwitcher';
import { SelectedItemPanel } from '../components/editor/SelectedItemPanel';
import { RoomStylePanel } from '../components/editor/RoomStylePanel';
import { ProductImport } from '../components/editor/ProductImport';
import { ReferencePhotoDrawer } from '../components/editor/ReferencePhotoDrawer';
import { Toolbar } from '../components/editor/Toolbar';
import { useRoomsStore } from '../store/useRoomsStore';
import { getCatalogItem } from '../data/furnitureCatalog';
import { roomCeilingHeightIn } from '../lib/floorPlan';
import { DEFAULT_STYLE } from '../lib/styleTextures';

/** Items on the walk-mode hotbar, so you can furnish without leaving first person. Bound to
 * number keys 1-9, because while the pointer is locked the cursor is captured by the browser
 * and HTML buttons cannot be clicked. Picking one spawns it directly into your hands. */
const WALK_QUICK_ADD = [
  'sofa-3seat',
  'armchair',
  'coffee-table',
  'dining-table',
  'bed-queen',
  'dresser',
  'tv-55',
  'painting',
  'plant',
];

export function RoomEditorPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const {
    currentRoom,
    currentLayout,
    placedItems,
    selectedItemId,
    activeSpaceId,
    cameraMode,
    gridSnap,
    showReferenceDrawer,
    imageUrls,
    loadRoomEditor,
    setActiveSpace,
    addPlacedItem,
    updatePlacedItem,
    updatePlacedItemLocal,
    setItemDimensions,
    mountOnWall,
    mountOnNearestWall,
    unmountFromWall,
    duplicatePlacedItem,
    removePlacedItem,
    selectItem,
    setCameraMode,
    toggleGridSnap,
    toggleReferenceDrawer,
    resetRoomLayout,
    itemHistory,
    itemFuture,
    beginItemMutation,
    undoItems,
    redoItems,
    removeWall,
    updateSpaceStyle,
  } = useRoomsStore();

  const [loaded, setLoaded] = useState(false);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [wallsVisible, setWallsVisible] = useState(true);
  const [cameraLocked, setCameraLocked] = useState(false);
  const [topViewSignal, setTopViewSignal] = useState(0);
  const [measureMode, setMeasureMode] = useState(false);
  const [removeWallMode, setRemoveWallMode] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [heldItemId, setHeldItemId] = useState<string | null>(null);
  const [walkHoverName, setWalkHoverName] = useState<string | null>(null);
  const [canPlaceHeld, setCanPlaceHeld] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!roomId) return;
    setLoaded(false);
    void loadRoomEditor(roomId).then(() => setLoaded(true));
  }, [roomId, loadRoomEditor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      // Walk-mode hotbar: number keys spawn an item straight into your hands. Necessary because
      // pointer lock captures the cursor, making on-screen buttons unclickable while walking.
      if (cameraMode === 'walk' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const slot = Number(e.code.replace('Digit', ''));
        if (e.code.startsWith('Digit') && slot >= 1 && slot <= WALK_QUICK_ADD.length) {
          e.preventDefault();
          const newId = addPlacedItem(WALK_QUICK_ADD[slot - 1]);
          if (newId) setHeldItemId(newId);
          return;
        }
      }

      // Delete/Backspace removes the selection (orbit mode only — in walk mode those keys
      // shouldn't nuke whatever you happen to be looking at).
      if (cameraMode === 'orbit' && (e.code === 'Delete' || e.code === 'Backspace')) {
        const id = useRoomsStore.getState().selectedItemId;
        if (id) {
          e.preventDefault();
          removePlacedItem(id);
          return;
        }
      }

      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redoItems();
      else undoItems();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoItems, redoItems, cameraMode, addPlacedItem, removePlacedItem]);

  if (!loaded) {
    return (
      <div className="grid h-screen place-items-center bg-neutral-950 text-neutral-500">Loading room…</div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="grid h-screen place-items-center bg-neutral-950 text-neutral-300">
        <div className="text-center">
          <p className="mb-3">Room not found.</p>
          <Link to="/" className="text-indigo-400 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const selectedItem = placedItems.find((it) => it.id === selectedItemId);
  const selectedCatalog = selectedItem ? getCatalogItem(selectedItem.catalogItemId) : undefined;
  const heldItem = placedItems.find((it) => it.id === heldItemId);
  const heldIsWallMounted = !!(heldItem && getCatalogItem(heldItem.catalogItemId)?.defaultWallMounted);
  const ceilingHeightIn = roomCeilingHeightIn(currentRoom);

  function handleScreenshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${currentRoom!.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function handleRotate90() {
    if (!selectedItem) return;
    updatePlacedItem(selectedItem.id, { rotationY: selectedItem.rotationY + Math.PI / 2 });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-950">
      <Toolbar
        roomName={currentRoom.name}
        cameraMode={cameraMode}
        onCameraModeChange={setCameraMode}
        transformMode={transformMode}
        onTransformModeChange={setTransformMode}
        gridSnap={gridSnap}
        onToggleGridSnap={toggleGridSnap}
        wallsVisible={wallsVisible}
        onToggleWalls={() => setWallsVisible((v) => !v)}
        showReference={showReferenceDrawer}
        onToggleReference={toggleReferenceDrawer}
        cameraLocked={cameraLocked}
        onToggleCameraLock={() => setCameraLocked((v) => !v)}
        onSnapToTop={() => {
          setCameraLocked(true);
          setTopViewSignal((n) => n + 1);
        }}
        onScreenshot={handleScreenshot}
        onResetLayout={resetRoomLayout}
        hasSelection={!!selectedItem}
        measureMode={measureMode}
        onToggleMeasure={() => {
          setMeasureMode((v) => !v);
          setRemoveWallMode(false);
        }}
        removeWallMode={removeWallMode}
        onToggleRemoveWall={() => {
          setRemoveWallMode((v) => !v);
          setMeasureMode(false);
        }}
        canUndo={itemHistory.length > 0}
        canRedo={itemFuture.length > 0}
        onUndo={undoItems}
        onRedo={redoItems}
        onDeleteSelected={() => selectedItem && removePlacedItem(selectedItem.id)}
        selectedName={selectedCatalog?.name}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <FurnitureCatalogPanel
          onAdd={addPlacedItem}
          topSlot={
            <>
              <RoomSwitcher spaces={currentLayout.spaces} activeSpaceId={activeSpaceId} onSelect={setActiveSpace} />
              {currentLayout.spaces.length > 0 && (
                <div className="border-b border-neutral-800 px-3 pb-3">
                  <button
                    type="button"
                    onClick={() => setShowStylePanel((v) => !v)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:border-indigo-500"
                  >
                    🎨 Room finishes
                  </button>
                </div>
              )}
              <ProductImport />
            </>
          }
        />

        <div className="relative flex-1">
          <Scene3D
            ref={canvasRef}
            layout={currentLayout}
            ceilingHeightIn={ceilingHeightIn}
            style={currentRoom.styleProfile ?? DEFAULT_STYLE}
            spaceStyles={currentRoom.spaceStyles}
            items={placedItems}
            selectedItemId={selectedItemId}
            onSelect={selectItem}
            cameraMode={cameraMode}
            transformMode={transformMode}
            gridSnap={gridSnap}
            wallOpacity={wallsVisible ? 0.95 : 0.12}
            cameraLocked={cameraLocked}
            measureMode={measureMode}
            removeWallMode={removeWallMode && cameraMode === 'orbit'}
            onRemoveWall={removeWall}
            heldItemId={heldItemId}
            onHeldChange={setHeldItemId}
            onWalkHoverChange={setWalkHoverName}
            canPlaceHeld={canPlaceHeld}
            onCanPlaceChange={setCanPlaceHeld}
            onDeleteItem={removePlacedItem}
            topViewSignal={topViewSignal}
            onBeginMutation={beginItemMutation}
            onCommitTransform={updatePlacedItem}
            onLiveTransform={updatePlacedItemLocal}
          />

          {cameraMode === 'walk' && (
            <>
              {/* crosshair — turns cyan when something is grabbable or being carried */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`h-2 w-2 rounded-full ring-2 transition-colors ${
                    heldItemId
                      ? canPlaceHeld
                        ? 'bg-cyan-300/90 ring-cyan-300/40'
                        : 'bg-rose-400/90 ring-rose-400/40'
                      : walkHoverName
                        ? 'bg-cyan-400/90 ring-cyan-400/30'
                        : 'bg-white/70 ring-black/30'
                  }`}
                />
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                <div className="rounded-full bg-black/65 px-4 py-1.5 text-sm text-neutral-200 backdrop-blur">
                  {heldItemId ? (
                    canPlaceHeld ? (
                      <>
                        <span className="text-cyan-300">Carrying</span> · Move to aim · Scroll or{' '}
                        <kbd className="rounded bg-white/15 px-1">R</kbd> rotate ·{' '}
                        <kbd className="rounded bg-white/15 px-1">Click</kbd> place ·{' '}
                        <kbd className="rounded bg-white/15 px-1">X</kbd> remove
                      </>
                    ) : (
                      <span className="text-rose-300">
                        Can’t place here — {heldIsWallMounted ? 'aim at a wall' : 'something’s in the way'}
                      </span>
                    )
                  ) : walkHoverName ? (
                    <>
                      <kbd className="rounded bg-white/15 px-1">E</kbd> pick up ·{' '}
                      <kbd className="rounded bg-white/15 px-1">X</kbd> remove{' '}
                      <span className="text-cyan-300">{walkHoverName}</span>
                    </>
                  ) : (
                    <>
                      Click to look · <kbd className="rounded bg-white/15 px-1">WASD</kbd> move ·{' '}
                      <kbd className="rounded bg-white/15 px-1">Shift</kbd> sprint ·{' '}
                      <kbd className="rounded bg-white/15 px-1">E</kbd> pick up ·{' '}
                      <kbd className="rounded bg-white/15 px-1">X</kbd> remove ·{' '}
                      <kbd className="rounded bg-white/15 px-1">1-9</kbd> add ·{' '}
                      <kbd className="rounded bg-white/15 px-1">Esc</kbd> exit
                    </>
                  )}
                </div>
              </div>

              {/* Hotbar: number-key driven, because pointer lock captures the cursor and makes
                  on-screen buttons unclickable while walking. pointer-events-none so it never
                  steals a click meant for the scene. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                <div className="max-w-4xl rounded-xl border border-white/10 bg-black/65 px-3 py-2 backdrop-blur">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {WALK_QUICK_ADD.map((id, i) => {
                      const c = getCatalogItem(id);
                      if (!c) return null;
                      return (
                        <div
                          key={id}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200"
                        >
                          <kbd className="rounded bg-cyan-400/20 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                            {i + 1}
                          </kbd>
                          {c.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {measureMode && cameraMode === 'orbit' && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <div className="rounded-full bg-amber-500/90 px-4 py-1.5 text-sm font-medium text-black backdrop-blur">
                📏 Click two points on the floor to measure
              </div>
            </div>
          )}

          {removeWallMode && cameraMode === 'orbit' && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <div className="rounded-full bg-red-500/90 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
                🧱 Hover a wall to highlight it, click to remove — Ctrl+Z undoes
              </div>
            </div>
          )}

          <ReferencePhotoDrawer
            room={currentRoom}
            imageUrls={imageUrls}
            open={showReferenceDrawer}
            onClose={toggleReferenceDrawer}
          />
        </div>

        {showStylePanel && (
          <RoomStylePanel
            spaces={currentLayout.spaces}
            activeSpaceId={activeSpaceId}
            spaceStyles={currentRoom.spaceStyles}
            baseStyle={currentRoom.styleProfile ?? DEFAULT_STYLE}
            onChange={updateSpaceStyle}
            onClose={() => setShowStylePanel(false)}
          />
        )}

        {selectedItem && selectedCatalog && !showStylePanel && (
          <SelectedItemPanel
            item={selectedItem}
            catalog={selectedCatalog}
            onDimensionsChange={(dims) => setItemDimensions(selectedItem.id, dims)}
            onRotate90={handleRotate90}
            onDuplicate={() => duplicatePlacedItem(selectedItem.id)}
            onDelete={() => removePlacedItem(selectedItem.id)}
            onMountOnNearestWall={() => mountOnNearestWall(selectedItem.id)}
            onSetWallHeight={(heightOffsetIn) => {
              if (selectedItem.wallMounted) mountOnWall(selectedItem.id, selectedItem.wallMounted.wallId, heightOffsetIn);
            }}
            onUnmountFromWall={() => unmountFromWall(selectedItem.id)}
            onColorChange={(hex) => updatePlacedItem(selectedItem.id, { color: hex })}
          />
        )}
      </div>
    </div>
  );
}
