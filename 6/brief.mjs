/** Curated EN/ES headings; entered prose is preserved verbatim, never auto-translated. */
export const FIELDS=Object.freeze([{key:'outcome',en:'Outcome',es:'Resultado'},{key:'tools',en:'Existing tools',es:'Herramientas actuales'},{key:'inputs',en:'Inputs and example',es:'Datos y ejemplo'},{key:'deliverable',en:'Deliverable and format',es:'Entrega y formato'},{key:'acceptance',en:'Acceptance checks',es:'Comprobaciones de aceptación'}]);
export function buildBrief(values){
  const lines=['DRAFT / BORRADOR','Entered text is not translated. Human review before agreeing scope.','El texto ingresado no se traduce. Revisión humana antes de acordar el alcance.',''];
  for(const f of FIELDS){const en=String(values[`${f.key}_en`] || '').trim(),es=String(values[`${f.key}_es`] || '').trim();if(en || es){lines.push(`${f.en} / ${f.es}`,`EN: ${en || '[not entered]'}`,`ES: ${es || '[sin completar]'}`,'');}}
  return lines.length>4?lines.join('\n'):'';
}
export const READINESS=Object.freeze([
 {key:'outcome',en:'An outcome and a way to check it',es:'Un resultado y una forma de comprobarlo',nextEn:'Write the result you want and one acceptance example.',nextEs:'Escribe el resultado deseado y un ejemplo para comprobarlo.'},
 {key:'sample',en:'A safe input sample',es:'Un ejemplo de datos sin información sensible',nextEn:'Prepare a small representative sample; do not paste passwords or sensitive data.',nextEs:'Prepara un ejemplo representativo pequeño; no incluyas contraseñas ni datos sensibles.'},
 {key:'format',en:'The required output format',es:'El formato de entrega',nextEn:'Provide an example of the file or layout you need.',nextEs:'Prepara un ejemplo del archivo o diseño que necesitas.'},
 {key:'rules',en:'Rules, volume and edge cases',es:'Reglas, volumen y casos especiales',nextEn:'List the volume, decision rules and cases needing your judgement.',nextEs:'Anota el volumen, las reglas y los casos que requieren tu criterio.'},
 {key:'access',en:'A supported access route',es:'Una forma de acceso compatible',nextEn:'Identify the tools, account owner and access you can grant; do not share secret values.',nextEs:'Indica las herramientas, el titular de la cuenta y los accesos que puedes otorgar; no compartas claves.'},
 {key:'review',en:'A person to review the prototype',es:'Una persona para revisar el prototipo',nextEn:'Choose who checks the prototype and how to return feedback.',nextEs:'Elige quién revisará el prototipo y cómo enviará sus comentarios.'}
]);
export function readiness(checked,lang='en'){const es=lang==='es';const missing=READINESS.filter(f=>!checked.includes(f.key));return {ready:READINESS.length-missing.length,total:READINESS.length,next:missing.map(f=>es?f.nextEs:f.nextEn),label:missing.length?(es?'Faltan datos para conversar sobre el alcance.':'Inputs still missing for a scope discussion.'):(es?'Lista completa según tus respuestas; una persona debe revisar el alcance y los accesos.':'Complete according to your answers; a human still reviews scope and access.')};}
