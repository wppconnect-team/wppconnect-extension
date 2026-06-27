const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@wppconnect',
  'wa-js',
  'dist',
  'wppconnect-wa.js'
);

const marker = 'wppconnect_extension_runtime_fallbacks';
const fallbackPatch = `t.fallbackModules={
fallback_${marker}_auth:{
isLoggedIn:function(){
try{
return!!document.querySelector('[data-testid="chat-list"],[aria-label="Chat list"],[data-icon="new-chat-outline"],[data-icon="menu"]')
}catch(e){return!1}
},
Z:function(){
try{
return!!document.querySelector('[data-testid="chat-list"],[aria-label="Chat list"],[data-icon="new-chat-outline"],[data-icon="menu"]')
}catch(e){return!1}
}
},
fallback_${marker}_chat_store:{
ChatCollection:function(){
const e={models:[],_models:[]};
return e.on=e.off=e.once=e.add=e.remove=e.trigger=function(){return e},
e.get=e.find=e.findFirst=function(){},
e.getModelsArray=e.toArray=function(){return[]},
e
}()
}
};`;

if (!fs.existsSync(target)) {
  throw new Error(`WA-JS bundle not found: ${target}`);
}

let source = fs.readFileSync(target, 'utf8');

const needle = 't.fallbackModules={};';
if (!source.includes(marker) && !source.includes(needle)) {
  throw new Error('WA-JS loader fallbackModules initializer was not found');
}

if (!source.includes(marker)) {
  source = source.replace(needle, fallbackPatch);
  console.log('Patched @wppconnect/wa-js runtime fallbacks');
}

const lidSendMarker = 'wppconnect_extension_lid_send_resolver';
const sendRawNeedle = 'const o=await(0,i.assertFindChat)(e);';
const sendRawPatch = `const o=await(0,i.assertFindChat)(await async function(e){/* ${lidSendMarker} */try{const t=(0,i.assertWid)(e);if(!t.isLid())return e;const r=await globalThis.WPP?.contact?.getPnLidEntry?.(t);return r?.phoneNumber?._serialized||e}catch(t){return e}}(e));`;

if (!source.includes(lidSendMarker) && !source.includes(sendRawNeedle)) {
  throw new Error('WA-JS sendRawMessage assertFindChat call was not found');
}

if (!source.includes(lidSendMarker)) {
  source = source.replace(sendRawNeedle, sendRawPatch);
  console.log('Patched @wppconnect/wa-js LID send resolver');
}

fs.writeFileSync(target, source, 'utf8');
