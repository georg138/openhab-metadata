import { useState } from 'react'
import { ASTRO_EVENTS, type LightConfig } from '../types'
import { saveMetadata, deleteMetadata } from '../api'

export interface LightTimeSuggestions {
  earliestOn: string[]
  latestOff: string[]
}

interface Props {
  itemName: string
  initial: LightConfig | null
  fromLocation: boolean
  suggestions?: LightTimeSuggestions
  onSaved: () => void
}

const DEFAULTS: LightConfig = {
  onEvent: '',
  offEvent: '',
  onCommand: '',
  offCommand: '',
  earliestOn: '',
  latestOff: '',
}

export function LightForm({ itemName, initial, fromLocation, suggestions, onSaved }: Props) {
  const [cfg, setCfg] = useState<LightConfig>(initial ?? DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function set(key: keyof LightConfig, value: string) {
    setCfg((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveMetadata(itemName, 'LightAutomation', cfg as Record<string, string>)
      setSuccess(true)
      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove LightAutomation metadata from ${itemName}?`)) return
    setSaving(true)
    setError(null)
    try {
      await deleteMetadata(itemName, 'LightAutomation')
      setCfg(DEFAULTS)
      setSuccess(true)
      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {fromLocation && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          ⚠ Metadata inherited from location group — saving will write directly to this item.
        </div>
      )}

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Schedule</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">On Event</span>
            <select className={`field ${!cfg.onEvent ? 'text-gray-400' : ''}`} value={cfg.onEvent ?? ''} onChange={(e) => set('onEvent', e.target.value)}>
              <option value="">↑ inherit</option>
              <option value="UNSET">✕ UNSET (disable)</option>
              {ASTRO_EVENTS.map((ev) => <option key={ev}>{ev}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Off Event</span>
            <select className={`field ${!cfg.offEvent ? 'text-gray-400' : ''}`} value={cfg.offEvent ?? ''} onChange={(e) => set('offEvent', e.target.value)}>
              <option value="">↑ inherit</option>
              <option value="UNSET">✕ UNSET (disable)</option>
              {ASTRO_EVENTS.map((ev) => <option key={ev}>{ev}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Earliest On <span className="text-gray-400">HH:mm</span></span>
            <input className="field" list="light-earliestOn-opts" type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="HH:mm" value={cfg.earliestOn ?? ''} onChange={(e) => set('earliestOn', e.target.value)} />
            <datalist id="light-earliestOn-opts">
              {(suggestions?.earliestOn ?? []).map((v) => <option key={v} value={v} />)}
            </datalist>
          </label>
          <label className="block">
            <span className="field-label">Latest Off <span className="text-gray-400">HH:mm</span></span>
            <input className="field" list="light-latestOff-opts" type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="HH:mm" value={cfg.latestOff ?? ''} onChange={(e) => set('latestOff', e.target.value)} />
            <datalist id="light-latestOff-opts">
              {(suggestions?.latestOff ?? []).map((v) => <option key={v} value={v} />)}
            </datalist>
          </label>
        </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Commands</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">On Command <span className="text-gray-400">default: ON</span></span>
            <input className="field" type="text" placeholder='ON or "50" for dimmer %' value={cfg.onCommand ?? ''} onChange={(e) => set('onCommand', e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Off Command <span className="text-gray-400">default: OFF</span></span>
            <input className="field" type="text" placeholder="OFF" value={cfg.offCommand ?? ''} onChange={(e) => set('offCommand', e.target.value)} />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {initial && (
          <button className="btn-danger" onClick={handleDelete} disabled={saving}>
            Remove
          </button>
        )}
        {success && <span className="text-sm text-green-600">✓ Saved</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
