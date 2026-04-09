import type { LightConfig, LightTreeNode, OHItem, Room, ShutterConfig, ShutterTreeNode, ShutterItem, LightItem } from './types'

export const GLOBAL_DEFAULTS_ITEM = 'Automation_Vorgaben'

const BASE = '/rest'

const LIGHT_CONTROL_TYPES = new Set(['Switch', 'Dimmer', 'Color'])

async function fetchJSON(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`)
  return res.json()
}

/**
 * Fetch all items enriched with ShutterAutomation + LightAutomation + semantics metadata,
 * then build a Room[] array grouping shutters and lights by their semantic location.
 */
export async function fetchRooms(): Promise<Room[]> {
  const [items, tags]: [OHItem[], { uid: string; name: string }[]] = await Promise.all([
    fetchJSON('/items?metadata=ShutterAutomation,LightAutomation,semantics&fields=name,type,label,tags,groupNames,metadata'),
    fetchJSON('/tags'),
  ])

  // Build room tag set dynamically from the Location_* tags
  const roomTagSet = new Set(
    tags.filter((t) => t.uid.startsWith('Location')).map((t) => t.name)
  )

  const byName = new Map(items.map((i) => [i.name, i]))

  // Walk up the equipment hierarchy from the direct equipment of an item to the room.
  // Returns all intermediate equipment nodes (chain[0] = closest to item, chain[last] has hasLocation).
  function resolveEquipmentChain(item: OHItem): { loc: OHItem | null; chain: OHItem[] } {
    const equipName = item.metadata?.semantics?.config?.isPointOf
    if (!equipName) return { loc: null, chain: [] }
    const chain: OHItem[] = []
    let node = byName.get(equipName)
    for (let i = 0; i < 5 && node; i++) {
      const cfg = node.metadata?.semantics?.config ?? {}
      chain.push(node)
      if (cfg.hasLocation) return { loc: byName.get(cfg.hasLocation) ?? null, chain }
      if (cfg.isPartOf) { node = byName.get(cfg.isPartOf); continue }
      break
    }
    return { loc: null, chain }
  }

  // ── Rooms ─────────────────────────────────────────────────────────────────
  const roomItems = items.filter((i) =>
    i.type === 'Group' && i.tags.some((t) => roomTagSet.has(t))
  )
  const roomMap = new Map<string, Room>()
  for (const r of roomItems) {
    const shutterMeta = r.metadata?.ShutterAutomation
    const lightMeta = r.metadata?.LightAutomation
    roomMap.set(r.name, {
      name: r.name,
      label: r.label ?? r.name,
      tags: r.tags,
      shutterDefault: shutterMeta ? (shutterMeta.config as ShutterConfig) : null,
      lightDefault: lightMeta ? (lightMeta.config as LightConfig) : null,
      shutterTree: [],
      lightTree: [],
    })
  }

  // Per-room node maps for deduplication while building the tree
  const shutterNodeMaps = new Map<string, Map<string, ShutterTreeNode>>()
  const lightNodeMaps = new Map<string, Map<string, LightTreeNode>>()

  function getShutterNode(roomName: string, ohNode: OHItem): ShutterTreeNode {
    if (!shutterNodeMaps.has(roomName)) shutterNodeMaps.set(roomName, new Map())
    const nodeMap = shutterNodeMaps.get(roomName)!
    if (!nodeMap.has(ohNode.name)) {
      const m = ohNode.metadata?.ShutterAutomation
      nodeMap.set(ohNode.name, {
        name: ohNode.name,
        label: ohNode.label ?? ohNode.name,
        metadata: m ? (m.config as ShutterConfig) : null,
        children: [],
        items: [],
      })
    }
    return nodeMap.get(ohNode.name)!
  }

  function getLightNode(roomName: string, ohNode: OHItem): LightTreeNode {
    if (!lightNodeMaps.has(roomName)) lightNodeMaps.set(roomName, new Map())
    const nodeMap = lightNodeMaps.get(roomName)!
    if (!nodeMap.has(ohNode.name)) {
      const m = ohNode.metadata?.LightAutomation
      nodeMap.set(ohNode.name, {
        name: ohNode.name,
        label: ohNode.label ?? ohNode.name,
        metadata: m ? (m.config as LightConfig) : null,
        children: [],
        items: [],
      })
    }
    return nodeMap.get(ohNode.name)!
  }

  // ── Shutters ──────────────────────────────────────────────────────────────
  const shutterControls = items.filter(
    (i) =>
      i.type === 'Rollershutter' &&
      i.name.endsWith('_Steuerung') &&
      !i.name.includes('Proxy') &&
      !i.name.includes('Automation')
  )

  for (const item of shutterControls) {
    const { loc, chain } = resolveEquipmentChain(item)
    if (!loc) continue
    const room = roomMap.get(loc.name)
    if (!room) continue

    // Build/retrieve tree nodes for each chain entry
    const nodes = chain.map((n) => getShutterNode(loc.name, n))

    // Wire parent-child: chain[i] is child of chain[i+1]
    for (let i = 0; i < nodes.length - 1; i++) {
      const child = nodes[i], parent = nodes[i + 1]
      if (!parent.children.some((c) => c.name === child.name)) parent.children.push(child)
    }

    // Determine item metadata (item-level → location fallback)
    const rawMeta = item.metadata?.ShutterAutomation
    let shutterMeta: ShutterConfig | null = rawMeta ? (rawMeta.config as ShutterConfig) : null
    let fromLocation = false
    if (!shutterMeta) {
      const locMeta = loc.metadata?.ShutterAutomation
      if (locMeta) { shutterMeta = locMeta.config as ShutterConfig; fromLocation = true }
    }

    const shutter: ShutterItem = {
      name: item.name,
      label: item.label ?? item.name,
      locationName: loc.name,
      metadata: shutterMeta,
      metadataFromLocation: fromLocation,
    }
    // Item belongs to its direct equipment (chain[0])
    nodes[0].items.push(shutter)

    // Root node (chain[last]) goes into room.shutterTree
    const rootNode = nodes[nodes.length - 1]
    if (!room.shutterTree.some((n) => n.name === rootNode.name)) room.shutterTree.push(rootNode)
  }

  // ── Lights ────────────────────────────────────────────────────────────────
  const lightControls = items.filter(
    (i) =>
      LIGHT_CONTROL_TYPES.has(i.type) &&
      i.tags.includes('Light') &&
      i.tags.includes('Control')
  )

  for (const item of lightControls) {
    const { loc, chain } = resolveEquipmentChain(item)
    if (!loc) continue
    const room = roomMap.get(loc.name)
    if (!room) continue

    const nodes = chain.map((n) => getLightNode(loc.name, n))

    for (let i = 0; i < nodes.length - 1; i++) {
      const child = nodes[i], parent = nodes[i + 1]
      if (!parent.children.some((c) => c.name === child.name)) parent.children.push(child)
    }

    const rawMeta = item.metadata?.LightAutomation
    let lightMeta: LightConfig | null = rawMeta ? (rawMeta.config as LightConfig) : null
    let fromLocation = false
    if (!lightMeta) {
      const chainMeta = chain.map((n) => n.metadata?.LightAutomation).find(Boolean)
      if (chainMeta) { lightMeta = chainMeta.config as LightConfig; fromLocation = true }
      else {
        const locMeta = loc.metadata?.LightAutomation
        if (locMeta) { lightMeta = locMeta.config as LightConfig; fromLocation = true }
      }
    }

    const light: LightItem = {
      name: item.name,
      label: item.label ?? item.name,
      locationName: loc.name,
      metadata: lightMeta,
      metadataFromLocation: fromLocation,
    }
    nodes[0].items.push(light)

    const rootNode = nodes[nodes.length - 1]
    if (!room.lightTree.some((n) => n.name === rootNode.name)) room.lightTree.push(rootNode)
  }

  // Sort rooms; keep only rooms with content
  return [...roomMap.values()]
    .filter((r) => r.shutterTree.length > 0 || r.lightTree.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export async function saveMetadata(
  itemName: string,
  namespace: 'ShutterAutomation' | 'LightAutomation',
  config: Record<string, string>
): Promise<void> {
  // Strip empty strings
  const cleaned = Object.fromEntries(
    Object.entries(config).filter(([, v]) => v !== undefined && v !== '')
  )
  const res = await fetch(`${BASE}/items/${itemName}/metadata/${namespace}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 'enabled', config: cleaned }),
  })
  if (!res.ok) throw new Error(`Failed to save metadata: HTTP ${res.status}`)
}

export async function deleteMetadata(
  itemName: string,
  namespace: 'ShutterAutomation' | 'LightAutomation'
): Promise<void> {
  const res = await fetch(`${BASE}/items/${itemName}/metadata/${namespace}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Failed to delete metadata: HTTP ${res.status}`)
}

export interface GlobalDefaults {
  shutterConfig: ShutterConfig | null
  lightConfig: LightConfig | null
}

export async function fetchGlobalDefaults(): Promise<GlobalDefaults> {
  try {
    const item: OHItem = await fetchJSON(
      `/items/${GLOBAL_DEFAULTS_ITEM}?metadata=ShutterAutomation,LightAutomation`
    )
    const s = item.metadata?.ShutterAutomation
    const l = item.metadata?.LightAutomation
    return {
      shutterConfig: s ? (s.config as ShutterConfig) : null,
      lightConfig: l ? (l.config as LightConfig) : null,
    }
  } catch {
    return { shutterConfig: null, lightConfig: null }
  }
}
