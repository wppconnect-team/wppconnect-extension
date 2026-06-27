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

const source = fs.readFileSync(target, 'utf8');
if (source.includes(marker)) {
  process.exit(0);
}

const needle = 't.fallbackModules={};';
if (!source.includes(needle)) {
  throw new Error('WA-JS loader fallbackModules initializer was not found');
}

fs.writeFileSync(target, source.replace(needle, fallbackPatch), 'utf8');
console.log('Patched @wppconnect/wa-js runtime fallbacks');
