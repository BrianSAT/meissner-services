/** Accessible optional voice controls, mounted in the existing component modal. */
export const voiceDisclosure = 'Your recording helps us understand your feedback and build your next version. Your microphone is used only when you tap Record. Preview first; nothing is uploaded until Attach. Audio expires after 90 days; transcripts stay until you delete the attached recording. Anyone with your private review link, and our team, can play attached recordings and read their transcripts. Unattached previews stay on this browser; stored previews more than 24 hours old are removed when a review reopens. Clearing site data removes its copies.';
export function mountVoiceFeedback({binding,controller,node,button,lang='en',urls=globalThis.URL}) {
  const host=node('details',null,{class:'echo-voice','data-echo-ui':''});
  const summary=node('summary','Record feedback (optional)');
  const disclosure=node('p',voiceDisclosure,{class:'echo-voice-disclosure'});
  const status=node('p','',{role:'status','aria-live':'polite',class:'echo-voice-status'});
  const timer=node('output','0:00',{'aria-label':'Recording duration',role:'timer','aria-live':'off'});
  const controls=node('div',null,{class:'echo-voice-controls'});
  const record=button('Record',()=>controller.start(binding));
  const stop=button('Stop recording',()=>controller.stop(binding));
  const preview=node('audio',null,{controls:'',preload:'none','aria-label':'Recording preview'});
  const discard=button('Delete preview',()=>controller.discard(binding));
  const attach=button('Attach recording',()=>controller.attach(binding,transcribe.checked,lang));
  const transcribe=node('input',null,{type:'checkbox'});transcribe.checked=false;
  const transcriptionChoice=node('label',null,{class:'echo-voice-transcribe'});
  transcriptionChoice.append(transcribe,node('span','Create a machine transcript with Cloudflare after attachment (optional). This is not live transcription.'));
  const limits=node('p','Up to 90 seconds and 2 MB per recording. Up to 300 clips per review. The shared free transcription budget is 60 minutes per UTC day; recordings beyond it are saved with transcription deferred.',{class:'echo-voice-disclosure'});
  const playback=node('audio',null,{controls:'',preload:'none','aria-label':'Attached recording playback'});
  let playbackUrl=null,previewUrl=null,remoteVersion=null,lastUpload=null,dirty=false,active=true;
  const load=button('Load attached recording',async()=>{const before=controller.state(binding).remote,url=await controller.playback(binding);if(url){if(!active || before!==controller.state(binding).remote){urls.revokeObjectURL(url);return;}if(playbackUrl)urls.revokeObjectURL(playbackUrl);playbackUrl=url;playback.src=url;playback.hidden=false;}});
  const remove=button('Delete attached recording and transcript',()=>controller.remove(binding));
  const draftLabel=node('label','Machine transcript — edit if wrong');
  const transcript=node('textarea',null,{rows:'2',maxlength:'12000','aria-label':'Machine transcript, editable draft'});
  transcript.addEventListener('input',()=>{dirty=true;saveText.disabled=false;});
  const saveText=button('Save corrected transcript',async()=>{await controller.edit(binding,transcript.value);if(!controller.state(binding).error)dirty=false;update();});
  const retry=button('Retry transcription',()=>controller.retry(binding));
  const check=button('Check transcription status',()=>controller.check());
  controls.append(record,stop,timer,discard,attach);
  draftLabel.append(transcript);
  host.append(summary,disclosure,controls,preview,transcriptionChoice,status,load,playback,remove,draftLabel,saveText,retry,check,limits);
  host.addEventListener('toggle',()=>{if(host.open)controller.refresh(binding);});
  function update() {
    if(!active)return;
    const s=controller.state(binding),remote=s.remote;
    if(remote?.upload_id && remote.upload_id!==lastUpload){dirty=false;lastUpload=remote.upload_id;}
    const version=remote?.upload_id || remote?.updated_at || remote;
    if(remoteVersion!==version){
      if(playbackUrl){playback.pause?.();urls.revokeObjectURL(playbackUrl);playbackUrl=null;playback.removeAttribute?.('src');}
      if(!dirty)transcript.value=remote?.transcript_edited ?? remote?.transcript ?? '';
      remoteVersion=version;
    }
    if(!remote){dirty=false;transcript.value='';}
    summary.textContent=s.recording?'Recording feedback…':s.draft?'Recording preview · attach or delete':remote?'Voice feedback attached':'Record feedback (optional)';
    record.hidden=s.recording;record.disabled=s.busy;
    record.textContent=s.requesting?'Waiting for microphone…':s.draft || remote?'Record replacement':'Record';
    stop.hidden=!s.recording;timer.hidden=!s.recording;const elapsed=`${Math.floor(s.seconds/60)}:${String(s.seconds%60).padStart(2,'0')} / 1:30`;if(timer.textContent!==elapsed)timer.textContent=elapsed;
    if(previewUrl!==s.draft?.url){preview.pause?.();previewUrl=s.draft?.url;if(previewUrl)preview.src=previewUrl;else preview.removeAttribute?.('src');}
    preview.hidden=!s.draft;discard.hidden=!s.draft;attach.hidden=!s.draft;transcriptionChoice.hidden=!s.draft;
    discard.disabled=attach.disabled=transcribe.disabled=s.busy || s.recording;
    load.hidden=remove.hidden=!remote;load.disabled=remove.disabled=s.busy || s.recording;
    playback.hidden=!playbackUrl;draftLabel.hidden=saveText.hidden=!remote || !(remote.transcript || remote.transcript_edited || dirty);
    saveText.disabled=s.busy || !dirty;
    retry.hidden=!remote || !['failed','deferred','none'].includes(remote.status);retry.disabled=s.busy || !!s.draft;
    retry.textContent=remote?.status==='none'?'Create machine transcript (Cloudflare)':'Retry transcription';
    check.hidden=!remote || remote.status!=='pending' || !s.error;check.disabled=s.busy;
    const messages=[];
    if(s.recording)messages.push('Recording on this device. Stop to preview.');
    else if(s.busy)messages.push(s.requesting?'Waiting for microphone permission.':'Saving your recording change…');
    if(s.draft)messages.push(`Preview: ${s.draft.duration_s} seconds. Not attached. ${s.draft.persisted?'Saved privately on this browser for retry.':'Keep this tab open until you attach or delete it.'}${remote?' Attaching replaces the saved audio and clears its transcript.':''}`);
    if(remote)messages.push(({pending:'Attached. Machine transcription is pending.',done:'Attached. Machine transcript is a draft; edit if wrong.',none:'Attached without transcription.',failed:'Attached audio is saved; transcription failed. You can retry.',deferred:'Attached audio is saved; transcription is deferred. You can retry when the free budget is available.'})[remote.status] || 'Voice feedback attached.');
    if(s.error)messages.push(s.error);const message=messages.join(' ');if(status.textContent!==message)status.textContent=message;
  }
  controller.observe(binding);update();
  return {element:host,update,dispose(){active=false;preview.pause?.();playback.pause?.();if(playbackUrl)urls.revokeObjectURL(playbackUrl);controller.leave(binding);}};
}
