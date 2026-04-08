import { useState } from 'react'
import type { LightItem, LightTreeNode, Room, ShutterItem, ShutterTreeNode } from '../types'
import { ShutterForm } from './ShutterForm'
import { LightForm } from './LightForm'

interface Props {
  room: Room
  onRefresh: () => void
}

type Tab = 'defaults' | 'shutters' | 'lights'

function countShutterItems(node: ShutterTreeNode): number {
  return node.items.length + node.children.reduce((s, c) => s + countShutterItems(c), 0)
}
function countLightItems(node: LightTreeNode): number {
  return node.items.length + node.children.reduce((s, c) => s + countLightItems(c), 0)
}

export function RoomPanel({ room, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>('defaults')

  const totalShutters = room.shutterTree.reduce((s, n) => s + countShutterItems(n), 0)
  const totalLights = room.lightTree.reduce((s, n) => s + countLightItems(n), 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b border-gray-200 px-6 pt-4">
        <TabBtn active={tab === 'defaults'} onClick={() => setTab('defaults')} badge={
          (room.shutterDefault ? 1 : 0) + (room.lightDefault ? 1 : 0)
        } badgeStyle="dot">
          🏠 Room Defaults
        </TabBtn>
        <TabBtn active={tab === 'shutters'} onClick={() => setTab('shutters')} badge={totalShutters}>
          🪟 Shutters
        </TabBtn>
        <TabBtn active={tab === 'lights'} onClick={() => setTab('lights')} badge={totalLights}>
          💡 Lights
        </TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {tab === 'defaults' && (
          <div className="space-y-4">
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              Metadata set here applies to <strong>all</strong> shutters or lights in this room that don't have their own item-level metadata (location fallback).
            </div>
            <ExpandCard title="Shutter Default" subtitle={`${room.name} › ShutterAutomation`} hasMeta={!!room.shutterDefault}>
              <ShutterForm itemName={room.name} initial={room.shutterDefault} fromLocation={false} onSaved={onRefresh} />
            </ExpandCard>
            <ExpandCard title="Light Default" subtitle={`${room.name} › LightAutomation`} hasMeta={!!room.lightDefault}>
              <LightForm itemName={room.name} initial={room.lightDefault} fromLocation={false} onSaved={onRefresh} />
            </ExpandCard>
          </div>
        )}

        {tab === 'shutters' && room.shutterTree.length === 0 && <Empty>No rollershutters in this room.</Empty>}
        {tab === 'shutters' && room.shutterTree.map((node) => (
          <ShutterNode key={node.name} node={node} depth={0} onRefresh={onRefresh} />
        ))}

        {tab === 'lights' && room.lightTree.length === 0 && <Empty>No light items in this room.</Empty>}
        {tab === 'lights' && room.lightTree.map((node) => (
          <LightNode key={node.name} node={node} depth={0} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  )
}

// ── Recursive tree components ─────────────────────────────────────────────────

function ShutterNode({ node, depth, onRefresh }: { node: ShutterTreeNode; depth: number; onRefresh: () => void }) {
  return (
    <TreeGroup
      name={node.name}
      label={node.label}
      hasMeta={!!node.metadata}
      depth={depth}
      form={<ShutterForm itemName={node.name} initial={node.metadata} fromLocation={false} onSaved={onRefresh} />}
    >
      {node.children.map((child) => (
        <ShutterNode key={child.name} node={child} depth={depth + 1} onRefresh={onRefresh} />
      ))}
      {node.items.map((item) => (
        <ShutterLeaf key={item.name} item={item} depth={depth + 1} onRefresh={onRefresh} />
      ))}
    </TreeGroup>
  )
}

function LightNode({ node, depth, onRefresh }: { node: LightTreeNode; depth: number; onRefresh: () => void }) {
  return (
    <TreeGroup
      name={node.name}
      label={node.label}
      hasMeta={!!node.metadata}
      depth={depth}
      form={<LightForm itemName={node.name} initial={node.metadata} fromLocation={false} onSaved={onRefresh} />}
    >
      {node.children.map((child) => (
        <LightNode key={child.name} node={child} depth={depth + 1} onRefresh={onRefresh} />
      ))}
      {node.items.map((item) => (
        <LightLeaf key={item.name} item={item} depth={depth + 1} onRefresh={onRefresh} />
      ))}
    </TreeGroup>
  )
}

function ShutterLeaf({ item, depth, onRefresh }: { item: ShutterItem; depth: number; onRefresh: () => void }) {
  return (
    <ExpandCard title={item.label} subtitle={item.name} hasMeta={!!item.metadata} depth={depth}>
      <ShutterForm itemName={item.name} initial={item.metadata} fromLocation={item.metadataFromLocation} onSaved={onRefresh} />
    </ExpandCard>
  )
}

function LightLeaf({ item, depth, onRefresh }: { item: LightItem; depth: number; onRefresh: () => void }) {
  return (
    <ExpandCard title={item.label} subtitle={item.name} hasMeta={!!item.metadata} depth={depth}>
      <LightForm itemName={item.name} initial={item.metadata} fromLocation={item.metadataFromLocation} onSaved={onRefresh} />
    </ExpandCard>
  )
}

// ── Tree group (equipment node, collapsible) ──────────────────────────────────

function TreeGroup({ name, label, hasMeta, depth, form, children }: {
  name: string
  label: string
  hasMeta: boolean
  depth: number
  form: React.ReactNode
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const indent = depth * 16

  return (
    <div style={{ marginLeft: indent }} className="space-y-2">
      <div className="border border-purple-200 rounded-lg overflow-hidden">
        <div className="flex items-center bg-purple-50">
          {/* Expand/collapse children toggle */}
          <button
            className="flex items-center gap-2 flex-1 px-4 py-2.5 text-left hover:bg-purple-100 transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="text-gray-400 text-xs w-3">{expanded ? '▾' : '▸'}</span>
            <span className="text-purple-400 text-xs">⚙</span>
            <span className="font-medium text-sm text-gray-900">{label}</span>
            {hasMeta
              ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">configured</span>
              : <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">no metadata</span>
            }
          </button>
          {/* Edit metadata button */}
          <button
            className="px-3 py-2.5 text-xs text-purple-500 hover:text-purple-700 hover:bg-purple-100 transition-colors border-l border-purple-200 font-mono"
            onClick={() => setFormOpen((v) => !v)}
            title="Edit metadata"
          >
            <span className="hidden sm:inline text-gray-400 mr-1">{name}</span>
            {formOpen ? '✕' : '✎'}
          </button>
        </div>
        {formOpen && (
          <div className="px-4 py-4 bg-gray-50 border-t border-purple-100">
            {form}
          </div>
        )}
      </div>
      {expanded && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Leaf item card ────────────────────────────────────────────────────────────

function ExpandCard({ title, subtitle, hasMeta, depth = 0, children }: {
  title: string
  subtitle: string
  hasMeta: boolean
  depth?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginLeft: depth * 16 }} className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">{title}</span>
            {hasMeta
              ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">configured</span>
              : <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">no metadata</span>
            }
          </div>
          <div className="text-xs text-gray-400 mt-0.5 font-mono">{subtitle}</div>
        </div>
        <span className="text-gray-400 text-lg">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children, badge, badgeStyle = 'count' }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  badge: number
  badgeStyle?: 'count' | 'dot'
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
      {badgeStyle === 'dot' ? (
        badge > 0 && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-blue-500' : 'bg-green-500'}`} />
      ) : (
        <span className={`text-xs rounded-full px-1.5 py-0.5 ${active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400 text-center py-8">{children}</p>
}




