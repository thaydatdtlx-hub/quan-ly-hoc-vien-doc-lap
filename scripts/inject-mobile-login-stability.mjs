import {copyFile,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const scriptTag='<script type="module" src="/mobile-login-stability.js?v=20260826-4"></script>';
const finalLoginCss='<link rel="stylesheet" href="/login-final-v27.css?v=27" data-login-final-v27>';
const loginStateFixCss='<link rel="stylesheet" href="/login-state-fix-v17.css?v=17" data-login-state-fix-v17>';

await copyFile(resolve("mobile-login-stability.js"),resolve("dist","mobile-login-stability.js"));

for(const name of ["index.html","dang-nhap.html"]){
  const path=resolve("dist",name);
  let html;
  try{html=await readFile(path,"utf8")}catch{continue}

  html=html.replace(/\s*<link[^>]+data-login-final-v6[^>]*>/g,"");
  html=html.replace(/\s*<link[^>]+data-login-final-v24[^>]*>/g,"");
  html=html.replace(/\s*<link[^>]+data-login-final-v25[^>]*>/g,"");
  html=html.replace(/\s*<link[^>]+data-login-final-v26[^>]*>/g,"");

  if(!html.includes('data-login-final-v27')){
    html=html.replace("</head>",`  ${finalLoginCss}\n</head>`);
  }

  if(!html.includes('data-login-state-fix-v17')){
    html=html.replace("</head>",`  ${loginStateFixCss}\n</head>`);
  }

  if(!html.includes("mobile-login-stability.js")){
    html=html.replace("</body>",`  ${scriptTag}\n</body>`);
  }

  await writeFile(path,html,"utf8");
}
