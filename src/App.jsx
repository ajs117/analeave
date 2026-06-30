import React, { useEffect, useMemo, useRef, useState } from 'react'
import LeaveForm from './components/LeaveForm'
import Summary from './components/Summary'
import YearCalendar from './components/YearCalendar'
import { clearLinkedFileHandle, getLinkedFilePermission, loadData, loadLinkedFileHandle, parseLocalISO, readDataFromFile, saveDataToFileHandle, saveLinkedFileHandle, supportsLinkedFiles } from './utils/leaveService'

export default function App(){
  const [data, setData] = useState(() => loadData())
  const [year, setYear] = useState(() => new Date().getFullYear())
  const fileHandleRef = useRef(null)
  const openFileInputRef = useRef(null)
  const [fileName, setFileName] = useState('No data file linked')
  const [fileStatus, setFileStatus] = useState('Choose or create a data file to enable autosave.')
  const [startupReady, setStartupReady] = useState(false)
  const linkedFilesSupported = supportsLinkedFiles()

  const downloadDataFile = (nextName = fileName) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nextName && nextName !== 'No data file linked' ? nextName : 'leave-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(()=>{
    let cancelled = false

    const restoreLinkedFile = async ()=>{
      if(!linkedFilesSupported){
        setFileStatus('This browser can load and save files, but it cannot keep a live link for autosave. On iPad use Choose file, then Save file after changes.')
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

    // Debounce so rapid edits (e.g. typing in the adjustment inputs) collapse
    // into a single write instead of rewriting the whole file per keystroke.
    const timer = setTimeout(()=>{ void persist() }, 500)
    return ()=>{ cancelled = true; clearTimeout(timer) }
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
    if(!linkedFilesSupported){
      openFileInputRef.current?.click()
      return
    }
    try{
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Leave data', accept: { 'application/json': ['.json'] } }],
      })
      await linkFileHandle(handle, { loadContents: true })
    }catch(_error){}
  }

  const importFromInput = async (ev)=>{
    const file = ev.target.files?.[0]
    if(!file) return
    try{
      const nextData = await readDataFromFile(file)
      fileHandleRef.current = null
      setData(nextData)
      setFileName(file.name)
      setFileStatus('Loaded from file. This browser cannot autosave back to the same file, so use Save file after changes.')
    }catch(_error){}
    ev.target.value = ''
  }

  const saveDataAs = async ()=>{
    if(!linkedFilesSupported){
      downloadDataFile()
      setFileStatus('Saved a fresh copy of the current data. On this browser, save again after changes.')
      return
    }
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
      yrs.add(parseLocalISO(e.start).getFullYear())
      yrs.add(parseLocalISO(e.end).getFullYear())
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
          <div className="w-full max-w-xl space-y-3 lg:w-auto">
            <div className="grid gap-3 md:grid-cols-[auto_minmax(0,8rem)] md:items-center md:justify-end">
              <label className="text-sm text-slate-200 md:text-right">Calendar year</label>
              <select className="input w-full md:w-32" value={year} onChange={e=>setYear(parseInt(e.target.value,10))}>
                {yearsAvailable.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="btn-secondary w-full" type="button" onClick={openDataFile}>Choose file</button>
              <button className="btn-secondary w-full" type="button" onClick={saveDataAs}>Save file</button>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
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
          {linkedFilesSupported
            ? 'Choose a data file once and this browser will reopen it and autosave to it when permission is still available.'
            : 'On iPad and other unsupported browsers, choose a file to load it and use Save file to download updates.'}
        </footer>
        <input ref={openFileInputRef} className="hidden" type="file" accept="application/json,.json" onChange={importFromInput} />
      </div>
    </div>
  )
}
