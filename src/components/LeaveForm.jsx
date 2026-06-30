import React, { useMemo, useState, useEffect } from 'react'
import { countWorkingDays, getHolidaysForRange, addLeaveEntry, parseLocalISO } from '../utils/leaveService'

export default function LeaveForm({ data, setData, setYear }){
  const [person, setPerson] = useState('both')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')

  // Only UK bank holidays reduce leave totals (HK is reference-only on the calendar),
  // so the working-day preview is the same regardless of who the leave is for.
  const workingDays = useMemo(()=>{
    if(!start || !end) return 0
    return countWorkingDays(start, end, getHolidaysForRange(start, end, 'UK'))
  }, [start,end])

  useEffect(()=>{
    if(!start) return
    // auto-set end if empty or before start
    if(!end || parseLocalISO(end) < parseLocalISO(start)) setEnd(start)
    // switch main calendar year to the start date's year to aid selection
    if(typeof setYear === 'function') setYear(parseLocalISO(start).getFullYear())
  }, [start])

  const submit = (e)=>{
    e.preventDefault()
    if(!start || !end) return
    const addForPerson = (who) => {
      // Store only inputs (person, start, end, note). Days are computed on-the-fly.
      return addLeaveEntry(who, start, end, note)
    }

    const nextEntries = person === 'both'
      ? [addForPerson('me'), addForPerson('wife')]
      : [addForPerson(person)]

    setData(prev => ({...prev, entries: [...prev.entries, ...nextEntries]}))
    setStart(''); setEnd(''); setNote('')
  }

  return (
    <form onSubmit={submit} className="glass-card space-y-4">
      <div className="flex items-center gap-2">
        <span className="pill bg-blue-500/20 text-blue-200">Planner</span>
        <h2 className="section-title">Add Leave</h2>
      </div>

      <label className="text-sm text-slate-200">Who
        <select className="input mt-1" value={person} onChange={e=>setPerson(e.target.value)}>
          <option value="both">Both (default)</option>
          <option value="me">Me</option>
          <option value="wife">Wife</option>
        </select>
      </label>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <label className="text-sm text-slate-200">Start
          <input className="input mt-1" type="date" value={start} onChange={e=>setStart(e.target.value)} />
        </label>
        <label className="text-sm text-slate-200">End
          <input className="input mt-1" type="date" value={end} onChange={e=>setEnd(e.target.value)} />
        </label>
      </div>

      <label className="text-sm text-slate-200">Note
        <input className="input mt-1" value={note} onChange={e=>setNote(e.target.value)} placeholder="Trip, event, etc." />
      </label>

      <div className="flex items-center justify-between text-sm text-slate-200">
        <span>Working days: <strong>{workingDays}</strong></span>
        <span className="text-slate-400">Excludes weekends and bank holidays</span>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary w-full">Add Leave</button>
      </div>
    </form>
  )
}
