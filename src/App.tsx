import { useCallback, useEffect, useState } from 'react'
import type { Room, ShutterTreeNode, LightTreeNode } from './types'
import { fetchRooms, fetchGlobalDefaults, type GlobalDefaults } from './api'
import { RoomPanel } from './components/RoomPanel'
import { GlobalDefaultsPanel } from './components/GlobalDefaultsPanel'
import { SummaryPage } from './components/SummaryPage'

const GLOBAL_SENTINEL = '__global__'
const SUMMARY_SENTINEL = '__summary__'
const FLOOR_ORDER = ['EG', 'OG', 'UG', 'DG', 'Garten', 'Garage']

function countTreeItems(node: ShutterTreeNode | LightTreeNode, _kind: 's' | 'l'): number {
  return node.items.length + node.children.reduce((s, c) => s + countTreeItems(c, _kind), 0)
}

function floorOf(room: Room) {
  for (const f of FLOOR_ORDER) {
    if (room.name.startsWith(f + '_') || room.name === f) return f
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
              <GlobalDefaultsPanel defaults={globalDefaults} onRefresh={load} />
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
              <RoomPanel room={currentRoom} onRefresh={load} />
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
