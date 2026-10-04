import{c as u,i as E,j as d,m as l}from"../chunks/chunk-7OERSEEX.js";var C=new Set(["SCRIPT","STYLE","NOSCRIPT","TEMPLATE","SVG","BUTTON","FORM","IFRAME"]),N=new Set(["P","DIV","SECTION","ARTICLE","H1","H2","H3","H4","H5","H6","UL","OL","LI","BLOCKQUOTE","PRE","FIGURE","FIGCAPTION","TABLE","HR"]);function p(e){return e.nodeType===Node.ELEMENT_NODE&&(C.has(e.tagName.toUpperCase())||e.getAttribute("aria-hidden")==="true"||e.hidden)}function m(e){return e.replace(/([\\`*_[\]])/g,"\\$1")}function s(e){let t="";for(let n of e.childNodes){if(n.nodeType===Node.TEXT_NODE){t+=m(n.textContent.replace(/\s+/g," "));continue}if(n.nodeType!==Node.ELEMENT_NODE||p(n))continue;let c=n.tagName.toUpperCase(),r=()=>s(n).trim();switch(c){case"BR":t+=`  
`;break;case"STRONG":case"B":{let o=r();o&&(t+=`**${o}**`);break}case"EM":case"I":{let o=r();o&&(t+=`*${o}*`);break}case"CODE":t+=`\`${n.textContent}\``;break;case"A":{let o=r(),a=n.href;t+=a?`[${o||a}](${a})`:o;break}case"IMG":t+=g(n);break;default:t+=N.has(c)?` ${r()} `:s(n)}}return t}function g(e){let t=e.currentSrc||e.src;return t?`![${m(e.alt||"")}](${t})`:""}function A(e){let t=Array.from(e.querySelectorAll("tr")).map(r=>Array.from(r.children).map(o=>s(o).trim().replace(/\|/g,"\\|").replace(/\s*\n\s*/g," ")));if(t.length===0)return"";let n=Math.max(...t.map(r=>r.length)),c=r=>`| ${Array.from({length:n},(o,a)=>r[a]??"").join(" | ")} |`;return[c(t[0]),c(Array.from({length:n},()=>"---")),...t.slice(1).map(c)].join(`
`)}function T(e,t){let n=e.tagName.toUpperCase()==="OL",c=Number(e.getAttribute("start"))||1;return Array.from(e.children).filter(o=>o.tagName.toUpperCase()==="LI"&&!p(o)).map((o,a)=>{let b=n?`${c+a}.`:"-",L="  ".repeat(t),k=Array.from(o.children).filter(i=>["UL","OL"].includes(i.tagName.toUpperCase())),y=o.cloneNode(!0);for(let i of y.querySelectorAll(":scope > ul, :scope > ol"))i.remove();let w=s(y).trim(),h=k.map(i=>T(i,t+1)).join(`
`);return`${L}${b} ${w}${h?`
${h}`:""}`}).join(`
`)}function f(e){let t=[],n="",c=()=>{let r=n.replace(/[ \t]+/g," ").trim();r&&t.push(r),n=""};for(let r of e.childNodes){if(r.nodeType===Node.TEXT_NODE){n+=m(r.textContent.replace(/\s+/g," "));continue}if(r.nodeType!==Node.ELEMENT_NODE||p(r))continue;let o=r.tagName.toUpperCase();if(!N.has(o)){n+=s({childNodes:[r]});continue}c();let a=x(r,o);a&&t.push(a)}return c(),t.join(`

`)}function x(e,t){switch(t){case"H1":case"H2":case"H3":case"H4":case"H5":case"H6":{let n=s(e).trim();return n?`${"#".repeat(Number(t[1]))} ${n}`:""}case"P":return s(e).trim();case"UL":case"OL":return T(e,0);case"BLOCKQUOTE":return f(e).split(`
`).map(n=>n?`> ${n}`:">").join(`
`);case"PRE":return`\`\`\`
${e.textContent.replace(/\n$/,"")}
\`\`\``;case"HR":return"---";case"TABLE":return A(e);case"FIGCAPTION":{let n=s(e).trim();return n?`*${n}*`:""}default:return f(e)}}function O(e){return f(e).replace(/\n{3,}/g,`

`).trim()}var I=2e3;function $(){let e=document.querySelector('link[rel="canonical"]')?.href;if(e)return e;let t=new URL(window.location.href);return t.hash="",t.href}function S(e){let t=d(e,"source",'[data-rc-part="body"]'),n=document.querySelector(t);if(!n)return u(`copy: no body to copy \u2014 nothing matches ${t}.`,e),null;let c=document.querySelector("h1")?.textContent.trim();return`${[c?`# ${c}`:"",$()].filter(Boolean).join(`

`)}

---

${O(n)}
`}function H(e){let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.opacity="0",document.body.append(t),t.select();let n=!1;try{n=document.execCommand("copy")}catch{n=!1}return t.remove(),n}async function R(e){try{return await navigator.clipboard.writeText(e),!0}catch{return H(e)}}function U(e){let t=d(e,"content","link");if(t!=="link"&&t!=="markdown"){u(`copy: data-rc-content is "${t}"; use link or markdown.`,e);return}e instanceof HTMLButtonElement&&(e.type="button");let n=E(e,"done");n&&n.setAttribute("role","status");let c=0;e.addEventListener("click",async r=>{r.preventDefault();let o=t==="markdown"?S(e):$();if(o){if(!await R(o)){u("copy: the browser refused the clipboard.",e);return}l(e,"copied"),clearTimeout(c),c=setTimeout(()=>l(e,"ready"),I)}}),l(e,"ready")}export{U as default};
//# sourceMappingURL=copy.js.map
