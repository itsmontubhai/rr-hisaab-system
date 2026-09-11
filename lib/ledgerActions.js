import { calculateDistribution } from './calculate'

export async function postDraftToLedger(supabase, draft, weekDate, entities, percentHistory, partnerAllocations, partners) {
  const lines = calculateDistribution(draft.entity, parseFloat(draft.amount), entities, percentHistory, partnerAllocations, partners)

  async function getLatestBalance(entityId, partnerId) {
    let query = supabase.from('ledger').select('running_balance').order('created_at', { ascending: false }).limit(1)
    if (partnerId) query = query.eq('partner_id', partnerId)
    else query = query.eq('entity_id', entityId).is('partner_id', null)
    const { data } = await query
    return data && data.length ? parseFloat(data[0].running_balance) : 0
  }

  let companyEntity = entities.find((en) => en.type === 'company')

  for (const line of lines) {
    let entityId = line.entityId || null
    if (line.role === 'Company') {
      if (!companyEntity) {
        const { data: newCompany } = await supabase.from('entities').insert({ name: 'Company', type: 'company' }).select().single()
        companyEntity = newCompany
      }
      entityId = companyEntity.id
    }

    const prevBalance = await getLatestBalance(entityId, line.partnerId || null)
    const entryType = line.amount >= 0 ? 'credit' : 'debit'
    const newBalance = prevBalance + line.amount

    await supabase.from('ledger').insert({
      entity_id: line.partnerId ? null : entityId,
      partner_id: line.partnerId || null,
      entry_date: weekDate,
      description: `Week ${weekDate} — ${draft.entity.name} (${line.role})`,
      amount: Math.abs(line.amount),
      entry_type: entryType,
      running_balance: newBalance,
      source: 'auto',
      reference_id: draft.id,
    })
  }

  await supabase.from('weekly_pnl').update({ status: 'added_to_ledger' }).eq('id', draft.id)
  return companyEntity
}
