'use client'

const typeLabels = {
  admin: 'Admin',
  master: 'Master',
  broker_group: 'Broker Group',
  trading_id: 'Trading ID',
}

function Node({ entity, allEntities }) {
  const children = allEntities.filter((e) => e.parent_id === entity.id)

  return (
    <div>
      <div className="tree-row">
        <span className={`badge badge-${entity.type}`}>{typeLabels[entity.type]}</span>
        <span className="tree-name">{entity.name}</span>
        {entity.id_number && <span className="tree-meta">#{entity.id_number}</span>}
        {entity.current_percentage !== null && (
          <span className="tree-pct">{entity.current_percentage}%</span>
        )}
      </div>
      {children.length > 0 && (
        <div className="tree-node">
          {children.map((child) => (
            <Node key={child.id} entity={child} allEntities={allEntities} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function EntityTree({ entities }) {
  const topLevel = entities.filter((e) => !e.parent_id)

  if (topLevel.length === 0) {
    return <div className="empty-state">Abhi koi entity nahi hai. Upar form se pehla Admin banayein.</div>
  }

  return (
    <div>
      {topLevel.map((e) => (
        <Node key={e.id} entity={e} allEntities={entities} />
      ))}
    </div>
  )
}
