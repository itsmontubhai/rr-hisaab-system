// Trading ID ke profit/loss ko poori chain mein distribute karne ka logic

export function getAncestorChain(entity, allEntities) {
  const chain = []
  let current = entity
  while (current.parent_id) {
    const parent = allEntities.find((e) => e.id === current.parent_id)
    if (!parent) break
    chain.push(parent)
    current = parent
  }
  return chain // [immediate parent, ..., topmost admin]
}

export function calculateDistribution(tradingIdEntity, amount, allEntities, percentHistory, partnerAllocations, partners) {
  const chain = getAncestorChain(tradingIdEntity, allEntities)
  const master = chain.find((e) => e.type === 'master')
  const admin = chain.find((e) => e.type === 'admin')

  function currentPct(entityId) {
    const match = percentHistory.find((h) => h.entity_id === entityId && !h.effective_to)
    return match ? parseFloat(match.percentage) : 0
  }

  const clientPct = currentPct(tradingIdEntity.id)
  const masterPct = master ? currentPct(master.id) : 0
  const adminPct = admin ? currentPct(admin.id) : 0

  // Partners: Master-level fixed (applies to all under it) + Trading ID specific extra
  const relevantAllocations = partnerAllocations.filter(
    (a) => !a.effective_to && (a.entity_id === tradingIdEntity.id || (master && a.entity_id === master.id))
  )
  const partnerLines = relevantAllocations.map((a) => ({
    partnerId: a.partner_id,
    partnerName: partners.find((p) => p.id === a.partner_id)?.name || 'Partner',
    percentage: parseFloat(a.percentage),
    amount: (amount * parseFloat(a.percentage)) / 100,
  }))
  const partnersTotalPct = partnerLines.reduce((s, p) => s + p.percentage, 0)

  const companyPct = 100 - clientPct - masterPct - adminPct - partnersTotalPct

  const lines = []
  lines.push({ entityId: tradingIdEntity.id, name: tradingIdEntity.name, role: 'Client', percentage: clientPct, amount: (amount * clientPct) / 100 })
  if (master) lines.push({ entityId: master.id, name: master.name, role: 'Master', percentage: masterPct, amount: (amount * masterPct) / 100 })
  if (admin) lines.push({ entityId: admin.id, name: admin.name, role: 'Admin', percentage: adminPct, amount: (amount * adminPct) / 100 })
  partnerLines.forEach((p) => lines.push({ partnerId: p.partnerId, name: p.partnerName, role: 'Partner', percentage: p.percentage, amount: p.amount }))
  lines.push({ entityId: null, partnerId: null, name: 'Company', role: 'Company', percentage: companyPct, amount: (amount * companyPct) / 100 })

  return lines
}
