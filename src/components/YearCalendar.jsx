import React, { useMemo } from 'react'
import { getHolidays } from '../data/holidays'

const PERSON_COLORS = {
  me: 'bg-blue-500/80 border-blue-300/60',
  wife: 'bg-orange-500/80 border-orange-200/60'
}

function toIsoLocal(date){
  const y = date.getFullYear()
  const m = String(date.getMonth()+1).padStart(2,'0')
  const d = String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}

function expandEntriesByDay(entries, year){
  const map = new Map()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)

  entries.forEach(e => {
    const start = new Date(e.start)
    const end = new Date(e.end)
    if(end < yearStart || start > yearEnd) return

    const s = start < yearStart ? new Date(yearStart) : new Date(start)
    const en = end > yearEnd ? new Date(yearEnd) : new Date(end)

    for(let d = new Date(s); d <= en; d.setDate(d.getDate()+1)){
      const iso = toIsoLocal(d)
      if(!map.has(iso)) map.set(iso, new Set())
      map.get(iso).add(e.person)
    }
  })
  return map
}

function buildHolidaySet(year){
  const uk = getHolidays(year, 'UK') || []
  const hk = getHolidays(year, 'HK') || []
  return {
    UK: new Set(uk),
    HK: new Set(hk)
  }
}

const dayNames = ['Mo','Tu','We','Th','Fr','Sa','Su']

export default function YearCalendar({ data, year }){
  const leaveByDay = useMemo(()=> expandEntriesByDay(data.entries, year), [data.entries, year])
  const holidays = useMemo(()=> buildHolidaySet(year), [year])

  const months = Array.from({length:12}, (_,i)=> new Date(year, i, 1))

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="section-title">Full Year Calendar</div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-blue-300/60 bg-blue-500/80"></span> Me</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-orange-200/60 bg-orange-500/80"></span> Wife</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60"></span> UK holidays</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400/70"></span> HK holidays</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {months.map(m => (
          <MonthGrid key={m.getMonth()} monthDate={m} leaveByDay={leaveByDay} holidays={holidays} />
        ))}
      </div>
    </div>
  )
}

function MonthGrid({ monthDate, leaveByDay, holidays }){
  const month = monthDate.getMonth()
  const year = monthDate.getFullYear()
  const monthName = monthDate.toLocaleString('en', { month: 'long' })
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7 // shift so Monday is 0
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells = []
  for(let i=0;i<startDow;i++) cells.push(null)
  for(let d=1; d<=daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">{monthName}</span>
        <span className="text-xs text-slate-400">{year}</span>
      </div>
      <div className="grid grid-cols-7 text-[11px] text-slate-400 mb-1">
        {dayNames.map(d => <div key={d} className="text-center pb-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {cells.map((d, idx)=>{
          if(d===null) return <div key={`e-${idx}`} />
          const iso = isoFor(year, month, d)
          const people = leaveByDay.get(iso)
          const isUK = holidays.UK.has(iso)
          const isHK = holidays.HK.has(iso)
          const isBoth = isUK && isHK
          const isWeekend = isWeekendDay(year, month, d)

          let className = 'h-14 rounded-lg border text-center flex flex-col items-center justify-start pt-1 transition '
          className += isWeekend ? 'border-white/5 text-slate-500 bg-white/5 ' : 'border-white/10 bg-white/5 '

          return (
            <div key={iso} className={className} title={tooltip(iso, people, isUK, isHK, isBoth)}>
              <span className="text-xs font-semibold">{d}</span>

              <div className="flex flex-col items-center gap-1 w-full mt-1">
                {isUK && <span className="holiday-bar-uk"></span>}
                {isHK && <span className="holiday-bar-hk"></span>}
              </div>

              {people && (
                <div className="flex flex-col items-center gap-1 w-full mt-1">
                  {Array.from(people).map(p => (
                    <span key={p} className={p==='me' ? 'leave-bar-me' : 'leave-bar-wife'}></span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function isoFor(year, monthZero, day){
  return toIsoLocal(new Date(year, monthZero, day))
}

function isWeekendDay(year, monthZero, day){
  const dow = new Date(year, monthZero, day).getDay()
  return dow === 0 || dow === 6
}

function tooltip(iso, people, isUK, isHK, isBoth){
  const parts = [iso]
  if(people) parts.push('Leave: ' + Array.from(people).join(', '))
  if(isBoth) parts.push('UK & HK holiday')
  else {
    if(isUK) parts.push('UK holiday')
    if(isHK) parts.push('HK holiday')
  }
  return parts.join(' • ')
}
