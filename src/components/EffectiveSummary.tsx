import { useState } from 'react'
import type { ShutterConfig, LightConfig } from '../types'

const SHUTTER_LABELS: Record<keyof ShutterConfig, string> = {
  openEvent: 'Open event',
  closeEvent: 'Close event',
  openPosition: 'Open position (%)',
  closePosition: 'Close position (%)',
  earliestOpen: 'Earliest open',
  latestClose: 'Latest close',
  sunDirection: 'Sun direction',
  sunMinElevation: 'Min sun elevation (°)',
  sunProtectionPosition: 'Sun protection pos. (%)',
  doorSensorItem: 'Door sensor item',
}

const LIGHT_LABELS: Record<keyof LightConfig, string> = {
  onEvent: 'On event',
  offEvent: 'Off event',
  onCommand: 'On command',
  offCommand: 'Off command',
  earliestOn: 'Earliest on',
  latestOff: 'Latest off',
}

function sourceBadge(source: string) {
  if (source === 'Item')
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{source}</span>
  if (source.startsWith('Equipment'))
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{source}</span>
  if (source.startsWith('Room'))
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{source}</span>
  if (source.startsWith('Global'))
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{source}</span>
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{source}</span>
}

interface ShutterProps {
  kind: 'shutter'
  config: ShutterConfig
  sources: Partial<Record<keyof ShutterConfig, string>>
}

interface LightProps {
  kind: 'light'
  config: LightConfig
  sources: Partial<Record<keyof LightConfig, string>>
}

type Props = ShutterProps | LightProps

export function EffectiveSummary(props: Props) {
  const [open, setOpen] = useState(false)

  const labels = props.kind === 'shutter'
    ? SHUTTER_LABELS as Record<string, string>
    : LIGHT_LABELS as Record<string, string>

  const config = props.config as Record<string, string | undefined>
  const sources = props.sources as Partial<Record<string, string>>

  const rows = Object.entries(labels).map(([field, label]) => ({
    field,
    label,
    value: config[field],
    source: sources[field],
  }))

  const setRows = rows.filter((r) => r.value)
  const hasAny = setRows.length > 0

  return (
    <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
      <button
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span className="font-medium">Effective configuration</span>
        {hasAny
          ? <span className="ml-1 bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">{setRows.length} field{setRows.length !== 1 ? 's' : ''}</span>
          : <span className="ml-1 text-gray-400 italic">nothing configured</span>
        }
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-gray-100 overflow-hidden">
          {!hasAny ? (
            <p className="px-3 py-2 text-xs text-gray-400 italic">No metadata configured at any level.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {rows.map(({ field, label, value, source }) => (
                  <tr key={field} className={`border-b border-gray-50 last:border-0 ${value ? '' : 'opacity-40'}`}>
                    <td className="px-3 py-1.5 text-gray-500 w-2/5">{label}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-800 w-1/4">
                      {value ?? <span className="italic text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {source ? sourceBadge(source) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
