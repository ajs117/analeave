import React, { useEffect, useMemo, useState } from 'react'
import LeaveForm from './components/LeaveForm'
import Summary from './components/Summary'
import SyncPanel from './components/SyncPanel'
import YearCalendar from './components/YearCalendar'
import { addLeaveEntry, formatDate, parseLocalISO, workingDaysInRange } from './utils/leaveService'
import useGistSync from './utils/useGistSync'

const emptyDraft = { person: 'both', start: '', end: '', note: '', picking: false }

const STATUS_STYLES = {
  saved: 'bg-emerald-500/20 text-emerald-100',
  saving: 'bg-sky-500/20 text-sky-100',
  loading: 'bg-sky-500/20 text-sky-100',
  conflict: 'bg-amber-500/30 text-amber-100',
  error: 'bg-rose-600/40 text-rose-100',
  readonly: 'bg-slate-500/30 text-slate-100',
  local: 'bg-slate-500/30 text-slate-100',
  idle: 'bg-slate-500/30 text-slate-100',
}

export default function App(){
  const sync = useGistSync()
  const { data, editData, status, conflict, resolveConflict } = sync
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [draft, setDraft] = useState(emptyDraft)
  const [showSync, setShowSync] = useState(() => !sync.config?.token)

  const updateDraft = (patch) => setDraft(d => ({ ...d, ...patch, picking: false }))

  const pickDay = (iso) => {
    setDraft(d => {
      if(!d.start || !d.picking) return { ...d, start: iso, end: iso, picking: true }
      if(iso < d.start) return { ...d, start: iso, end: d.start, picking: false }
      return { ...d, end: iso, picking: false }
    })
  }

  const draftWorkingDays = useMemo(
    () => draft.start && draft.end ? workingDaysInRange(draft.start, draft.end) : 0,
    [draft.start, draft.end]
  )

  const addDraft = () => {
    if(!draft.start || !draft.end) return
    const people = draft.person === 'both' ? ['me', 'wife'] : [draft.person]
    const entries = people.map(p => addLeaveEntry(p, draft.start, draft.end, draft.note))
    editData(prev => ({ ...prev, entries: [...prev.entries, ...entries] }))
    setDraft(d => ({ ...emptyDraft, person: d.person }))
  }

  const yearsAvailable = useMemo(()=>{
    const yrs = new Set([2025,2026,2027,2028])
    data.entries.forEach(e=>{
      yrs.add(parseLocalISO(e.start).getFullYear())
      yrs.add(parseLocalISO(e.end).getFullYear())
    })
    return Array.from(yrs).sort()
  }, [data.entries])

  useEffect(()=>{
    if(!yearsAvailable.includes(year)) setYear(yearsAvailable[0] || new Date().getFullYear())
  }, [yearsAvailable, year])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className={`max-w-screen-2xl mx-auto px-4 md:px-6 pt-safe space-y-6 ${draft.start ? 'pb-36' : 'pb-10'}`}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">Annual leave, carryover, and bank holidays</p>
            <h1 className="text-3xl font-bold text-white">Analeave</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={()=>setShowSync(v=>!v)}
              className={`pill ${STATUS_STYLES[status.state] || STATUS_STYLES.idle}`}>
              {status.message || 'Sync'}
            </button>
            <select className="input w-28" aria-label="Calendar year" value={year} onChange={e=>setYear(parseInt(e.target.value,10))}>
              {yearsAvailable.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </header>

        {conflict && (
          <div className="glass-card border-amber-400/40 flex flex-wrap items-center justify-between gap-3">
            <span className="text-amber-100">Leave data was changed on another device since this one last synced.</span>
            <div className="flex gap-2">
              <button className="btn-secondary" type="button" onClick={()=>resolveConflict('theirs')}>Use the other device's</button>
              <button className="btn-secondary" type="button" onClick={()=>resolveConflict('mine')}>Keep this device's</button>
            </div>
          </div>
        )}

        {showSync && <SyncPanel sync={sync} onClose={()=>setShowSync(false)} />}

        <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] items-start">
          <div className="space-y-5">
            <LeaveForm draft={draft} onChange={updateDraft} onSubmit={addDraft} setYear={setYear} workingDays={draftWorkingDays} />
            <Summary data={data} setData={editData} year={year} />
          </div>
          <div className="w-full">
            <YearCalendar data={data} year={year} selection={draft} onPickDay={pickDay} />
          </div>
        </div>
      </div>

      {draft.start && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-900/95 backdrop-blur pb-safe">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
            <div className="text-sm text-white min-w-0 flex-1">
              <div className="font-semibold">{formatDate(draft.start)} → {formatDate(draft.end)}</div>
              <div className="text-slate-300">
                {draftWorkingDays} working day{draftWorkingDays === 1 ? '' : 's'}
                {draft.picking ? ' · tap the last day' : ''}
              </div>
            </div>
            <select className="input w-32" aria-label="Who" value={draft.person} onChange={e=>setDraft(d=>({ ...d, person: e.target.value }))}>
              <option value="both">Both</option>
              <option value="me">Me</option>
              <option value="wife">Wife</option>
            </select>
            <button type="button" className="btn-secondary" onClick={()=>setDraft(d=>({ ...emptyDraft, person: d.person }))}>Clear</button>
            <button type="button" className="btn-primary" onClick={addDraft}>Add leave</button>
          </div>
        </div>
      )}
    </div>
  )
}
