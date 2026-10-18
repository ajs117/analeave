import React, { useRef, useState } from 'react'
import { readDataFromFile } from '../utils/leaveService'
import { GIST_ID, GIST_OWNER } from '../utils/gistStore'

const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'

export default function SyncPanel({ sync, onClose }){
  const { config, data, editData, connect, disconnect, syncNow, status, agentUrl } = sync
  const [token, setToken] = useState(config?.token || '')
  const fileRef = useRef(null)
  const [copied, setCopied] = useState('')

  const copy = async (label, text)=>{
    try{
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(()=>setCopied(''), 2000)
    }catch(_error){
      prompt('Copy this:', text)
    }
  }

  const agentPrompt = ()=>`Fetch my annual leave data from ${agentUrl} (JSON; read its "about" and "rules" fields first). Today is ${new Date().toISOString().slice(0, 10)}. Use it to advise me on planning our annual leave.`
  const hasToken = Boolean(config?.token)

  const exportJson = ()=>{
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leave-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (ev)=>{
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if(!file) return
    try{
      const next = await readDataFromFile(file)
      if(confirm(`Replace current data with ${next.entries.length} entries from ${file.name}?`)) editData(() => next)
    }catch(error){
      alert(`Could not read ${file.name}: ${error.message}`)
    }
  }

  return (
    <div className="glass-card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="section-title">Settings</h2>
        </div>
        <button type="button" className="text-slate-300 text-sm" onClick={onClose}>Close</button>
      </div>

      <p className="text-sm text-slate-300">
        Data lives in <a className="underline" href={`https://gist.github.com/${GIST_OWNER}/${GIST_ID}`} target="_blank" rel="noreferrer">this gist</a>.
        Anyone with the app can view it; to save changes, paste a <a className="underline" href={TOKEN_URL} target="_blank" rel="noreferrer">fine-grained token</a> with
        account permission <strong>Gists: Read and write</strong> and no repository access.
      </p>

      <label className="block text-sm text-slate-200">GitHub token
        <input className="input mt-1 font-mono" type="password" value={token} onChange={e=>setToken(e.target.value)}
          placeholder="github_pat_…" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={!token.trim()} onClick={()=>connect(token)}>Save token</button>
        <button type="button" className="btn-secondary" onClick={()=>syncNow()}>Sync now</button>
        {hasToken && <button type="button" className="btn-secondary" onClick={()=>{ if(confirm('Remove the token? This device becomes read-only.')){ disconnect(); setToken('') } }}>Remove token</button>}
      </div>

      <div className="text-xs text-slate-400">{status.message}</div>

      {(
        <div className="border-t border-white/10 pt-3 space-y-2">
          <div className="text-sm text-slate-200">Agent endpoint <span className="text-slate-400">· paste into any AI agent that can fetch URLs</span></div>
          <div className="text-xs font-mono text-slate-300 break-all bg-white/5 rounded-lg px-3 py-2">{agentUrl}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={()=>copy('url', agentUrl)}>{copied === 'url' ? 'Copied' : 'Copy URL'}</button>
            <button type="button" className="btn-secondary" onClick={()=>copy('prompt', agentPrompt())}>{copied === 'prompt' ? 'Copied' : 'Copy prompt for agent'}</button>
            <a className="btn-secondary" href={agentUrl} target="_blank" rel="noreferrer">Open</a>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 mr-auto">Backup</span>
        <button type="button" className="btn-secondary" onClick={exportJson}>Export JSON</button>
        <button type="button" className="btn-secondary" onClick={()=>fileRef.current?.click()}>Import JSON</button>
        <input ref={fileRef} className="hidden" type="file" accept="application/json,.json" onChange={importJson} />
      </div>
    </div>
  )
}
