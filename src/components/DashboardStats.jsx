export function DashboardStats({ stats, activeFilter, onSelectFilter }) {
  if (!stats) return null

  const pipeline = [
    {
      id: 'active',
      label: 'Active Queue',
      value: stats.totalActive,
      filter: { status: 'active', timeframe: 'all', priority: 'all' },
      isActive: activeFilter.status === 'active',
      color: 'var(--text)',
    },
    {
      id: 'awaiting_print',
      label: 'Awaiting Print',
      value: stats.awaitingPrint || 0,
      filter: { status: 'order_received', timeframe: 'all', priority: 'all' },
      isActive: activeFilter.status === 'order_received',
      color: '#8b94a3',
    },
    {
      id: 'printing',
      label: 'Printing',
      value: stats.printing || 0,
      filter: { status: 'waiting_to_start', timeframe: 'all', priority: 'all' },
      isActive: activeFilter.status === 'waiting_to_start',
      color: '#38bdf8',
    },
    {
      id: 'painting',
      label: 'Painting',
      value: stats.paintingInProgress,
      filter: { status: 'painting_in_progress', timeframe: 'all', priority: 'all' },
      isActive: activeFilter.status === 'painting_in_progress',
      color: 'var(--teal)',
    },
    {
      id: 'ready',
      label: 'Ready to Deliver',
      value: stats.readyForDelivery,
      filter: { status: 'ready_for_delivery', timeframe: 'all', priority: 'all' },
      isActive: activeFilter.status === 'ready_for_delivery',
      color: '#34d399',
    },
    {
      id: 'completed',
      label: 'Fulfilled',
      value: stats.completed,
      filter: { status: 'delivered_completed', timeframe: 'all', priority: 'all' },
      isActive: activeFilter.status === 'delivered_completed',
      color: '#10b981',
    },
  ]

  const urgency = [
    {
      id: 'express',
      label: 'Express',
      badge: '⚡',
      value: stats.express,
      filter: { priority: 'express', status: 'all', timeframe: 'all' },
      isActive: activeFilter.priority === 'express',
      color: 'var(--accent)',
      tagClass: 'urgency-express',
    },
    {
      id: 'dueToday',
      label: 'Due Today',
      badge: '📅',
      value: stats.dueToday,
      filter: { timeframe: 'due_today', status: 'all', priority: 'all' },
      isActive: activeFilter.timeframe === 'due_today',
      color: '#f59e0b',
      tagClass: 'urgency-today',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      badge: '⚠️',
      value: stats.overdue,
      filter: { timeframe: 'overdue', status: 'all', priority: 'all' },
      isActive: activeFilter.timeframe === 'overdue',
      color: 'var(--danger)',
      tagClass: stats.overdue > 0 ? 'urgency-overdue-alert' : 'urgency-overdue',
      hasAlert: stats.overdue > 0,
    },
    {
      id: 'due3Days',
      label: 'Next 3 Days',
      badge: '⏳',
      value: stats.dueWithin3Days,
      filter: { timeframe: 'due_in_3_days', status: 'all', priority: 'all' },
      isActive: activeFilter.timeframe === 'due_in_3_days',
      color: '#60a5fa',
      tagClass: 'urgency-upcoming',
    },
  ]

  return (
    <section className="kpi-deck" aria-label="Order statistics overview">
      {/* Pipeline Stages Group */}
      <div className="kpi-group pipeline-group">
        <div className="kpi-group-header">
          <span className="kpi-group-dot" />
          <span>Production Pipeline</span>
        </div>
        <div className="kpi-group-items">
          {pipeline.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`kpi-chip ${item.isActive ? 'kpi-chip-active' : ''}`}
              onClick={() => onSelectFilter(item.filter)}
              title={`Filter by ${item.label}`}
            >
              <span className="kpi-chip-val" style={{ color: item.color }}>
                {item.value}
              </span>
              <span className="kpi-chip-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Deadlines & Priority Attention Group */}
      <div className="kpi-group attention-group">
        <div className="kpi-group-header">
          <span className="kpi-group-dot dot-urgent" />
          <span>Deadlines &amp; Priority</span>
        </div>
        <div className="kpi-group-items">
          {urgency.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`kpi-chip ${item.tagClass} ${item.isActive ? 'kpi-chip-active' : ''} ${item.hasAlert ? 'pulse-alert' : ''}`}
              onClick={() => onSelectFilter(item.filter)}
              title={`Filter by ${item.label}`}
            >
              <span className="kpi-chip-icon">{item.badge}</span>
              <span className="kpi-chip-val" style={{ color: item.color }}>
                {item.value}
              </span>
              <span className="kpi-chip-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
