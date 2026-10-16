import { supabase, isConfigured } from '../supabase'

const HISTORY_TABLE = 'order_history'

// In-memory fallback for offline/preview mode
const localHistoryStore = new Map()

/**
 * Records an entry in the order history audit log.
 */
export async function logOrderChange({
  saleId,
  fieldChanged,
  oldValue,
  newValue,
  notes = '',
  user = null,
}) {
  const operator =
    user?.email?.split('@')[0] || user?.user_metadata?.username || 'Operator'

  const entry = {
    id: crypto.randomUUID(),
    sale_id: saleId,
    field_changed: fieldChanged,
    old_value: oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
    new_value: newValue !== undefined && newValue !== null ? String(newValue) : null,
    notes: notes || '',
    changed_by: operator,
    created_at: new Date().toISOString(),
  }

  // Always keep in local store for rapid optimistic rendering
  const existing = localHistoryStore.get(saleId) || []
  localHistoryStore.set(saleId, [entry, ...existing])

  if (isConfigured) {
    try {
      const { error } = await supabase.from(HISTORY_TABLE).insert(entry)
      if (error) {
        console.warn('Could not persist history to Supabase:', error.message)
      }
    } catch (err) {
      console.warn('History audit insert failed:', err)
    }
  }

  return entry
}

/**
 * Loads chronological order history for a specific order.
 */
export async function fetchOrderHistory(saleId) {
  if (!saleId) return []

  const localEntries = localHistoryStore.get(saleId) || []

  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from(HISTORY_TABLE)
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        // Merge Supabase entries with any local-only entries without duplicating IDs
        const ids = new Set(data.map((d) => d.id))
        const merged = [
          ...data,
          ...localEntries.filter((e) => !ids.has(e.id)),
        ]
        return merged.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
      }
    } catch (err) {
      console.warn('Failed to fetch history from Supabase:', err)
    }
  }

  return localEntries
}
