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
var e=document.body&&document.body.innerText||"";
if(/carregando\\s+(suas\\s+)?conversas|loading\\s+(your\\s+)?chats|loading\\s+messages/i.test(e))return!1;
return!!document.querySelector('#pane-side,[data-testid="chat-list"],[data-testid="chat-list-search"],[data-testid="cell-frame-container"],[aria-label="Chat list"],[aria-label="Chats"],[aria-label="Conversas"],[aria-label="Lista de conversas"],[aria-label="Lista de chats"],[role="grid"],[role="list"] [role="listitem"]')
}catch(e){return!1}
},
Z:function(){
try{
var e=document.body&&document.body.innerText||"";
if(/carregando\\s+(suas\\s+)?conversas|loading\\s+(your\\s+)?chats|loading\\s+messages/i.test(e))return!1;
return!!document.querySelector('#pane-side,[data-testid="chat-list"],[data-testid="chat-list-search"],[data-testid="cell-frame-container"],[aria-label="Chat list"],[aria-label="Chats"],[aria-label="Conversas"],[aria-label="Lista de conversas"],[aria-label="Lista de chats"],[role="grid"],[role="list"] [role="listitem"]')
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
const fallbackRegex = /t\.fallbackModules=\{[\s\S]*?fallback_wppconnect_extension_runtime_fallbacks_chat_store:[\s\S]*?\n\};/;
if (source.includes(marker)) {
  source = source.replace(fallbackRegex, fallbackPatch);
  console.log('Updated @wppconnect/wa-js runtime fallbacks');
} else if (!source.includes(needle)) {
  throw new Error('WA-JS loader fallbackModules initializer was not found');
} else {
  source = source.replace(needle, fallbackPatch);
  console.log('Patched @wppconnect/wa-js runtime fallbacks');
}

const lidSendMarker = 'wppconnect_extension_lid_send_resolver';
const sendRawNeedle = 'const o=await(0,i.assertFindChat)(e);';
const sendRawPatchRegex = new RegExp(`const o=await\\(0,i\\.assertFindChat\\)\\(await async function\\(e\\)\\{/\\* ${lidSendMarker} \\*/[\\s\\S]*?\\}\\(e\\)\\);`);

if (source.includes(lidSendMarker)) {
  source = source.replace(sendRawPatchRegex, sendRawNeedle);
  console.log('Removed @wppconnect/wa-js LID to PN send resolver patch');
} else if (!source.includes(sendRawNeedle)) {
  throw new Error('WA-JS sendRawMessage assertFindChat call was not found');
}

fs.writeFileSync(target, source, 'utf8');
