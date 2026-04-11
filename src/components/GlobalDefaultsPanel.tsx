import { useState } from 'react'
import type { GlobalDefaults } from '../api'
import { GLOBAL_DEFAULTS_ITEM } from '../api'
import { ShutterForm, type ShutterTimeSuggestions } from './ShutterForm'
import { LightForm, type LightTimeSuggestions } from './LightForm'

interface Props {
  defaults: GlobalDefaults
  shutterSuggestions: ShutterTimeSuggestions
  lightSuggestions: LightTimeSuggestions
  onRefresh: () => void
}

export function GlobalDefaultsPanel({ defaults, shutterSuggestions, lightSuggestions, onRefresh }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          These are the <strong>global last-resort defaults</strong> applied to every shutter and light
          that has no item-level or room-level metadata. They are stored on item{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">{GLOBAL_DEFAULTS_ITEM}</code>.
        </div>

        <ExpandCard title="🪟 Shutter Defaults" hasMeta={!!defaults.shutterConfig}>
          <ShutterForm
            itemName={GLOBAL_DEFAULTS_ITEM}
            initial={defaults.shutterConfig}
            fromLocation={false}
            suggestions={shutterSuggestions}
            onSaved={onRefresh}
          />
        </ExpandCard>

        <ExpandCard title="💡 Light Defaults" hasMeta={!!defaults.lightConfig}>
          <LightForm
            itemName={GLOBAL_DEFAULTS_ITEM}
            initial={defaults.lightConfig}
            fromLocation={false}
            suggestions={lightSuggestions}
            onSaved={onRefresh}
          />
        </ExpandCard>
      </div>
    </div>
  )
}

function ExpandCard({ title, hasMeta, children }: {
  title: string
  hasMeta: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900">{title}</span>
          {hasMeta
            ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">configured</span>
            : <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">no metadata</span>
          }
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
