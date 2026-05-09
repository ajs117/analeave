import React, { useMemo, useState } from 'react'
import { computeBalances, computeFortnightlyBalanceTimeline, formatDate, getAdjustmentRecord, upsertAdjustment, getEntryWorkingDays, defaultData } from '../utils/leaveService'

export default function Summary({ data, setData, year }){
  const balances = computeBalances(data, year)
  const fortnightly = useMemo(() => computeFortnightlyBalanceTimeline(data, 'me', year), [data, year])
  const [showDrawdown, setShowDrawdown] = useState(false)

  const remove = (id)=>{
    setData(prev => ({...prev, entries: prev.entries.filter(e=>e.id!==id)}))
  }

  const exportJSON = ()=>{
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='leave-data.json'; a.click()
  }

  const importJSON = (ev)=>{
    const f = ev.target.files[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const nextData = loadDataFromParsed(parsed)
        setData(nextData)
      } catch (_error) {
        // Keep the current data if the import is invalid.
      }
    }
    reader.readAsText(f)
  }

  const loadDataFromParsed = (parsed) => {
    const parsedPeople = parsed?.people || {}
    return {
      ...structuredClone(defaultData),
      ...parsed,
      people: {
        me: { ...defaultData.people.me, ...(parsedPeople.me || {}) },
        wife: { ...defaultData.people.wife, ...(parsedPeople.wife || {}) },
      },
      entries: parsed?.entries || [],
      adjustments: parsed?.adjustments || [],
    }
  }

  const updateAdjustment = (person, field, value)=>{
    setData(prev => {
      const year = balances[person].yearStartYear
      const record = getAdjustmentRecord(prev, person, year)
      const next = { ...record, [field]: Number(value) || 0 }
      return upsertAdjustment(prev, next)
    })
  }

  const caps = {
    me: { carry: data.people.me.carryOverLimit, earned: data.people.me.maxEarned },
    wife: { carry: data.people.wife.carryOverLimit, purchased: data.people.wife.maxPurchased }
  }

  return (
    <div className="glass-card space-y-4">
      <div className="flex items-center gap-2">
        <span className="pill bg-emerald-500/20 text-emerald-200">Balances</span>
        <h2 className="section-title">Summary</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.keys(balances).map(key=> (
          <div key={key} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold">{data.people[key].label}</span>
              {(() => {
                const rem = balances[key].remaining
                const base = key === 'me' ? 'pill bg-blue-500/20 text-blue-100' : 'pill bg-orange-500/20 text-orange-100'
                const neg = rem < 0 ? 'pill bg-rose-600 text-white' : base
                return <span className={neg}>{rem.toFixed(1)} days</span>
              })()}
            </div>
            <div className="text-xs text-slate-300">
              {balances[key].remainingHours.toFixed(1)} hours left at {balances[key].hoursPerDay.toFixed(1)}h/day
            </div>
            <div className="text-xs text-slate-400">Year {balances[key].yearStart} → {balances[key].yearEnd}</div>
            <div className="text-xs text-slate-300">Used: {balances[key].used.toFixed(1)} / Entitlement: {balances[key].entitlement.toFixed(1)}</div>
            <div className="text-xs text-amber-200">Must use: {balances[key].mustUse?.toFixed(1) ?? '0.0'} days</div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-200">
              <div>
                <div>Carry</div>
                {(() => {
                  const record = getAdjustmentRecord(data, key, balances[key].yearStartYear)
                  const hasAdj = (data.adjustments || []).some(a => a.person === key && a.year === balances[key].yearStartYear)
                  const displayVal = hasAdj ? record.carryOver : balances[key].carry
                  return (
                    <input className="input mt-1" type="number" step="0.5" min="0"
                      value={displayVal}
                      onChange={e=>updateAdjustment(key,'carryOver', e.target.value)}
                      title={`Up to ${caps[key].carry ?? 'n/a'}`}
                    />
                  )
                })()}
              </div>
              <div>
                <div>{key==='me' ? 'Earned' : 'Purchased'}</div>
                <input className="input mt-1" type="number" step="0.5" min="0"
                  value={key==='me'
                    ? getAdjustmentRecord(data, key, balances[key].yearStartYear).earned
                    : getAdjustmentRecord(data, key, balances[key].yearStartYear).purchased}
                  onChange={e=> key==='me'
                    ? updateAdjustment(key,'earned', e.target.value)
                    : updateAdjustment(key,'purchased', e.target.value)}
                  title={key==='me' ? `Earn up to ${caps[key].earned ?? 'n/a'}` : `Buy up to ${caps[key].purchased ?? 'n/a'}`}
                />
              </div>
              <div>
                <div className="text-slate-400">Adj total</div>
                <div className="mt-2 text-sm font-semibold text-white">{key==='me'
                  ? (balances[key].carry + balances[key].earned).toFixed(1)
                  : (balances[key].carry + balances[key].purchased).toFixed(1)
                }</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="section-title">Entries</h3>
        <div className="flex flex-wrap gap-2 justify-end">
          <button className="btn-secondary" type="button" onClick={()=>setShowDrawdown(v=>!v)}>
            {showDrawdown ? 'Hide drawdown' : 'Show drawdown'}
          </button>
          <button className="btn-secondary" onClick={exportJSON}>Export</button>
          <label className="btn-secondary cursor-pointer">
            Import <input className="hidden" type="file" onChange={importJSON} />
          </label>
        </div>
      </div>

      <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {data.entries.length === 0 && (
          <li className="text-slate-400 text-sm">No leave added yet.</li>
        )}
        {data.entries.map(e=> (
          <li key={e.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <div>
              <div className="text-sm text-white font-semibold flex items-center gap-2">
                <span className={e.person==='me' ? 'pill bg-blue-500/20 text-blue-100' : 'pill bg-orange-500/20 text-orange-100'}>{data.people[e.person].label}</span>
                <span>{formatDate(e.start)} → {formatDate(e.end)}</span>
                <span className="text-slate-300">({getEntryWorkingDays(e)}d)</span>
              </div>
              {e.note && <div className="text-xs text-slate-300 mt-1">{e.note}</div>}
            </div>
            <button className="text-rose-300 text-sm hover:text-rose-200" onClick={()=>remove(e.id)}>Delete</button>
          </li>
        ))}
      </ul>

      {showDrawdown && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <span className="pill bg-violet-500/20 text-violet-100">Hidden</span>
            <h3 className="section-title">Fortnightly Balance</h3>
          </div>
          <p className="text-sm text-slate-300">
            Me: opening carry-over plus 1/26 of the annual allowance every 2 weeks, shown in hours after leave is deducted.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="pill bg-blue-500/20 text-blue-100">Me</span>
              <span className="text-xs text-slate-400">Opening carry-over: {fortnightly.openingHours.toFixed(1)} hours</span>
            </div>

            <div className="text-xs text-slate-300">
              Base accrual: {fortnightly.accrualHoursPerPeriod.toFixed(2)} hours every 2 weeks at {fortnightly.hoursPerDay.toFixed(1)}h/day.
            </div>

            {fortnightly.periods.length === 0 ? (
              <div className="text-sm text-slate-400">No pay periods were generated for this leave year.</div>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {fortnightly.periods.map(period => (
                  <li key={period.index} className="rounded-md border border-white/10 bg-slate-950/20 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-white font-medium">Period {period.index}: {formatDate(period.start)} → {formatDate(period.end)}</span>
                      <span className="text-slate-300">{period.closingHours.toFixed(1)} hours left</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-3">
                      <span>Opening: {period.openingHours.toFixed(1)}h</span>
                      <span>+ Accrual: {period.accrualHours.toFixed(1)}h</span>
                      <span>- Leave: {period.usedHours.toFixed(1)}h ({period.usedDays.toFixed(1)}d)</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-xs text-slate-400">
              Closing balance: {fortnightly.closingHours.toFixed(1)} hours
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
