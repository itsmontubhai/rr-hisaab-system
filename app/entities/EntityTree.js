'use client'

const typeLabels = {
  admin: 'Admin',
  master: 'Master',
  broker_group: 'Broker Group',
  trading_id: 'Trading ID',
}

function Node({ entity, allEntities, onFocus }) {
  const children = allEntities.filter((e) => e.parent_id === entity.id)

  return (
    <div>
      <div className="tree-row">
        <span className={`badge badge-${entity.type}`}>{typeLabels[entity.type]}</span>
        <span className="tree-name tree-link" onClick={() => onFocus(entity.id)}>{entity.name}</span>
        {entity.id_number && <span className="tree-meta">#{entity.id_number}</span>}
        {entity.current_percentage !== null && (
          <span className="tree-pct">{entity.current_percentage}%</span>
        )}
      </div>
      {children.length > 0 && (
        <div className="tree-node">
          {children.map((child) => (
            <Node key={child.id} entity={child} allEntities={allEntities} onFocus={onFocus} />
          ))}
        </div>
      )}
    </div>
  )
}

function getAncestors(entity, allEntities) {
  const chain = []
  let current = entity
  while (current.parent_id) {
    const parent = allEntities.find((e) => e.id === current.parent_id)
    if (!parent) break
    chain.unshift(parent)
    current = parent
  }
  return chain
}

export default function EntityTree({ entities, focusId, onFocus }) {
  if (entities.length === 0) {
    return <div className="empty-state">Abhi koi entity nahi hai. Upar form se pehla Admin banayein.</div>
  }

  if (focusId) {
    const focusEntity = entities.find((e) => e.id === focusId)
    if (!focusEntity) return null
    const ancestors = getAncestors(focusEntity, entities)

    return (
      <div>
        <div className="breadcrumb">
          <span className="tree-link" onClick={() => onFocus(null)}>All entities</span>
          {ancestors.map((a) => (
            <span key={a.id}> / <span className="tree-link" onClick={() => onFocus(a.id)}>{a.name}</span></span>
          ))}
          <span> / {focusEntity.name}</span>
        </div>
        <Node entity={focusEntity} allEntities={entities} onFocus={onFocus} />
      </div>
    )
  }

  const topLevel = entities.filter((e) => !e.parent_id)

  return (
    <div>
      {topLevel.map((e) => (
        <Node key={e.id} entity={e} allEntities={entities} onFocus={onFocus} />
      ))}
    </div>
  )
}
