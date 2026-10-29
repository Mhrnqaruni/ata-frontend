import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { QueryObserver } from '@tanstack/react-query';

// Exercise the real Axios/session/AuthProvider code, without a server or real credentials.
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null,
  setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) };
globalThis.window = new EventTarget();
window.location = { pathname: '/login', href: '' };
globalThis.BroadcastChannel = undefined;
const dir = await mkdtemp(path.join(process.cwd(), '.navigation-test-'));
const output = path.join(dir, 'runtime.mjs');
await build({ stdin: { contents: `export {default as api} from './src/services/api.js';
export {default as useActivityProgress} from './src/pages/family/useActivityProgress.js'; export * from './src/services/queryCache.js'; export * from './src/hooks/useAuth.jsx';
export { teacherOptions, quizSessionOptions } from './src/hooks/useTeacherData.js';
export { default as RenameActivityDialog } from './src/components/common/RenameActivityDialog.jsx';`,
  resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, packages: 'external', platform: 'node',
  plugins: [{ name: 'visual-shell-only', setup(build) {
    build.onResolve({ filter: /^@mui\/material$/ }, () => ({ path: 'mui', namespace: 'test-shell' }));
    build.onLoad({ filter: /.*/, namespace: 'test-shell' }, () => ({
      contents: `import React from 'react'; export const Dialog=p=>React.createElement('Dialog',p,p.children),
      DialogTitle=p=>React.createElement('DialogTitle',p,p.children), DialogContent=p=>React.createElement('DialogContent',p,p.children),
      DialogActions=p=>React.createElement('DialogActions',p,p.children), TextField=p=>React.createElement('TextField',p),
      Button=p=>React.createElement('Button',p,p.children), Alert=p=>React.createElement('Alert',p,p.children);`,
      loader: 'js', resolveDir: process.cwd() }));
  } }],
  format: 'esm', outfile: output, define: { 'import.meta.env.VITE_API_BASE_URL': '"http://offline.invalid"' } });
const runtime = await import(pathToFileURL(output));
const {api, queryClient: client, resetTeacherSession: reset, sessionGeneration: generation,
  invalidateTeacher: invalidate, invalidateAfter, AuthProvider, useAuth} = runtime;
after(async () => { client.clear(); await rm(dir, { recursive: true, force: true }); });
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };
const key = (family='classes', user='A') => ['teacher', generation(), user, family];
const response = (config,data) => ({config,data,status:200,statusText:'OK',headers:{}});
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('fresh reads deduplicate and return warm data without another request', async () => {
  reset(); let calls=0; const gate=deferred();
  const options={queryKey:key(), queryFn:async()=>{calls++;return gate.promise;}};
  const a=client.fetchQuery(options), b=client.fetchQuery(options); gate.resolve(['one']);
  assert.deepEqual(await a,await b); assert.equal(calls,1);
  assert.deepEqual(await client.fetchQuery(options),['one']); assert.equal(calls,1);
});
test('invalidation cancels a pre-write response and preserves the newer read', async () => {
  reset(); let calls=0; const old=deferred(); const q=key();
  const observer=new QueryObserver(client,{queryKey:q,queryFn:()=>++calls===1?old.promise:Promise.resolve(['new'])});
  const stop=observer.subscribe(()=>{}); await tick();
  await invalidate(['classes'],false); old.resolve(['old']); await tick();
  assert.deepEqual(client.getQueryData(q),['new']); assert.equal(calls,2); stop();
});
test('background failure retains cached data and retry recovers', async () => {
  reset();const q=key();client.setQueryData(q,['saved']);
  const observer=new QueryObserver(client,{queryKey:q,queryFn:async()=>{throw new Error('offline');}});
  const stop=observer.subscribe(()=>{}); await observer.refetch();
  assert.deepEqual(observer.getCurrentResult().data,['saved']);assert.equal(observer.getCurrentResult().isRefetchError,true);
  observer.setOptions({queryKey:q,queryFn:async()=>['fresh']});await observer.refetch();
  assert.deepEqual(observer.getCurrentResult().data,['fresh']);stop();
});
test('session replacement removes old data and fences delayed success and401', async () => {
  reset();localStorage.setItem('authToken','synthetic-A');const gate=deferred();let config;
  api.defaults.adapter=c=>{config=c;return gate.promise;};
  const pending=api.get('/read').catch(error=>error);await tick();
  reset();localStorage.setItem('authToken','synthetic-B');client.setQueryData(key('classes','B'),['B']);
  gate.resolve(response(config,['A']));assert.equal((await pending).code,'ERR_CANCELED');
  assert.deepEqual(client.getQueryData(key('classes','B')),['B']);
  const failure=deferred();api.defaults.adapter=c=>{config=c;return failure.promise;};
  const old=api.get('/read').catch(error=>error);await tick();reset();localStorage.setItem('authToken','synthetic-C');
  failure.reject({config,response:{status:401}});assert.equal((await old).code,'ERR_CANCELED');
  assert.equal(localStorage.getItem('authToken'),'synthetic-C');
});
test('old-session mutation completion cannot invalidate replacement account', async () => {
  reset();const gate=deferred();const service=invalidateAfter({save:()=>gate.promise},['save'],['classes']);
  const pending=service.save();reset();const q=key('classes','B');client.setQueryData(q,['B']);gate.resolve('ok');await pending;await tick();
  assert.equal(client.getQueryState(q).isInvalidated,false);
});
test('successful commands invalidate only declared families; failed writes are never replayed', async () => {
  reset();const classes=key(),summary=key('summary'),quiz=key('quizzes');
  [classes,summary,quiz].forEach(q=>client.setQueryData(q,[]));let calls=0;
  const service=invalidateAfter({save:async()=>1,fail:async()=>{calls++;throw new Error('fail');}},['save','fail'],['classes','summary']);
  await service.save();await tick();assert.equal(client.getQueryState(classes),undefined);assert.equal(client.getQueryState(summary),undefined);
  assert.equal(client.getQueryState(quiz).isInvalidated,false);await assert.rejects(service.fail());assert.equal(calls,1);
});

let auth;
function Probe(){auth=useAuth();return null;}
async function mountAuth(){let tree;await act(async()=>{tree=Renderer.create(React.createElement(MemoryRouter,null,React.createElement(AuthProvider,null,React.createElement(Probe))));await tick();});return tree;}
test('actual AuthProvider ignores old initialization after logout/login, including old401', async () => {
  reset();storage.clear();localStorage.setItem('authToken','synthetic-A');const old=deferred();let oldConfig;
  api.defaults.adapter=config=>{
    if(config.headers.Authorization==='Bearer synthetic-A'){oldConfig=config;return old.promise;}
    return Promise.resolve(response(config,config.url.includes('token')?{access_token:'synthetic-B'}:{id:'B'}));
  };
  const tree=await mountAuth();await act(async()=>auth.logout());await act(async()=>{await auth.login('synthetic','synthetic');});
  await act(async()=>{old.reject({config:oldConfig,response:{status:401}});await tick();});
  assert.equal(auth.user.id,'B');assert.equal(auth.isAuthLoading,false);assert.equal(localStorage.getItem('authToken'),'synthetic-B');
  await act(async()=>tree.unmount());
});
test('actual AuthProvider immediately hides old identity on cross-tab replacement/removal', async () => {
  reset();storage.clear();localStorage.setItem('authToken','synthetic-A');
  api.defaults.adapter=config=>Promise.resolve(response(config,{id:'A'}));const tree=await mountAuth();assert.equal(auth.user.id,'A');
  const gate=deferred();let config;api.defaults.adapter=c=>{config=c;return gate.promise;};
  const event=()=>Object.assign(new Event('storage'),{key:'authToken'});
  await act(async()=>{localStorage.setItem('authToken','synthetic-B');window.dispatchEvent(event());});assert.equal(auth.user,null);
  await act(async()=>{gate.resolve(response(config,{id:'B'}));await tick();});assert.equal(auth.user.id,'B');
  await act(async()=>{localStorage.removeItem('authToken');window.dispatchEvent(event());await tick();});assert.equal(auth.user,null);assert.equal(auth.isAuthLoading,false);
  await act(async()=>tree.unmount());
});
test('current401 on login clears auth loading and cached data', async () => {
  reset();storage.clear();localStorage.setItem('authToken','synthetic-expired');
  api.defaults.adapter=config=>Promise.reject({config,response:{status:401}});
  const tree=await mountAuth();assert.equal(auth.user,null);assert.equal(auth.isAuthLoading,false);assert.equal(client.getQueryCache().getAll().length,0);
  await act(async()=>tree.unmount());
});

test('polling is bounded by activity and historical quiz cards never request sessions', () => {
  const {teacherOptions,quizSessionOptions}=runtime;
  for(const status of ['completed','draft','archived']) assert.equal(quizSessionOptions('A',{id:'q',status}).enabled,false);
  const options=quizSessionOptions('A',{id:'q',status:'published'});
  assert.equal(options.enabled,true);
  assert.equal(options.refetchInterval({state:{data:null}}),60000);
  assert.equal(options.refetchInterval({state:{data:{status:'active'}}}),15000);
  assert.equal(options.refetchIntervalInBackground,false);
  const quick=teacherOptions('A','quick'), assessments=teacherOptions('A','assessments');
  assert.equal(quick.refetchInterval({state:{data:[{status:'running'}]}}),5000);
  assert.equal(quick.refetchInterval({state:{data:[]}}),15000);
  assert.equal(assessments.refetchInterval({state:{data:[{status:'Processing'}]}}),5000);
  assert.equal(quick.refetchOnWindowFocus,'always');
});

test('actual rename submission closes after success without an optional refresh callback', async () => {
  reset();storage.clear();let calls=0,closed=0,tree;
  api.defaults.adapter=config=>{calls++;return Promise.resolve(response(config,{name:'Updated'}));};
  await act(async()=>{tree=Renderer.create(React.createElement(runtime.RenameActivityDialog,{item:{kind:'assessment',id:'synthetic',name:'Old'},onClose:()=>closed++}));});
  await act(async()=>tree.root.findByType('TextField').props.onChange({target:{value:'Updated'}}));
  await act(async()=>{await tree.root.findByType('Dialog').props.PaperProps.onSubmit({preventDefault(){}});});
  assert.equal(calls,1);assert.equal(closed,1);assert.equal(tree.root.findAllByType('Alert').length,0);
  await act(async()=>tree.unmount());
});


test('unsaved family drafts warn on reload and session reset clears them', () => {
  reset();
  const draftKey = ['family', generation(), 'adult-A', 'child-A', 'quizDraft', 'activity-A'];
  client.setQueryData(draftKey, { answers: { q1: 0 }, attemptId: 'synthetic-attempt' });
  const leaving = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(leaving);
  assert.equal(leaving.defaultPrevented, true);
  reset();
  assert.equal(client.getQueryData(draftKey), undefined);
  const afterLogout = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(afterLogout);
  assert.equal(afterLogout.defaultPrevented, false);
});


test('parent drafts survive authenticated reload but clear on account reset', () => {
  const data={'mst.family.draft.A.child.chat':'unfinished question','unrelated':'keep'};
  globalThis.sessionStorage=Object.assign(data,{getItem:key=>data[key]??null,setItem:(key,value)=>{data[key]=value},removeItem:key=>{delete data[key]}});
  reset({preserveDrafts:true});
  assert.equal(sessionStorage.getItem('mst.family.draft.A.child.chat'),'unfinished question');
  reset();
  assert.equal(sessionStorage.getItem('mst.family.draft.A.child.chat'),null);
  assert.equal(sessionStorage.getItem('unrelated'),'keep');
  delete globalThis.sessionStorage;
});

test('unconfirmed progress is marked unsaved and blocked, not silently overwritten', async () => {
  reset();let progress;
  api.defaults.adapter=async config=>{if(config.method==='get')return response(config,{revision:0,data:{}});throw new Error('offline')};
  function Probe(){progress=runtime.useActivityProgress({childId:'child',id:'activity'},{index:0});return null;}
  let tree;await act(async()=>{tree=Renderer.create(React.createElement(Probe));await tick()});
  assert.equal(progress.ready,true);
  act(()=>progress.update({index:1}));assert.equal(progress.saving,true);
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,350))});
  assert.ok(typeof progress.error === "string" && progress.error.length > 0);assert.equal(progress.saving,false);
  act(()=>progress.update({index:2}));assert.equal(progress.value.index,1);
  act(()=>tree.unmount());
});
