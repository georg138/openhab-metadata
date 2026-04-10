import { useState } from 'react'
import { ASTRO_EVENTS, type ShutterConfig } from '../types'
import { saveMetadata, deleteMetadata } from '../api'

interface Props {
  itemName: string
  initial: ShutterConfig | null
  fromLocation: boolean
  onSaved: () => void
}

const DEFAULTS: ShutterConfig = {
  openEvent: '',
  closeEvent: '',
  openPosition: '',
  closePosition: '',
  earliestOpen: '',
  latestClose: '',
  sunDirection: '',
  sunMinElevation: '',
  sunProtectionPosition: '',
  doorSensorItem: '',
}

export function ShutterForm({ itemName, initial, fromLocation, onSaved }: Props) {
  const [cfg, setCfg] = useState<ShutterConfig>(initial ?? DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function set(key: keyof ShutterConfig, value: string) {
    setCfg((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveMetadata(itemName, 'ShutterAutomation', cfg as Record<string, string>)
      setSuccess(true)
      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ShutterAutomation metadata from ${itemName}?`)) return
    setSaving(true)
    setError(null)
    try {
      await deleteMetadata(itemName, 'ShutterAutomation')
      setCfg(DEFAULTS)
      setSuccess(true)
      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const sunEnabled = !!cfg.sunDirection

  return (
    <div className="space-y-4">
      {fromLocation && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          ⚠ Metadata inherited from location group — saving will write directly to this item.
        </div>
      )}

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Time Control</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">Open Event</span>
            <select className="field" value={cfg.openEvent ?? ''} onChange={(e) => set('openEvent', e.target.value)}>
              <option value="">— unset —</option>
              {ASTRO_EVENTS.map((ev) => <option key={ev}>{ev}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Close Event</span>
            <select className="field" value={cfg.closeEvent ?? ''} onChange={(e) => set('closeEvent', e.target.value)}>
              <option value="">— unset —</option>
              {ASTRO_EVENTS.map((ev) => <option key={ev}>{ev}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Open Position <span className="text-gray-400">(0=up)</span></span>
            <input className="field" type="number" min={0} max={100} placeholder="0" value={cfg.openPosition ?? ''} onChange={(e) => set('openPosition', e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Close Position <span className="text-gray-400">(100=down)</span></span>
            <input className="field" type="number" min={0} max={100} placeholder="100" value={cfg.closePosition ?? ''} onChange={(e) => set('closePosition', e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Earliest Open <span className="text-gray-400">HH:mm</span></span>
            <input className="field" type="time" value={cfg.earliestOpen ?? ''} onChange={(e) => set('earliestOpen', e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Latest Close <span className="text-gray-400">HH:mm</span></span>
            <input className="field" type="time" value={cfg.latestClose ?? ''} onChange={(e) => set('latestClose', e.target.value)} />
          </label>
        </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Sun Protection</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-2">
            <span className="field-label">Sun Direction <span className="text-gray-400">(required to enable)</span></span>
            <select className="field" value={cfg.sunDirection ?? ''} onChange={(e) => set('sunDirection', e.target.value)}>
              <option value="">— unset —</option>
              <option value="north">North</option>
              <option value="east">East</option>
              <option value="south">South</option>
              <option value="west">West</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Min Elevation °</span>
            <input className="field" type="number" min={0} max={90} placeholder="10" value={cfg.sunMinElevation ?? ''} onChange={(e) => set('sunMinElevation', e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Protection Position</span>
            <input className="field" type="number" min={0} max={100} placeholder="80" value={cfg.sunProtectionPosition ?? ''} onChange={(e) => set('sunProtectionPosition', e.target.value)} />
          </label>
        </div>
        {!sunEnabled && (
          <p className="text-xs text-gray-400 mt-1">Set Sun Direction on individual items to activate sun protection.</p>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Door Sensor</h4>
        <label className="block">
          <span className="field-label">Door Sensor Item</span>
          <input className="field" type="text" placeholder="e.g. EG_Wohnzimmer_Terrassentuer_Kontakt" value={cfg.doorSensorItem ?? ''} onChange={(e) => set('doorSensorItem', e.target.value)} />
        </label>
      </section>

      <FormActions saving={saving} error={error} success={success} hasMetadata={!!initial} onSave={handleSave} onDelete={handleDelete} />
    </div>
  )
}

function FormActions({ saving, error, success, hasMetadata, onSave, onDelete }: {
  saving: boolean
  error: string | null
  success: boolean
  hasMetadata: boolean
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button className="btn-primary" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      {hasMetadata && (
        <button className="btn-danger" onClick={onDelete} disabled={saving}>
          Remove
        </button>
      )}
      {success && <span className="text-sm text-green-600">✓ Saved</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}
