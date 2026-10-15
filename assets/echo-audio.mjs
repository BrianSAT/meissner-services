/** Worker-v7 transport and recording lifecycle. No microphone or upload on import. */
import {ratingId} from './echo-core.mjs';
export const audioLimits = {minBytes:1024, maxBytes:2_000_000, maxSeconds:90};
const accepted = new Set(['audio/webm','audio/ogg','audio/mp4','audio/x-m4a','audio/m4a','audio/aac','audio/mpeg','audio/wav','audio/x-wav']);
export function audioMime(value) { return String(value || '').split(';')[0].trim().toLowerCase(); }
export function validateClip(blob, duration) {
  if (!accepted.has(audioMime(blob.type))) throw new Error('This recording format is unsupported. Your text feedback still works.');
  if (blob.size < audioLimits.minBytes) throw new Error('The recording is too short. Record a longer note, or use text.');
  if (blob.size > audioLimits.maxBytes) throw new Error('The recording exceeds 2 MB. Record a shorter note, or use text.');
  if (!Number.isFinite(duration) || duration <= 0 || duration > audioLimits.maxSeconds) throw new Error('Recordings must be no longer than 90 seconds.');
}
export function audioBinding(sid, rater, iteration, component) {
  return {sid, rater, iteration, cid:ratingId(iteration, component.cid), variant:String(component.page || 'iteration')};
}
export function audioKey(binding) { return JSON.stringify([binding.sid,binding.iteration,binding.cid,binding.rater]); }
export function matchingAudio(rows, binding) {
  return (rows || []).find(row => row.cid === binding.cid && Number(row.iteration) === binding.iteration && (row.rater || 'owner') === binding.rater) || null;
}
export function audioClient(base, fetcher = globalThis.fetch) {
  function path(binding, suffix = '', extra = {}) {
    const query = new URLSearchParams({iteration:String(binding.iteration),rater:binding.rater,...extra});
    return `${base}/s/${encodeURIComponent(binding.sid)}/audio/${encodeURIComponent(binding.cid)}${suffix}?${query}`;
  }
  async function request(url, method, body, type, binary = false) {
    const response = await fetcher(url, {method, body, headers:type ? {'Content-Type':type} : {},
      credentials:'omit', referrerPolicy:'no-referrer', redirect:'error', cache:'no-store'});
    if (!response.ok) throw new Error(`Recording service returned ${response.status}. Your text feedback is unchanged.`);
    if(response.status===204)return {ok:true};
    return binary ? response.blob() : response.json();
  }
  return {
    upload(binding, clip, transcribe, lang) {
      validateClip(clip.blob, clip.duration_s);
      return request(path(binding,'',{variant:binding.variant,duration_s:String(clip.duration_s),lang:lang || 'en',...(!transcribe ? {transcribe:'0'} : {})}), 'PUT', clip.blob, audioMime(clip.blob.type));
    },
    playback: binding => request(path(binding),'GET',undefined,undefined,true),
    remove: binding => request(path(binding),'DELETE'),
    edit: (binding, transcript) => request(path(binding),'PATCH',JSON.stringify({transcript}),'application/json'),
    retry: binding => request(path(binding,'/transcribe'),'POST'),
    session: sid => request(`${base}/s/${encodeURIComponent(sid)}`,'GET')
  };
}

export function voiceController({sid,rater,client,store,initial=[],mediaDevices=globalThis.navigator?.mediaDevices,
  Recorder=globalThis.MediaRecorder,urls=globalThis.URL,now=Date.now,timers=globalThis,onChange=()=>{}}) {
  const states = new Map(); let capture = null, generation = 0, revision = 0, pollTimer = null, disposed = false;
  const state = binding => {
    const key = audioKey(binding);
    if (!states.has(key)) states.set(key,{binding,remote:matchingAudio(initial,binding),draft:null,error:'',busy:false,recording:false,seconds:0});
    return states.get(key);
  };
  const emit = () => onChange();
  const release = recording => { timers.clearInterval(recording.tick);timers.clearTimeout(recording.cap);recording.stream.getTracks().forEach(track=>track.stop()); };
  function schedulePoll() {
    timers.clearTimeout(pollTimer); pollTimer = null;
    if (!disposed && [...states.values()].some(s=>s.remote?.status==='pending')) pollTimer = timers.setTimeout(poll,2000);
  }
  async function poll() {
    const before = revision;
    try {
      const fresh = await client.session(sid);
      if (disposed || revision !== before) { schedulePoll(); return; }
      for (const s of states.values()) if (s.remote?.status==='pending') s.remote=matchingAudio(fresh.audio,s.binding) || s.remote;
      emit();schedulePoll();
    } catch (error) {
      for (const s of states.values()) if (s.remote?.status==='pending') s.error=`Transcription status unavailable: ${error.message} Use Check status to retry.`;
      emit(); // Stop failed polling rather than looping on an unavailable service.
    }
  }
  const ready = (async()=>{
    if (!store) return;
    try { for (const row of await store.list(sid,rater)) {
      if (disposed) return;
      if(row.sid!==sid || row.rater!==rater)continue;
      try {validateClip(row.blob,row.duration_s);} catch {await store.remove(row.key);continue;}
      const s=state(row);s.draft={blob:row.blob,duration_s:row.duration_s,url:urls.createObjectURL(row.blob),persisted:true};
    } emit(); } catch { /* Recording stays usable without IndexedDB. Each unsaved preview gets an explicit notice. */ }
  })();
  async function start(binding) {
    await ready; const s=state(binding);
    if (capture || s.busy || disposed) return;
    if (!mediaDevices?.getUserMedia || !Recorder) {s.error='Recording is unavailable in this browser. You can still type your feedback.';emit();return;}
    const attempt=++generation; s.busy=true;s.requesting=true;s.error='';emit();
    let stream;
    try {
      stream=await mediaDevices.getUserMedia({audio:true});
      if (disposed || generation!==attempt) {stream.getTracks().forEach(track=>track.stop());s.busy=false;s.requesting=false;emit();return;}
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>Recorder.isTypeSupported?.(type));
      const recorder=mime ? new Recorder(stream,{mimeType:mime}) : new Recorder(stream);
      const recording={binding,recorder,stream,chunks:[],bytes:0,started:now(),stopped:null,failure:'',cancelled:false};
      capture=recording;s.busy=false;s.requesting=false;s.recording=true;s.seconds=0;
      recorder.ondataavailable=event=>{if(event.data.size){recording.chunks.push(event.data);recording.bytes+=event.data.size;if(recording.bytes>audioLimits.maxBytes)stop(binding);}};
      recorder.onerror=()=>{recording.failure='Recording failed. Try again, or use text.';stop(binding);};
      recorder.onstop=async()=>{
        release(recording);if(capture===recording)capture=null;s.recording=false;
        if(recording.cancelled || disposed){emit();return;}
        s.busy=true;
        const blob=new Blob(recording.chunks,{type:recorder.mimeType || recording.chunks[0]?.type});
        const duration_s=Math.ceil(((recording.stopped ?? now())-recording.started)/1000);
        try {
          if(recording.failure)throw new Error(recording.failure);validateClip(blob,duration_s);
          if(s.draft)urls.revokeObjectURL(s.draft.url);
          s.draft={blob,duration_s,url:urls.createObjectURL(blob),persisted:false};s.error='';
          if(store)try {await store.put({...binding,key:audioKey(binding),blob,duration_s});s.draft.persisted=true;}
          catch(error){s.error=error.message;}
        } catch(error){s.error=error.message;}
        s.busy=false;emit();
      };
      recorder.start(250);
      recording.tick=timers.setInterval(()=>{s.seconds=Math.floor((now()-recording.started)/1000);emit();},250);
      // A small margin lets stop/dispatch complete within the worker's strict 90-second limit.
      recording.cap=timers.setTimeout(()=>stop(binding),89000);emit();
    } catch(error){if(stream)stream.getTracks().forEach(track=>track.stop());capture=null;s.busy=false;s.requesting=false;s.recording=false;s.error=error.name==='NotAllowedError'?'Microphone permission was denied. You can still type your feedback.':`Could not start recording: ${error.message}. You can still type your feedback.`;emit();}
  }
  function stop(binding) {
    if(!capture || audioKey(capture.binding)!==audioKey(binding))return;
    const recording=capture;recording.stopped=now();
    try {if(recording.recorder.state!=='inactive')recording.recorder.stop();}
    catch(error){capture=null;const s=state(binding);s.recording=false;s.error=`Could not finish recording: ${error.message}. You can still use text.`;emit();}
    finally {release(recording);}
  }
  function leave(binding) {++generation;const s=state(binding);if(s.requesting){s.busy=false;s.requesting=false;}stop(binding);}
  async function discard(binding) {
    const s=state(binding);if(s.busy || s.recording)return;
    if(s.draft)urls.revokeObjectURL(s.draft.url);s.draft=null;s.error='';
    try {await store?.remove(audioKey(binding));} catch(error){s.error=error.message;}emit();
  }
  async function write(binding, action) {
    const s=state(binding);if(s.busy || s.recording)return;
    s.busy=true;s.error='';++revision;emit();
    try {await action(s);}catch(error){s.error=error.message;}finally{s.busy=false;++revision;emit();schedulePoll();}
  }
  async function attach(binding, transcribe, lang) {
    await ready;
    return write(binding,async s=>{
      if(!s.draft)return;
      const clip=s.draft,result=await client.upload(binding,clip,transcribe,lang);
      s.remote={...binding,status:result.status,mime:audioMime(clip.blob.type),duration_s:clip.duration_s,transcript:null,transcript_edited:null,upload_id:result.upload_id};
      urls.revokeObjectURL(clip.url);s.draft=null;
      try {await store?.remove(audioKey(binding));}catch{s.error='Attached, but the local preview could not be removed. Clear this browser’s site data to remove its copy.';}
    });
  }
  const remove=binding=>write(binding,async s=>{await client.remove(binding);s.remote=null;});
  const edit=(binding,text)=>write(binding,async s=>{await client.edit(binding,text);s.remote={...s.remote,transcript_edited:text};});
  const retry=binding=>write(binding,async s=>{const result=await client.retry(binding);s.remote={...s.remote,status:result.status || 'pending',error:null};});
  async function playback(binding) {
    const s=state(binding);s.error='';
    try {const blob=await client.playback(binding);return urls.createObjectURL(blob);}catch(error){s.error=error.message;emit();return null;}
  }
  async function refresh(binding) {
    const before=revision;
    try {const fresh=await client.session(sid);if(!disposed && revision===before){state(binding).remote=matchingAudio(fresh.audio,binding);emit();schedulePoll();}}
    catch(error){state(binding).error=`Could not refresh attached feedback: ${error.message}`;emit();}
  }
  function dispose() {
    disposed=true;++generation;timers.clearTimeout(pollTimer);
    if(capture){capture.cancelled=true;stop(capture.binding);}
    for(const s of states.values())if(s.draft)urls.revokeObjectURL(s.draft.url);
  }
  return {ready,state,start,stop,leave,discard,attach,remove,edit,retry,playback,refresh,
    check:()=>{for(const s of states.values())s.error='';timers.clearTimeout(pollTimer);return poll();},observe:binding=>{state(binding);schedulePoll();},dispose,
    pending:()=>[...states.values()].filter(s=>s.draft).map(s=>s.binding)};
}
