import React from 'react'
import { parseLocalISO } from '../utils/leaveService'

export default function LeaveForm({ draft, onChange, onSubmit, setYear, workingDays }){
  const { person, start, end, note } = draft

  const changeStart = (value)=>{
    onChange({ start: value, end: !end || (value && end < value) ? value : end })
    if(value) setYear(parseLocalISO(value).getFullYear())
  }

  const submit = (e)=>{
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={submit} className="glass-card space-y-4">
      <div className="flex items-center gap-2">
        <span className="pill bg-blue-500/20 text-blue-200">Planner</span>
        <h2 className="section-title">Add Leave</h2>
      </div>
      <p className="text-xs text-slate-400">Or tap the first and last day on the calendar.</p>

      <label className="block text-sm text-slate-200">Who
        <select className="input mt-1" value={person} onChange={e=>onChange({ person: e.target.value })}>
          <option value="both">Both (default)</option>
          <option value="me">Me</option>
          <option value="wife">Wife</option>
        </select>
      </label>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <label className="block text-sm text-slate-200">Start
          <input className="input mt-1" type="date" value={start} onChange={e=>changeStart(e.target.value)} />
        </label>
        <label className="block text-sm text-slate-200">End
          <input className="input mt-1" type="date" value={end} min={start || undefined} onChange={e=>onChange({ end: e.target.value })} />
        </label>
      </div>

      <label className="block text-sm text-slate-200">Note
        <input className="input mt-1" value={note} onChange={e=>onChange({ note: e.target.value })} placeholder="Trip, event, etc." />
      </label>

      <div className="flex items-center justify-between text-sm text-slate-200">
        <span>Working days: <strong>{workingDays}</strong></span>
        <span className="text-slate-400">Excludes weekends and UK bank holidays</span>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={!start || !end}>Add Leave</button>
    </form>
  )
}
