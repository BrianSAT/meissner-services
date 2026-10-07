/** Coalesce pending writes per component; callers must save durable data first.
 * An immediate score/Next write supersedes a queued note. In-flight writes are
 * serialized by persistRating, which owns errors and the durable retry outbox.
 */
export function createWriteScheduler({setTimer=setTimeout,clearTimer=clearTimeout}={}) {
  const pending=new Map();
  return function schedule(key,write,delay=0) {
    const old=pending.get(key);
    if(old)clearTimer(old.timer);
    const waiters=old?.waiters || [];
    const result=new Promise((resolve,reject)=>waiters.push({resolve,reject}));
    const entry={write,waiters,timer:null};
    const run=()=>{
      if(pending.get(key)!==entry)return;
      pending.delete(key);
      Promise.resolve().then(entry.write).then(
        value=>waiters.forEach(w=>w.resolve(value)),
        error=>waiters.forEach(w=>w.reject(error)));
    };
    pending.set(key,entry);
    if(delay>0)entry.timer=setTimer(run,delay);else run();
    return result;
  };
}
