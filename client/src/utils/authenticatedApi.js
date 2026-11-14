import axios from 'axios';
import { auth } from '../firebase/firebase';
import { getDemoProfile, demoAdapter } from '../demo/demoSession';
const identityId=()=>getDemoProfile()?._id || auth.currentUser?.uid;

const api = axios.create({timeout:30000});
const controllers = new Set();
const reads = new Map();
let generation = 0;
let cacheVersion = 0;
let refreshing = null;
let blocked = false;
export const isCanceled = error => error?.code === 'ERR_CANCELED' || axios.isCancel(error);
const canceled = () => new axios.CanceledError('Request is no longer active');
export function clearReadCache() { cacheVersion += 1; reads.clear(); }
export function cancelPendingRequests() {
  generation += 1;
  controllers.forEach(controller => controller.abort());
  controllers.clear();
  for (const [key,entry] of reads) if (!entry.value) reads.delete(key);
}
export function resetApiSession() { cancelPendingRequests(); clearReadCache(); refreshing = null; }
export function blockApiRequests(value) { blocked = value; }

function release(config) {
  if (!config) return;
  if (config._controller) controllers.delete(config._controller);
  config._removeAbortListener?.();
}
api.interceptors.request.use(async config => {
  if (blocked || config.signal?.aborted || config._callerSignal?.aborted) throw canceled();
  const demo=getDemoProfile();
  if(demo){
    config._generation ??= generation;config._uid ??= demo._id;
    if(config._generation!==generation || config._uid!==demo._id)throw canceled();
    config.adapter=demoAdapter;
    const controller=new AbortController();
    config._callerSignal ??= config.signal;
    const abort=()=>controller.abort();
    config._callerSignal?.addEventListener('abort',abort,{once:true});
    config._removeAbortListener=()=>config._callerSignal?.removeEventListener('abort',abort);
    config._controller=controller;config.signal=controller.signal;controllers.add(controller);
    return config;
  }
  const identity = auth.currentUser;
  if (!identity) {
    const error = new Error('Please sign in to continue.');
    error.response = {status:401};
    throw error;
  }
  config._generation ??= generation;
  config._uid ??= identity.uid;
  if (config._generation !== generation || config._uid !== identity.uid) throw canceled();
  const controller = new AbortController();
  config._callerSignal ??= config.signal;
  const signal = config._callerSignal;
  if (signal?.aborted) throw canceled();
  const abort = () => controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  config._removeAbortListener = () => signal?.removeEventListener('abort',abort);
  config._controller = controller;
  config.signal = controller.signal;
  controllers.add(controller);
  try {
    const token = await identity.getIdToken();
    if (blocked || controller.signal.aborted || config._generation !== generation || auth.currentUser?.uid !== identity.uid) throw canceled();
    config.headers = {...config.headers,Authorization:`Bearer ${token}`};
    return config;
  } catch (error) { release(config); throw error; }
});
api.interceptors.response.use(response => {
  release(response.config);
  if (response.config._generation !== generation || response.config._uid !== identityId() || blocked) throw canceled();
  if (!['get','head','options'].includes(response.config.method)) clearReadCache();
  return response;
},async error => {
  const config = error.config;
  release(config);
  if (isCanceled(error)) throw error;
  if (config && (blocked || config._generation !== generation || config._uid !== identityId())) throw canceled();
  if (error.response?.status === 401 && config && !config.retriedAuth && !getDemoProfile() && auth.currentUser) {
    config.retriedAuth = true;
    const identity = auth.currentUser;
    const currentToken = await identity.getIdToken();
    if (blocked || config._generation !== generation || config._uid !== identityId() || config.signal?.aborted || config._callerSignal?.aborted) throw canceled();
    // A sibling request may already have refreshed the token.
    if (config.headers.Authorization !== `Bearer ${currentToken}`) return api.request(config);
    if (!refreshing) {
      const promise = identity.getIdToken(true);
      refreshing = promise;
      promise.then(() => {if(refreshing === promise) refreshing=null;},() => {if(refreshing === promise) refreshing=null;});
    }
    await refreshing;
    if (blocked || config._generation !== generation || config._uid !== identityId() || config.signal?.aborted || config._callerSignal?.aborted) throw canceled();
    return api.request(config);
  }
  throw error;
});

// Share short-lived reads across Inventory and Recipe. Mutations invalidate them.
const get = api.get.bind(api);
api.get = (url,config = {}) => {
  if (blocked || config.signal?.aborted) return Promise.reject(canceled());
  const cacheable = /\/api\/(?:item\/family|family(?:\/|$))/.test(url) && config.cache !== false;
  if (!cacheable) return get(url,config);
  const key = JSON.stringify([identityId(),url,Object.entries(config.params || {}).sort()]);
  const requestGeneration = generation;
  const uid = identityId();
  const guarded = promise => promise.then(response => {
    if (blocked || generation !== requestGeneration || identityId() !== uid || config.signal?.aborted || config._callerSignal?.aborted) throw canceled();
    return response;
  });
  const existing = reads.get(key);
  if (existing && (!existing.value || existing.expires > Date.now())) return guarded(existing.promise);
  const version = cacheVersion;
  const entry = {promise:null,value:null,expires:0};
  entry.promise = get(url,config).then(response => {
    if (cacheVersion === version && reads.get(key) === entry) {
      entry.value = response;
      entry.expires = Date.now()+15000;
    }
    return response;
  },error => {if(reads.get(key) === entry) reads.delete(key);throw error;});
  reads.set(key,entry);
  return guarded(entry.promise);
};
export default api;
