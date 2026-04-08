import { useCallback, useEffect, useState } from 'react'
import type { Room, ShutterTreeNode, LightTreeNode } from './types'
import { fetchRooms } from './api'
import { RoomPanel } from './components/RoomPanel'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRooms()
      setRooms(data)
      if (data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0].name)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const currentRoom = rooms.find((r) => r.name === selectedRoom)

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
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-base font-semibold text-gray-900">openHAB Metadata</h1>
          <p className="text-xs text-gray-400 mt-0.5">Automation configuration</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
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
                  onClick={() => setSelectedRoom(room.name)}
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
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentRoom ? (
          <>
            <header className="px-6 py-4 bg-white border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{currentRoom.label}</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{currentRoom.name}</p>
            </header>
            <div className="flex-1 overflow-hidden">
              <RoomPanel room={currentRoom} onRefresh={load} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            {loading ? 'Loading rooms…' : 'Select a room'}
          </div>
        )}
      </main>
    </div>
  )
}
