import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Room, ShutterTreeNode, LightTreeNode, ShutterItem, LightItem } from './types'
import { fetchRooms, fetchGlobalDefaults, type GlobalDefaults } from './api'
import { RoomPanel } from './components/RoomPanel'
import { GlobalDefaultsPanel } from './components/GlobalDefaultsPanel'
import { SummaryPage } from './components/SummaryPage'
import type { ShutterTimeSuggestions } from './components/ShutterForm'
import type { LightTimeSuggestions } from './components/LightForm'

const GLOBAL_SENTINEL = '__global__'
const SUMMARY_SENTINEL = '__summary__'
const FLOOR_ORDER = ['EG', 'OG', 'UG', 'DG', 'Garten', 'Garage']
// OK_ is an alias for OG_ (upper floor variant naming)
const FLOOR_ALIAS: Record<string, string> = { OK: 'OG' }

function countTreeItems(node: ShutterTreeNode | LightTreeNode, _kind: 's' | 'l'): number {
  return node.items.length + node.children.reduce((s, c) => s + countTreeItems(c, _kind), 0)
}

function flattenShutters(nodes: ShutterTreeNode[]): ShutterItem[] {
  const out: ShutterItem[] = []
  function walk(n: ShutterTreeNode) { out.push(...n.items); n.children.forEach(walk) }
  nodes.forEach(walk)
  return out
}

function flattenShutterNodes(nodes: ShutterTreeNode[]): ShutterTreeNode[] {
  const out: ShutterTreeNode[] = []
  function walk(n: ShutterTreeNode) { out.push(n); n.children.forEach(walk) }
  nodes.forEach(walk)
  return out
}

function flattenLights(nodes: LightTreeNode[]): LightItem[] {
  const out: LightItem[] = []
  function walk(n: LightTreeNode) { out.push(...n.items); n.children.forEach(walk) }
  nodes.forEach(walk)
  return out
}

function flattenLightNodes(nodes: LightTreeNode[]): LightTreeNode[] {
  const out: LightTreeNode[] = []
  function walk(n: LightTreeNode) { out.push(n); n.children.forEach(walk) }
  nodes.forEach(walk)
  return out
}

function floorOf(room: Room) {
  for (const f of FLOOR_ORDER) {
    if (room.name.startsWith(f + '_') || room.name === f) return f
  }
  for (const [alias, canonical] of Object.entries(FLOOR_ALIAS)) {
    if (room.name.startsWith(alias + '_') || room.name === alias) return canonical
  }
  return 'Other'
}

function floorLabel(key: string) {
  const map: Record<string, string> = {
    EG: 'Ground Floor', OG: 'Upper Floor', UG: 'Basement',
    DG: 'Attic', Garten: 'Garden', Garage: 'Garage', Other: 'Other',
  }
  return map[key] ?? key
}

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [globalDefaults, setGlobalDefaults] = useState<GlobalDefaults>({ shutterConfig: null, lightConfig: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string>(GLOBAL_SENTINEL)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function selectRoom(name: string) {
    setSelectedRoom(name)
    setSidebarOpen(false)  // close on mobile after selection
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, globals] = await Promise.all([fetchRooms(), fetchGlobalDefaults()])
      setRooms(data)
      setGlobalDefaults(globals)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const shutterSuggestions = useMemo<ShutterTimeSuggestions>(() => {
    const eo = new Set<string>(), lc = new Set<string>()
    // global defaults
    if (globalDefaults.shutterConfig?.earliestOpen) eo.add(globalDefaults.shutterConfig.earliestOpen)
    if (globalDefaults.shutterConfig?.latestClose) lc.add(globalDefaults.shutterConfig.latestClose)
    for (const r of rooms) {
      // room defaults
      if (r.shutterDefault?.earliestOpen) eo.add(r.shutterDefault.earliestOpen)
      if (r.shutterDefault?.latestClose) lc.add(r.shutterDefault.latestClose)
      // equipment nodes
      flattenShutterNodes(r.shutterTree).forEach((n) => {
        if (n.metadata?.earliestOpen) eo.add(n.metadata.earliestOpen)
        if (n.metadata?.latestClose) lc.add(n.metadata.latestClose)
      })
      // leaf items
      flattenShutters(r.shutterTree).forEach((it) => {
        if (it.metadata?.earliestOpen) eo.add(it.metadata.earliestOpen)
        if (it.metadata?.latestClose) lc.add(it.metadata.latestClose)
      })
    }
    return { earliestOpen: [...eo].sort(), latestClose: [...lc].sort() }
  }, [rooms, globalDefaults])

  const lightSuggestions = useMemo<LightTimeSuggestions>(() => {
    const eon = new Set<string>(), lo = new Set<string>()
    // global defaults
    if (globalDefaults.lightConfig?.earliestOn) eon.add(globalDefaults.lightConfig.earliestOn)
    if (globalDefaults.lightConfig?.latestOff) lo.add(globalDefaults.lightConfig.latestOff)
    for (const r of rooms) {
      // room defaults
      if (r.lightDefault?.earliestOn) eon.add(r.lightDefault.earliestOn)
      if (r.lightDefault?.latestOff) lo.add(r.lightDefault.latestOff)
      // equipment nodes
      flattenLightNodes(r.lightTree).forEach((n) => {
        if (n.metadata?.earliestOn) eon.add(n.metadata.earliestOn)
        if (n.metadata?.latestOff) lo.add(n.metadata.latestOff)
      })
      // leaf items
      flattenLights(r.lightTree).forEach((it) => {
        if (it.metadata?.earliestOn) eon.add(it.metadata.earliestOn)
        if (it.metadata?.latestOff) lo.add(it.metadata.latestOff)
      })
    }
    return { earliestOn: [...eon].sort(), latestOff: [...lo].sort() }
  }, [rooms, globalDefaults])

  const currentRoom = rooms.find((r) => r.name === selectedRoom)
  const showGlobal = selectedRoom === GLOBAL_SENTINEL
  const showSummary = selectedRoom === SUMMARY_SENTINEL

  // Group rooms by floor
  const byFloor = FLOOR_ORDER.reduce<Record<string, Room[]>>((acc, f) => {
    const rs = rooms.filter((r) => floorOf(r) === f)
    if (rs.length) acc[f] = rs
    return acc
  }, {})
  const otherRooms = rooms.filter((r) => floorOf(r) === 'Other')
  if (otherRooms.length) byFloor['Other'] = otherRooms

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-200
        md:static md:translate-x-0 md:w-60
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">openHAB Metadata</h1>
            <p className="text-xs text-gray-400 mt-0.5">Automation configuration</p>
          </div>
          {/* Close button — mobile only */}
          <button
            className="md:hidden p-1 rounded text-gray-400 hover:text-gray-600"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >✕</button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {/* Global defaults pinned at top */}
          <button
            onClick={() => selectRoom(GLOBAL_SENTINEL)}
            className={`w-full text-left px-4 py-2 text-sm transition-colors flex justify-between items-center border-b border-gray-100 ${
              showGlobal
                ? 'bg-amber-50 text-amber-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>🌐 Global Defaults</span>
            <span className="text-xs">
              {(globalDefaults.shutterConfig ? '🪟' : '') + (globalDefaults.lightConfig ? '💡' : '')}
            </span>
          </button>
          {/* Summary */}
          <button
            onClick={() => selectRoom(SUMMARY_SENTINEL)}
            className={`w-full text-left px-4 py-2 text-sm transition-colors flex justify-between items-center border-b border-gray-100 mb-1 ${
              showSummary
                ? 'bg-sky-50 text-sky-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>📊 Summary</span>
            <span className="text-xs text-gray-400">
              {rooms.reduce((s, r) => s + r.shutterTree.reduce((ss, n) => ss + countTreeItems(n, 's'), 0), 0)}🪟
              {' · '}
              {rooms.reduce((s, r) => s + r.lightTree.reduce((ss, n) => ss + countTreeItems(n, 'l'), 0), 0)}💡
            </span>
          </button>

          {loading && <p className="px-4 py-2 text-xs text-gray-400">Loading…</p>}
          {error && <p className="px-4 py-2 text-xs text-red-500">{error}</p>}
          {Object.entries(byFloor).map(([floor, rs]) => (
            <div key={floor} className="mb-1">
              <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {floorLabel(floor)}
              </div>
              {rs.map((room) => (
                <button
                  key={room.name}
                  onClick={() => selectRoom(room.name)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex justify-between items-center ${
                    selectedRoom === room.name
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{room.label}</span>
                  <span className="text-xs text-gray-400">
                    {room.shutterTree.reduce((s, n) => s + countTreeItems(n, 's'), 0)}🪟
                    {' · '}
                    {room.lightTree.reduce((s, n) => s + countTreeItems(n, 'l'), 0)}💡
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {showGlobal ? (
          <>
            <header className="px-4 md:px-6 py-4 bg-white border-b border-gray-200 shrink-0 flex items-center gap-3">
              <button
                className="md:hidden p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >☰</button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">🌐 Global Defaults</h2>
                <p className="text-xs text-gray-400 mt-0.5">Last-resort fallback for all rooms</p>
              </div>
            </header>
            <div className="flex-1 overflow-hidden">
              <GlobalDefaultsPanel defaults={globalDefaults} shutterSuggestions={shutterSuggestions} lightSuggestions={lightSuggestions} onRefresh={load} />
            </div>
          </>
        ) : showSummary ? (
          <>
            <header className="px-4 md:px-6 py-4 bg-white border-b border-gray-200 shrink-0 flex items-center gap-3">
              <button
                className="md:hidden p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >☰</button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">📊 Summary</h2>
                <p className="text-xs text-gray-400 mt-0.5">Effective values for all items across all rooms</p>
              </div>
            </header>
            <div className="flex-1 overflow-hidden">
              <SummaryPage rooms={rooms} />
            </div>
          </>
        ) : currentRoom ? (
          <>
            <header className="px-4 md:px-6 py-4 bg-white border-b border-gray-200 shrink-0 flex items-center gap-3">
              <button
                className="md:hidden p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >☰</button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{currentRoom.label}</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{currentRoom.name}</p>
              </div>
            </header>
            <div className="flex-1 overflow-hidden">
              <RoomPanel key={currentRoom.name} room={currentRoom} shutterSuggestions={shutterSuggestions} lightSuggestions={lightSuggestions} onRefresh={load} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <button
                className="md:hidden mb-4 px-4 py-2 rounded bg-white border border-gray-200 text-sm text-gray-600 shadow-sm"
                onClick={() => setSidebarOpen(true)}
              >☰ Open menu</button>
              <p>{loading ? 'Loading…' : 'Select a room'}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
