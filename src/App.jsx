import React, { useEffect, useMemo, useState } from 'react'
import LeaveForm from './components/LeaveForm'
import Summary from './components/Summary'
import YearCalendar from './components/YearCalendar'
import { loadData, saveData } from './utils/leaveService'

export default function App(){
  const [data, setData] = useState(() => loadData())
  const [year, setYear] = useState(() => new Date().getFullYear())

  useEffect(()=>{ saveData(data) }, [data])

  const yearsAvailable = useMemo(()=>{
    const preset = [2025,2026,2027,2028]
    const yrs = new Set(preset)
    data.entries.forEach(e=>{
      yrs.add(new Date(e.start).getFullYear())
      yrs.add(new Date(e.end).getFullYear())
    })
    return Array.from(yrs).sort()
  }, [data.entries])

  useEffect(()=>{
    if(!yearsAvailable.includes(year)){
      setYear(yearsAvailable[0] || new Date().getFullYear())
    }
  }, [yearsAvailable, year])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-10 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">Annual leave, carryover, and bank holidays</p>
            <h1 className="text-3xl font-bold text-white">Analeave</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-200">Calendar year</label>
            <select className="input w-32" value={year} onChange={e=>setYear(parseInt(e.target.value,10))}>
              {yearsAvailable.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] items-start">
          <div className="space-y-5">
            <LeaveForm data={data} setData={setData} setYear={setYear} />
            <Summary data={data} setData={setData} year={year} />
          </div>
          <div className="w-full">
            <YearCalendar data={data} year={year} />
          </div>
        </div>

        <footer className="text-slate-400 text-sm">
          Data stays in your browser (localStorage). Export/Import in Summary to back up.
        </footer>
      </div>
    </div>
  )
}
