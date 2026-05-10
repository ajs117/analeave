import React, { useEffect, useMemo, useRef, useState } from 'react'
import LeaveForm from './components/LeaveForm'
import Summary from './components/Summary'
import YearCalendar from './components/YearCalendar'
import { clearLinkedFileHandle, getLinkedFilePermission, loadData, loadLinkedFileHandle, readDataFromFile, saveDataToFileHandle, saveLinkedFileHandle, supportsLinkedFiles } from './utils/leaveService'

export default function App(){
  const [data, setData] = useState(() => loadData())
  const [year, setYear] = useState(() => new Date().getFullYear())
  const fileHandleRef = useRef(null)
  const [fileName, setFileName] = useState('No data file linked')
  const [fileStatus, setFileStatus] = useState('Choose or create a data file to enable autosave.')
  const [startupReady, setStartupReady] = useState(false)
  const linkedFilesSupported = supportsLinkedFiles()

  useEffect(()=>{
    let cancelled = false

    const restoreLinkedFile = async ()=>{
      if(!linkedFilesSupported){
        setFileStatus('This browser cannot remember a linked file. Use a Chromium browser for autoload and autosave.')
        setStartupReady(true)
        return
      }

      try{
        const handle = await loadLinkedFileHandle()
        if(!handle){
          setStartupReady(true)
          return
        }

        setFileName(handle.name || 'Linked data file')
        const permission = await getLinkedFilePermission(handle, { request: false, write: true })
        if(permission !== 'granted'){
          setFileStatus('Linked file found. Choose the file again to reconnect write access.')
          setStartupReady(true)
          return
        }

        const nextData = await readDataFromFile(await handle.getFile())
        if(cancelled) return

        fileHandleRef.current = handle
        setData(nextData)
        setFileStatus(`Autosaving to ${handle.name}.`)
      }catch(_error){
        await clearLinkedFileHandle().catch(() => {})
        if(cancelled) return
        fileHandleRef.current = null
        setFileName('No data file linked')
        setFileStatus('The linked file could not be reopened. Choose or create it again.')
      }finally{
        if(!cancelled) setStartupReady(true)
      }
    }

    void restoreLinkedFile()
    return ()=>{ cancelled = true }
  }, [linkedFilesSupported])

  useEffect(()=>{
    if(!startupReady || !fileHandleRef.current) return

    let cancelled = false
    const persist = async ()=>{
      try{
        const permission = await getLinkedFilePermission(fileHandleRef.current, { request: false, write: true })
        if(permission !== 'granted'){
          if(!cancelled) setFileStatus('Write access was lost. Choose the file again to resume autosave.')
          return
        }

        await saveDataToFileHandle(data, fileHandleRef.current)
        if(!cancelled) setFileStatus(`Autosaving to ${fileHandleRef.current.name}.`)
      }catch(_error){
        if(!cancelled) setFileStatus('Autosave failed. Choose the file again to reconnect it.')
      }
    }

    void persist()
    return ()=>{ cancelled = true }
  }, [data, startupReady])

  const linkFileHandle = async (handle, { loadContents } = { loadContents: true })=>{
    const permission = await getLinkedFilePermission(handle, { request: true, write: true })
    if(permission !== 'granted') return

    const nextData = loadContents ? await readDataFromFile(await handle.getFile()) : data

    fileHandleRef.current = handle
    await saveLinkedFileHandle(handle)
    setFileName(handle.name || 'Linked data file')
    setFileStatus(`Autosaving to ${handle.name}.`)
    if(loadContents) setData(nextData)
    else await saveDataToFileHandle(data, handle)
  }

  const openDataFile = async ()=>{
    if(!linkedFilesSupported) return
    try{
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Leave data', accept: { 'application/json': ['.json'] } }],
      })
      await linkFileHandle(handle, { loadContents: true })
    }catch(_error){}
  }

  const saveDataAs = async ()=>{
    if(!linkedFilesSupported) return
    try{
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName && fileName !== 'No data file linked' ? fileName : 'leave-data.json',
        types: [{ description: 'Leave data', accept: { 'application/json': ['.json'] } }],
      })
      await linkFileHandle(handle, { loadContents: false })
    }catch(_error){}
  }

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
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-200">Calendar year</label>
              <select className="input w-32" value={year} onChange={e=>setYear(parseInt(e.target.value,10))}>
                {yearsAvailable.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button className="btn-secondary" type="button" onClick={openDataFile} disabled={!linkedFilesSupported}>Choose file</button>
              <button className="btn-secondary" type="button" onClick={saveDataAs} disabled={!linkedFilesSupported}>Create file</button>
            </div>
            <div className="text-xs text-slate-400 text-left lg:text-right">
              <div>Linked file: {fileName}</div>
              <div>{fileStatus}</div>
            </div>
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
          Choose a data file once and this browser will reopen it and autosave to it when permission is still available.
        </footer>
      </div>
    </div>
  )
}
