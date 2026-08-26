import {copyFile,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const scriptTag='<script type="module" src="/mobile-login-stability.js?v=20260816-3"></script>';
const finalLoginCss='<link rel="stylesheet" href="/login-final-v6.css?v=6" data-login-final-v6>';
const loginStateFixCss='<link rel="stylesheet" href="/login-state-fix-v17.css?v=17" data-login-state-fix-v17>';

await copyFile(resolve("mobile-login-stability.js"),resolve("dist","mobile-login-stability.js"));

for(const name of ["index.html","dang-nhap.html"]){
  const path=resolve("dist",name);
  let html;
  try{html=await readFile(path,"utf8")}catch{continue}

  // Dat stylesheet login final ngay truoc </head>, sau toan bo CSS bundle cua Vite.
  if(!html.includes('data-login-final-v6')){
    html=html.replace("</head>",`  ${finalLoginCss}\n</head>`);
  }

  // Luon tai quy tac trang thai sau login-final de .hidden co quyen uu tien tuyet doi.
  if(!html.includes('data-login-state-fix-v17')){
    html=html.replace("</head>",`  ${loginStateFixCss}\n</head>`);
  }

  if(!html.includes("mobile-login-stability.js")){
    html=html.replace("</body>",`  ${scriptTag}\n</body>`);
  }

  await writeFile(path,html,"utf8");
}
