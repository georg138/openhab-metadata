export interface OHMetadataValue {
  value: string
  config: Record<string, string>
  editable?: boolean
}

export interface OHItem {
  name: string
  type: string
  label?: string
  tags: string[]
  groupNames: string[]
  metadata?: {
    semantics?: OHMetadataValue
    ShutterAutomation?: OHMetadataValue
    LightAutomation?: OHMetadataValue
  }
}

export interface ShutterItem {
  name: string
  label: string
  locationName: string
  metadata: ShutterConfig | null
  metadataFromLocation: boolean
}

export interface LightItem {
  name: string
  label: string
  locationName: string
  metadata: LightConfig | null
  metadataFromLocation: boolean
}

export interface ShutterTreeNode {
  name: string
  label: string
  metadata: ShutterConfig | null
  children: ShutterTreeNode[]
  items: ShutterItem[]
}

export interface LightTreeNode {
  name: string
  label: string
  metadata: LightConfig | null
  children: LightTreeNode[]
  items: LightItem[]
}

export interface Room {
  name: string
  label: string
  tags: string[]
  shutterDefault: ShutterConfig | null
  lightDefault: LightConfig | null
  shutterTree: ShutterTreeNode[]
  lightTree: LightTreeNode[]
}

export const ASTRO_EVENTS = ['CIVIL_DAWN', 'SUN_RISE', 'SUNRISE', 'SUN_SET', 'SUNSET', 'CIVIL_DUSK'] as const
export type AstroEvent = (typeof ASTRO_EVENTS)[number]

export interface ShutterConfig {
  openEvent?: string
  closeEvent?: string
  openPosition?: string
  closePosition?: string
  earliestOpen?: string
  latestClose?: string
  sunDirection?: string
  sunMinElevation?: string
  sunProtectionPosition?: string
  doorSensorItem?: string
}

export interface LightConfig {
  onEvent?: string
  offEvent?: string
  onCommand?: string
  offCommand?: string
  earliestOn?: string
  latestOff?: string
}

