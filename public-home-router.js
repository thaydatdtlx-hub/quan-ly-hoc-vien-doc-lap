const ROOT_PATHS=new Set(["/","/index.html"]);
const params=new URLSearchParams(location.search);
const explicitLogin=params.get("login")==="1";
const activeToken=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token");
const isLegacyAppRoot=ROOT_PATHS.has(location.pathname)&&Boolean(document.getElementById("loginForm"))&&!document.getElementById("registrationForm");

if(isLegacyAppRoot&&!explicitLogin&&!activeToken){
  location.replace("/");
}
