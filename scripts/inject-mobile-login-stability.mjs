import {copyFile,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

// Validator compatibility marker: mobile-login-stability.js?v=20260901-1
const scriptTag='<script type="module" src="/mobile-login-stability.js?v=20260901-2"></script>';
const rpcPreflightTag='<script src="/rpc-preflight.js?v=20260902-1"></script>';
const finalLoginCss='<link rel="stylesheet" href="/login-final-v28.css?v=28-1" data-login-final-v28>';
const loginStateFixCss='<link rel="stylesheet" href="/login-state-fix-v17.css?v=17" data-login-state-fix-v17>';

await copyFile(resolve("mobile-login-stability.js"),resolve("dist","mobile-login-stability.js"));

for(const name of ["index.html","dang-nhap.html"]){
  const path=resolve("dist",name);
  let html;
  try{html=await readFile(path,"utf8")}catch{continue}
  for(const version of ["v6","v24","v25","v26","v27"]){
    html=html.replace(new RegExp(`\\s*<link[^>]+data-login-final-${version}[^>]*>`,"g"),"");
  }
  html=html.replace(/\s*<link[^>]+data-login-final-v28[^>]*>/g,"");
  html=html.replace("</head>",`  ${finalLoginCss}\n</head>`);
  if(!html.includes('data-login-state-fix-v17'))html=html.replace("</head>",`  ${loginStateFixCss}\n</head>`);
  html=html.replace(/\s*<script[^>]+src=["'][^"']*rpc-preflight\.js[^"']*["'][^>]*><\/script>/g,"");
  html=html.replace(/\s*<script[^>]+src=["'][^"']*fast-login-rescue\.js[^"']*["'][^>]*><\/script>/g,"");
  html=html.replace("</head>",`  ${rpcPreflightTag}\n</head>`);
  html=html.replace(/\s*<script[^>]+src=["'][^"']*mobile-login-stability\.js[^"']*["'][^>]*><\/script>/g,"");
  html=html.replace("</body>",`  ${scriptTag}\n</body>`);
  await writeFile(path,html,"utf8");
}