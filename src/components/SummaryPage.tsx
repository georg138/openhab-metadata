import { useState } from 'react'
import type { Room, ShutterConfig, LightConfig, ShutterTreeNode, LightTreeNode, ShutterItem, LightItem } from '../types'

// ── Flatten tree helpers ────────────────────────────────────────────────────

function flattenShutterItems(nodes: ShutterTreeNode[]): ShutterItem[] {
  const out: ShutterItem[] = []
  function walk(node: ShutterTreeNode) {
    out.push(...node.items)
    node.children.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}

function flattenLightItems(nodes: LightTreeNode[]): LightItem[] {
  const out: LightItem[] = []
  function walk(node: LightTreeNode) {
    out.push(...node.items)
    node.children.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}

// ── Source colour ───────────────────────────────────────────────────────────

function cellClass(source: string | undefined): string {
  if (!source) return 'text-gray-300'
  if (source === 'Item') return 'text-blue-700 bg-blue-50'
  if (source.startsWith('Equipment')) return 'text-purple-700 bg-purple-50'
  if (source.startsWith('Room')) return 'text-green-700 bg-green-50'
  if (source.startsWith('Global')) return 'text-amber-700 bg-amber-50'
  return 'text-gray-600'
}

function Cell({ value, source }: { value: string | undefined; source: string | undefined }) {
  if (!value) return <td className="px-2 py-1.5 text-center text-gray-200">—</td>
  return (
    <td className={`px-2 py-1.5 text-center font-mono text-xs whitespace-nowrap rounded ${cellClass(source)}`}>
      {value}
    </td>
  )
}

// ── Shutter table ───────────────────────────────────────────────────────────

const SHUTTER_COLS: { key: keyof ShutterConfig; label: string }[] = [
  { key: 'openEvent',             label: 'Open' },
  { key: 'closeEvent',            label: 'Close' },
  { key: 'openPosition',          label: 'Open%' },
  { key: 'closePosition',         label: 'Close%' },
  { key: 'earliestOpen',          label: 'EarliestOpen' },
  { key: 'latestClose',           label: 'LatestClose' },
  { key: 'sunDirection',          label: 'SunDir' },
  { key: 'sunMinElevation',       label: 'MinElev°' },
  { key: 'sunProtectionPosition', label: 'SunPos%' },
  { key: 'doorSensorItem',        label: 'DoorSensor' },
]

function ShutterTable({ rooms }: { rooms: Room[] }) {
  const rows = rooms.flatMap((room) =>
    flattenShutterItems(room.shutterTree).map((item) => ({ room, item }))
  )

  if (rows.length === 0)
    return <p className="px-6 py-8 text-sm text-gray-400 italic">No shutter items found.</p>

  return (
    <div className="overflow-auto flex-1">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap">Room</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap">Item</th>
            {SHUTTER_COLS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-center font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ room, item }) => (
            <tr key={item.name} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
              <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">{room.label}</td>
              <td className="px-3 py-1.5 text-gray-800 whitespace-nowrap font-medium">{item.label}</td>
              {SHUTTER_COLS.map((c) => (
                <Cell
                  key={c.key}
                  value={item.effectiveConfig[c.key]}
                  source={item.effectiveSources[c.key]}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Light table ─────────────────────────────────────────────────────────────

const LIGHT_COLS: { key: keyof LightConfig; label: string }[] = [
  { key: 'onEvent',    label: 'On event' },
  { key: 'offEvent',   label: 'Off event' },
  { key: 'onCommand',  label: 'On cmd' },
  { key: 'offCommand', label: 'Off cmd' },
  { key: 'earliestOn', label: 'EarliestOn' },
  { key: 'latestOff',  label: 'LatestOff' },
]

function LightTable({ rooms }: { rooms: Room[] }) {
  const rows = rooms.flatMap((room) =>
    flattenLightItems(room.lightTree).map((item) => ({ room, item }))
  )

  if (rows.length === 0)
    return <p className="px-6 py-8 text-sm text-gray-400 italic">No light items found.</p>

  return (
    <div className="overflow-auto flex-1">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap">Room</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap">Item</th>
            {LIGHT_COLS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-center font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ room, item }) => (
            <tr key={item.name} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
              <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">{room.label}</td>
              <td className="px-3 py-1.5 text-gray-800 whitespace-nowrap font-medium">{item.label}</td>
              {LIGHT_COLS.map((c) => (
                <Cell
                  key={c.key}
                  value={item.effectiveConfig[c.key]}
                  source={item.effectiveSources[c.key]}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-500 shrink-0">
      <span className="font-medium text-gray-600">Source:</span>
      {[
        { label: 'Item',      cls: 'bg-blue-100 text-blue-700' },
        { label: 'Equipment', cls: 'bg-purple-100 text-purple-700' },
        { label: 'Room',      cls: 'bg-green-100 text-green-700' },
        { label: 'Global',    cls: 'bg-amber-100 text-amber-700' },
      ].map(({ label, cls }) => (
        <span key={label} className={`px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
      ))}
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────

interface Props {
  rooms: Room[]
}

export function SummaryPage({ rooms }: Props) {
  const [tab, setTab] = useState<'shutters' | 'lights'>('shutters')

  const totalShutters = rooms.reduce((s, r) => s + flattenShutterItems(r.shutterTree).length, 0)
  const totalLights   = rooms.reduce((s, r) => s + flattenLightItems(r.lightTree).length, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setTab('shutters')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'shutters'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🪟 Shutters <span className="ml-1 text-xs text-gray-400">({totalShutters})</span>
        </button>
        <button
          onClick={() => setTab('lights')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'lights'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          💡 Lights <span className="ml-1 text-xs text-gray-400">({totalLights})</span>
        </button>
      </div>

      <Legend />

      {tab === 'shutters' ? <ShutterTable rooms={rooms} /> : <LightTable rooms={rooms} />}
    </div>
  )
}
