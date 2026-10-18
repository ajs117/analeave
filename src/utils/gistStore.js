import { buildAgentSummary } from './agentSummary.js'
import { dateToLocalISO, normalizeData } from './leaveService.js'

const API = 'https://api.github.com'
// Browsers otherwise reuse a cached GET for up to a minute.
const NO_STORE = { cache: 'no-store' }
export const GIST_FILE = 'leave-data.json'
export const SUMMARY_FILE = 'leave-summary.json'
export const GIST_ID = '693417ced3f2fbc4078d5e920fd7d868'
export const GIST_OWNER = 'ajs117'

export const AGENT_URL = `https://gist.githubusercontent.com/${GIST_OWNER}/${GIST_ID}/raw/${SUMMARY_FILE}`

function files(data){
  return {
    [GIST_FILE]: { content: JSON.stringify(data, null, 2) },
    [SUMMARY_FILE]: { content: JSON.stringify(buildAgentSummary(data), null, 2) },
  }
}

function headers(token){
  const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  if(token) h.Authorization = `Bearer ${token}`
  return h
}

async function request(url, token, init = {}){
  const res = await fetch(url, { ...NO_STORE, ...init, headers: { ...headers(token), ...(init.headers || {}) } })
  if(!res.ok){
    const body = await res.text().catch(() => '')
    const err = new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

async function unpack(gist){
  const file = gist.files?.[GIST_FILE]
  if(!file) throw new Error(`Gist has no ${GIST_FILE}`)
  const content = file.truncated ? await (await fetch(file.raw_url, NO_STORE)).text() : file.content
  let summaryDate = null
  try{ summaryDate = JSON.parse(gist.files[SUMMARY_FILE]?.content || '{}').generated_on || null }catch(_error){}
  return {
    data: normalizeData(JSON.parse(content)),
    version: gist.history?.[0]?.version || gist.updated_at,
    summaryFresh: summaryDate === dateToLocalISO(new Date()),
  }
}

export async function readGist(gistId, token){
  return unpack(await request(`${API}/gists/${gistId}`, token))
}

export async function writeGist(gistId, token, data){
  const gist = await request(`${API}/gists/${gistId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ files: files(data) }),
  })
  return gist.history?.[0]?.version || gist.updated_at
}
