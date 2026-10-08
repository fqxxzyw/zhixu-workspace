import {build as bundle} from 'esbuild';
import {build as viteBuild} from '../node_modules/vite/dist/node/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),desktop=import.meta.dirname;
const localEndpoint=`export function safeEndpoint(s:string){let u:URL;try{u=new URL(s)}catch{throw new Fault('请输入有效的 API Base URL')}if(u.search||u.hash||u.username||u.password)throw new Fault('API 地址不能包含账户信息或查询参数');if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw new Fault('只支持 HTTPS 接口或本机 HTTP 模型');return u.toString().replace(/\\/$/,'')}`;
await fs.mkdir(path.join(desktop,'out'),{recursive:true});
await bundle({entryPoints:[path.join(desktop,'routes.ts')],outfile:path.join(desktop,'out/api.mjs'),bundle:true,platform:'node',format:'esm',target:'node24',tsconfig:path.join(root,'tsconfig.json'),plugins:[{name:'local-runtime',setup(builder){builder.onResolve({filter:/^cloudflare:workers$/},()=>({path:path.join(desktop,'runtime-env.mjs'),external:true}));builder.onResolve({filter:/(?:context|runtime-env)\.mjs$/},args=>({path:path.resolve(args.resolveDir,args.path),external:true}));builder.onLoad({filter:/[/\\]lib[/\\]server\.ts$/},async args=>{let source=await fs.readFile(args.path,'utf8');source=source.replace("import {getChatGPTUser} from '@/app/chatgpt-auth';",`import {getChatGPTUser} from '${path.join(desktop,'context.mjs').replaceAll('\\','/')}';`);source=source.slice(0,source.indexOf('export function safeEndpoint'))+localEndpoint;source=source.replace('请先使用 ChatGPT 账号登录','请先登录本地账户');return {contents:source,loader:'ts',resolveDir:path.dirname(args.path)}})}}]});
// Bundle the HTTP service as well, preserving a single instance of identity context and bindings.
await bundle({entryPoints:[path.join(desktop,'service.mjs')],outfile:path.join(desktop,'out/service.mjs'),bundle:true,platform:'node',format:'esm',target:'node24'});
await fs.rm(path.join(desktop,'out/api.mjs'));
await fs.cp(path.join(root,'drizzle'),path.join(desktop,'out/migrations'),{recursive:true});
await viteBuild({configFile:path.join(desktop,'renderer.config.mjs')});
