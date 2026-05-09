import { getHolidays } from '../data/holidays'

// Simple id generator
const id = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2,8)

export const defaultData = {
  people: {
    me: { label: 'Me', yearStartMonth: 9, entitlement:25, carryOverLimit:5, maxEarned:5, region:'UK', hoursPerDay: 7.5 },
    wife: { label: 'Wife', yearStartMonth: 1, entitlement:25, carryOverLimit:5, maxPurchased:15, region:'HK', hoursPerDay: 8 }
  },
  entries: [],
  adjustments: [] // per person per leave-year: carryOver, purchased, earned
}

export function loadData(){
  try{
    const raw = localStorage.getItem('ana-leave')
    if(!raw) return structuredClone(defaultData)
    const parsed = JSON.parse(raw)
    const parsedPeople = parsed.people || {}
    return {
      ...defaultData,
      ...parsed,
      people: {
        me: { ...defaultData.people.me, ...(parsedPeople.me || {}) },
        wife: { ...defaultData.people.wife, ...(parsedPeople.wife || {}) },
      },
      entries: parsed.entries || [],
      adjustments: parsed.adjustments || []
    }
  }catch(e){
    return structuredClone(defaultData)
  }
}

export function saveData(data){ localStorage.setItem('ana-leave', JSON.stringify(data)) }

export function addLeaveEntry(person, start, end, note=''){
  return { id: id(), person, start, end, note }
}

export function formatDate(d){
  try{ return new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' }) }
  catch(_){ return d }
}

function dateToLocalISO(date){
  const y = date.getFullYear()
  const m = String(date.getMonth()+1).padStart(2,'0')
  const d = String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}

export function getYearWindow(startMonth, today = new Date()){
  const yearStart = new Date(today.getFullYear(), startMonth-1, 1)
  if(today < yearStart) yearStart.setFullYear(yearStart.getFullYear()-1)
  const yearEnd = new Date(yearStart)
  yearEnd.setFullYear(yearEnd.getFullYear()+1)
  yearEnd.setDate(yearEnd.getDate()-1)
  return { yearStart, yearEnd }
}

export function getYearWindowForView(startMonth, viewYear){
  // Determine the leave year window that contains Jan 1 of viewYear
  const jan1 = new Date(viewYear, 0, 1)
  let candidate = new Date(viewYear, startMonth-1, 1)
  if(candidate > jan1) candidate.setFullYear(candidate.getFullYear() - 1)
  const yearStart = new Date(candidate)
  const yearEnd = new Date(yearStart)
  yearEnd.setFullYear(yearEnd.getFullYear()+1)
  yearEnd.setDate(yearEnd.getDate()-1)
  return { yearStart, yearEnd }
}

export function getAdjustmentRecord(data, person, yearStartYear){
  const existing = (data.adjustments || []).find(a => a.person === person && a.year === yearStartYear)
  if(existing) return { ...existing }
  return { id: `${person}-${yearStartYear}`, person, year: yearStartYear, carryOver:0, purchased:0, earned:0 }
}

export function upsertAdjustment(data, record){
  const without = (data.adjustments || []).filter(a => !(a.person === record.person && a.year === record.year))
  return { ...data, adjustments: [...without, { ...record }] }
}

export function countWorkingDays(startISO, endISO, holidays=[]){
  const s = new Date(startISO), e = new Date(endISO)
  let days = 0
  for(let d = new Date(s); d <= e; d.setDate(d.getDate()+1)){
    const dow = d.getDay()
    const iso = d.toISOString().slice(0,10)
    if(dow===0 || dow===6) continue
    if(holidays.includes(iso)) continue
    days++
  }
  return days
}

export function getHolidaysForRange(start, end, region){
  const s = new Date(start).getFullYear()
  const e = new Date(end).getFullYear()
  const set = new Set()
  for(let y=s; y<=e; y++){
    const list = getHolidays(y, region)
    list.forEach(d=>set.add(d))
  }
  return Array.from(set)
}

export function getEntryWorkingDays(entry){
  return workingDaysInRange(entry.start, entry.end)
}

export function workingDaysInRange(startISO, endISO){
  const holidays = getHolidaysForRange(startISO, endISO, 'UK')
  return countWorkingDays(startISO, endISO, holidays)
}

export function computeBalances(data, viewYear = new Date().getFullYear()){
  const res = {}
  Object.keys(data.people).forEach(k=>{
    const p = data.people[k]
    const hoursPerDay = Number(p.hoursPerDay) || 8
    const { yearStart, yearEnd } = getYearWindowForView(p.yearStartMonth, viewYear)
    const yearStartYear = yearStart.getFullYear()

    const used = data.entries
      .filter(e=> e.person===k && !(new Date(e.end) < yearStart || new Date(e.start) > yearEnd))
      .reduce((s,e)=>{
        const sDate = new Date(e.start) < yearStart ? dateToLocalISO(yearStart) : e.start
        const eDate = new Date(e.end) > yearEnd ? dateToLocalISO(yearEnd) : e.end
        return s + workingDaysInRange(sDate, eDate)
      }, 0)
    const adj = getAdjustmentRecord(data, k, yearStartYear)
    const adjExists = (data.adjustments || []).some(a => a.person === k && a.year === yearStartYear)

    // compute previous leave-year window (immediate prior year)
    const prevStart = new Date(yearStart)
    prevStart.setFullYear(prevStart.getFullYear() - 1)
    const prevEnd = new Date(yearEnd)
    prevEnd.setFullYear(prevEnd.getFullYear() - 1)
    const prevYearNum = prevStart.getFullYear()

    const prevUsed = data.entries
      .filter(e=> e.person===k && !(new Date(e.end) < prevStart || new Date(e.start) > prevEnd))
      .reduce((s,e)=>{
        const sDate = new Date(e.start) < prevStart ? dateToLocalISO(prevStart) : e.start
        const eDate = new Date(e.end) > prevEnd ? dateToLocalISO(prevEnd) : e.end
        return s + workingDaysInRange(sDate, eDate)
      }, 0)

    const prevAdj = (data.adjustments || []).find(a => a.person === k && a.year === prevYearNum) || { carryOver:0, purchased:0, earned:0 }
    const prevCarry = clamp(prevAdj.carryOver, 0, p.carryOverLimit ?? prevAdj.carryOver)
    const prevPurchased = clamp(prevAdj.purchased, 0, p.maxPurchased ?? prevAdj.purchased)
    const prevEarned = clamp(prevAdj.earned, 0, p.maxEarned ?? prevAdj.earned)

    const prevEntitlement = p.entitlement + prevCarry + prevPurchased + prevEarned
    const prevRemaining = prevEntitlement - prevUsed

    let carry
    if(adjExists){
      carry = clamp(adj.carryOver, 0, p.carryOverLimit ?? adj.carryOver)
    } else {
      carry = clamp(prevRemaining, 0, p.carryOverLimit ?? prevRemaining)
    }

    const purchased = clamp(adj.purchased, 0, p.maxPurchased ?? adj.purchased)
    const earned = clamp(adj.earned, 0, p.maxEarned ?? adj.earned)

    const entitlement = p.entitlement + carry + purchased + earned
    const remaining = entitlement - used
    const entitlementHours = entitlement * hoursPerDay
    const usedHours = used * hoursPerDay
    const remainingHours = remaining * hoursPerDay

    const mustUse = Math.max(0, remaining - (p.carryOverLimit ?? 0))

    res[k] = {
      remaining,
      remainingHours,
      used,
      usedHours,
      entitlement,
      entitlementHours,
      carry,
      mustUse,
      purchased,
      earned,
      hoursPerDay,
      yearStart: dateToLocalISO(yearStart),
      yearEnd: dateToLocalISO(yearEnd),
      yearStartYear
    }
  })
  return res
}

export function computeDrawdownTimeline(data, viewYear = new Date().getFullYear()){
  const balances = computeBalances(data, viewYear)
  const result = {}

  Object.keys(data.people).forEach(person => {
    const balance = balances[person]
    const personData = data.people[person]
    const hoursPerDay = Number(personData.hoursPerDay) || 8
    const start = new Date(balance.yearStart)
    const end = new Date(balance.yearEnd)

    const relevantEntries = (data.entries || [])
      .filter(entry => entry.person === person && !(new Date(entry.end) < start || new Date(entry.start) > end))
      .map(entry => {
        const clippedStart = new Date(entry.start) < start ? dateToLocalISO(start) : entry.start
        const clippedEnd = new Date(entry.end) > end ? dateToLocalISO(end) : entry.end
        const days = workingDaysInRange(clippedStart, clippedEnd)
        return {
          id: entry.id,
          start: clippedStart,
          end: clippedEnd,
          note: entry.note || '',
          days,
          hours: days * hoursPerDay,
        }
      })
      .sort((left, right) => {
        const leftStart = new Date(left.start).getTime()
        const rightStart = new Date(right.start).getTime()
        if(leftStart !== rightStart) return leftStart - rightStart
        return new Date(left.end).getTime() - new Date(right.end).getTime()
      })

    let remainingHours = balance.entitlementHours
    const intervals = relevantEntries.map(entry => {
      remainingHours -= entry.hours
      return {
        ...entry,
        remainingHours,
      }
    })

    result[person] = {
      hoursPerDay,
      openingHours: balance.entitlementHours,
      intervals,
      closingHours: remainingHours,
    }
  })

  return result
}

function clamp(n, min, max){
  const num = Number.isFinite(n) ? n : 0
  if(max !== undefined && num > max) return max
  if(num < min) return min
  return num
}
