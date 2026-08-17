import {copyFile,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
const tag='<script type="module" src="/mobile-login-stability.js?v=20260816-3"></script>';
await copyFile(resolve("mobile-login-stability.js"),resolve("dist","mobile-login-stability.js"));
for(const name of ["index.html","dang-nhap.html"]){
  const path=resolve("dist",name);
  let html;
  try{html=await readFile(path,"utf8")}catch{continue}
  if(html.includes("mobile-login-stability.js"))continue;
  await writeFile(path,html.replace("</body>",`  ${tag}\n</body>`),"utf8");
}
