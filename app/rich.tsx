'use client';
import {useEffect,useRef,useState} from 'react';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
export function Markdown({text}:{text:string}){const [html,setHtml]=useState('');useEffect(()=>{setHtml(DOMPurify.sanitize(marked.parse(text,{async:false}) as string))},[text]);return <div className="markdown" dangerouslySetInnerHTML={{__html:html}}/>}
export function MathView({text}:{text:string}){let h='';try{h=katex.renderToString(text,{throwOnError:false,displayMode:true,trust:false})}catch{h=''}return <div className="formula" dangerouslySetInnerHTML={{__html:h}}/>}
export function Highlight({code,language}:{code:string;language:string}){let h;try{h=hljs.getLanguage(language)?hljs.highlight(code,{language}).value:hljs.highlightAuto(code).value}catch{h=code.replace(/</g,'&lt;')}return <pre className="code-view"><span className="line-numbers">{code.split('\n').map((_,i)=><span key={i}>{i+1}</span>)}</span><code dangerouslySetInnerHTML={{__html:h}}/></pre>}
export function MermaidView({text}:{text:string}){const ref=useRef<HTMLDivElement>(null),[error,setError]=useState('');useEffect(()=>{let active=true;import('mermaid').then(async({default:m})=>{m.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',themeVariables:{primaryColor:'#edf4ff',primaryTextColor:'#223449',lineColor:'#7897bf'}});try{const {svg}=await m.render('mermaid-'+crypto.randomUUID(),text);if(active&&ref.current){ref.current.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true}});setError('')}}catch{if(active)setError('图表语法有误，请检查 Mermaid 源码')}});return()=>{active=false}},[text]);return <div className="mermaid"><div ref={ref}/>{error&&<p className="error">{error}</p>}</div>}
export function safeHref(url:string){return /^(https?:\/\/|\/api\/assets\/)/i.test(url)?url:'#';}
