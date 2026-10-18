import { useCallback, useEffect, useRef, useState } from 'react'
import { cacheData, loadData } from './leaveService.js'
import { AGENT_URL, BUILT_IN_TOKEN, GIST_ID, readGist, writeGist } from './gistStore.js'

const CONFIG_KEY = 'ana-leave-sync'
const META_KEY = 'ana-leave-sync-meta'
const PUSH_DELAY_MS = 1200

function readJSON(key, fallback){
  try{ return JSON.parse(localStorage.getItem(key)) || fallback }catch(_error){ return fallback }
}
function writeJSON(key, value){
  try{
    if(value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  }catch(_error){}
}

function describeError(error){
  if(error?.status === 401) return 'GitHub rejected the token. Paste a new one in Sync settings.'
  if(error?.status === 403) return 'GitHub refused the request (token lacks Gists write, or rate limited).'
  if(error?.status === 404) return 'Gist not found. Check the gist ID.'
  if(typeof navigator !== 'undefined' && navigator.onLine === false) return 'Offline. Changes are kept on this device and will sync when back online.'
  return `Sync failed: ${error?.message || error}`
}

const sameData = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export default function useGistSync(){
  const [data, setData] = useState(() => loadData())
  const [config, setConfig] = useState(() => readJSON(CONFIG_KEY, null))
  const [status, setStatus] = useState({ state: 'idle', message: '' })
  const [conflict, setConflict] = useState(null)

  const dataRef = useRef(data)
  const configRef = useRef(config)
  const metaRef = useRef(readJSON(META_KEY, { baseVersion: null, dirty: false }))
  const editSeqRef = useRef(0)
  const busyRef = useRef(false)
  const rerunRef = useRef(false)
  const timerRef = useRef(null)

  dataRef.current = data
  configRef.current = config

  useEffect(() => { cacheData(data) }, [data])

  const setMeta = (patch) => {
    metaRef.current = { ...metaRef.current, ...patch }
    writeJSON(META_KEY, metaRef.current)
  }

  const markSynced = (version) => {
    setMeta({ baseVersion: version })
    setStatus({ state: 'saved', message: `Synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` })
  }

  const exclusive = async (job) => {
    if(busyRef.current){ rerunRef.current = true; return }
    busyRef.current = true
    try{ await job() }
    finally{
      busyRef.current = false
      if(rerunRef.current){ rerunRef.current = false; void sync() }
    }
  }

  const push = async () => {
    const token = configRef.current?.token || BUILT_IN_TOKEN
    const gistId = GIST_ID
    if(!token){
      setStatus({ state: 'readonly', message: 'Read-only (no token). Changes stay on this device.' })
      return
    }
    setStatus({ state: 'saving', message: 'Saving…' })
    const remote = await readGist(gistId, token)
    if(remote.version !== metaRef.current.baseVersion && !sameData(remote.data, dataRef.current)){
      setConflict(remote)
      setStatus({ state: 'conflict', message: 'Changed on another device.' })
      return
    }
    const seq = editSeqRef.current
    const version = await writeGist(gistId, token, dataRef.current)
    if(seq === editSeqRef.current) setMeta({ dirty: false })
    else rerunRef.current = true
    markSynced(version)
  }

  const pull = async () => {
    const token = configRef.current?.token || BUILT_IN_TOKEN
    const gistId = GIST_ID
    setStatus({ state: 'loading', message: 'Checking for changes…' })
    const remote = await readGist(gistId, token)
    if(metaRef.current.dirty){
      if(remote.version === metaRef.current.baseVersion || sameData(remote.data, dataRef.current)){
        setMeta({ baseVersion: remote.version })
        await push()
      }else{
        setConflict(remote)
        setStatus({ state: 'conflict', message: 'Changed on another device.' })
      }
      return
    }
    if(!sameData(remote.data, dataRef.current)) setData(remote.data)
    // The agent summary has date-relative fields, so refresh it once a day even without edits.
    if(token && !remote.summaryFresh){
      setStatus({ state: 'saving', message: 'Refreshing summary…' })
      markSynced(await writeGist(gistId, token, remote.data))
    }else{
      markSynced(remote.version)
    }
  }

  const sync = useCallback(() => {
    return exclusive(async () => {
      try{
        if(metaRef.current.dirty) await push()
        else await pull()
      }catch(error){
        setStatus({ state: 'error', message: describeError(error) })
      }
    })
  }, [])

  const editData = useCallback((updater) => {
    setData(prev => typeof updater === 'function' ? updater(prev) : updater)
    editSeqRef.current += 1
    setMeta({ dirty: true })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void sync() }, PUSH_DELAY_MS)
  }, [sync])

  useEffect(() => { void sync() }, [config, sync])

  useEffect(() => {
    const onWake = () => { if(document.visibilityState === 'visible') void sync() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('online', onWake)
    return () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('online', onWake)
    }
  }, [sync])

  const connect = useCallback((token) => {
    const next = { token: (token || '').trim() }
    writeJSON(CONFIG_KEY, next)
    setConfig(next)
  }, [])

  const disconnect = useCallback(() => {
    writeJSON(CONFIG_KEY, null)
    writeJSON(META_KEY, null)
    metaRef.current = { baseVersion: null, dirty: false }
    setConflict(null)
    setConfig(null)
  }, [])

  const resolveConflict = useCallback((choice) => {
    const remote = conflict
    if(!remote) return
    setConflict(null)
    if(choice === 'theirs'){
      setMeta({ baseVersion: remote.version, dirty: false })
      setData(remote.data)
      markSynced(remote.version)
    }else{
      setMeta({ baseVersion: remote.version, dirty: true })
      void sync()
    }
  }, [conflict, sync])

  return { data, editData, config, status, agentUrl: AGENT_URL, conflict, connect, disconnect, resolveConflict, syncNow: sync }
}
