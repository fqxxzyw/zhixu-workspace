import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export const uuid=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export function db():D1Database {if(!env.DB)throw new Error('知识库暂时无法连接，请稍后重试');return env.DB;}
export async function one(sql:string,...args:any[]){return db().prepare(sql).bind(...args).first<any>();}
export async function all(sql:string,...args:any[]){return (await db().prepare(sql).bind(...args).all<any>()).results;}
export const stmt=(sql:string,...args:any[])=>db().prepare(sql).bind(...args);
export async function run(sql:string,...args:any[]){return stmt(sql,...args).run();}
export class Fault extends Error{constructor(message:string,public status=400){super(message)}}
export async function identity(){const u=await getChatGPTUser();if(!u)throw new Fault('请先使用 ChatGPT 账号登录',401);await run('INSERT INTO users(id,name,email,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email',u.userId,u.fullName||u.email.split('@')[0],u.email.toLowerCase(),now());return u;}
export async function access(space:string,user:string,write=false,admin=false){const m=await one('SELECT role FROM members WHERE space_id=? AND user_id=?',space,user);if(!m)throw new Fault('你尚未加入这个知识空间',403);if(admin&&!['Owner','Admin'].includes(m.role))throw new Fault('需要空间管理员权限',403);if(write&&!['Owner','Admin','Editor'].includes(m.role))throw new Fault('此角色只能阅读或评论，请向管理员申请编辑权限',403);return m.role;}
export async function pageAccess(id:string,user:string,write=false){const p=await one('SELECT p.*,u.name AS author,v.name AS editor FROM pages p JOIN users u ON u.id=p.created_by JOIN users v ON v.id=p.updated_by WHERE p.id=?',id);if(!p)throw new Fault('页面不存在',404);p.role=await access(p.space_id,user,write);return p;}
export function text(value:any,max=100000){if(typeof value!=='string'||value.length>max)throw new Fault('内容格式或长度不正确');return value;}
export async function keyCrypto(){const secret=(env as any).APP_SECRET;if(!secret)throw new Fault('加密配置未就绪，暂时不能保存 API Key',503);const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encrypt(s:string){const iv=crypto.getRandomValues(new Uint8Array(12));const c=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyCrypto(),new TextEncoder().encode(s)));return btoa(String.fromCharCode(...iv,...c));}
export async function decrypt(s:string){const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b.slice(0,12)},await keyCrypto(),b.slice(12)));}
export function safeEndpoint(s:string){let u:URL;try{u=new URL(s)}catch{throw new Fault('请输入有效的 API Base URL')}if(u.search||u.hash)throw new Fault('Base URL 不应包含查询参数或锚点');if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||u.hostname==='localhost'||u.hostname.endsWith('.local')||u.hostname.endsWith('.internal')||u.hostname.includes(':')||/^\d+(\.\d+){3}$/.test(u.hostname)||!u.hostname.includes('.'))throw new Fault('托管网站需要 HTTPS 公网 API；本地模型请使用有鉴权的 HTTPS 网关');return u.toString().replace(/\/$/,'');}
