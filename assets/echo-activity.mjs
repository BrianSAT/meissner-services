import {activityClock} from './echo-core.mjs';

/** Durable per-page outbox. The Worker unions devices and deduplicates span starts. */
export function activityRecorder({now, read, write, send, rater, device, idleMs=60000}) {
  const clock=activityClock(idleMs);
  let enabled=false, visible=true, sending=null, error='';
  function enqueue() {
    const pending=new Map(read().map(([start,end])=>[start,end]));
    for(const [start,end] of clock.take(now()))pending.set(start,Math.max(end,pending.get(start) || end));
    const spans=[...pending].sort((a,b)=>a[0]-b[0]);write(spans);return spans;
  }
  function flush() {
    enqueue();
    if(sending)return sending;
    const batch=read().slice(0,200);if(!batch.length)return Promise.resolve(true);
    sending=(async()=>{
      try {
        const result=await send({rater,device,spans:batch});
        if(result.rejected || !Number.isFinite(result.stored))throw new Error('Active-time receipt rejected; retained on this device');
        const sent=new Map(batch);
        // A span may grow while a request is in flight; acknowledge only those exact bytes.
        write(read().filter(([start,end])=>!sent.has(start) || end>sent.get(start)));
        error='';return true;
      } catch(e) {error=e.message;return false;}
      finally {sending=null;}
    })();
    return sending;
  }
  return {
    input(){if(enabled && visible)clock.input(now());},
    enabled(value){enabled=value;clock.visible(enabled && visible,now());},
    visible(value){visible=value;clock.visible(enabled && visible,now());},
    flush,
    pending(){return read().length;},
    error(){return error;}
  };
}
