const PACKAGE_WORDING=/đào\s+tạo\s+lái\s+xe\s+trọn\s+gói/iu;
const PACKAGE_WORDING_GLOBAL=/đào\s+tạo\s+lái\s+xe\s+trọn\s+gói/giu;
const UNVERIFIED_CENTER=/trung\s+tâm\s+đào\s+tạo\s+lái\s+xe\s+thầy\s+đạt/giu;
const LEGACY_HOSTS=/https?:\/\/(?:www\.)?(?:daotaolaixetrongoi\.com|hoc-vien-thay-dat\.vercel\.app|daotaolaixe-thaydat\.vercel\.app)/giu;
const PRIMARY_ORIGIN="https://hoclaixecungdat.vercel.app";
const TEXT_ATTRIBUTES=["title","aria-label","alt","content","href"];

function cleanValue(value=""){
  const source=String(value);
  return source
    .replace(PACKAGE_WORDING_GLOBAL,"")
    .replace(UNVERIFIED_CENTER,"Học lái xe cùng Đạt")
    .replace(LEGACY_HOSTS,PRIMARY_ORIGIN)
    .replace(/\s*[·|•–—-]\s*[·|•–—-]\s*/gu," · ")
    .replace(/^[\s·|•–—-]+|[\s·|•–—-]+$/gu,"")
    .replace(/[ \t]{2,}/g," ")
    .trim();
}

function hideEmptyStandalone(parent){
  if(!parent||!["SMALL","SPAN","P","STRONG","B","EM"].includes(parent.tagName))return;
  if(parent.children.length===0&&!String(parent.textContent||"").trim())parent.hidden=true;
}

function cleanTextNode(node){
  if(!node||node.nodeType!==Node.TEXT_NODE)return;
  const parent=node.parentElement;
  if(parent?.closest("script,style,noscript,template"))return;
  const before=node.nodeValue||"";
  const after=cleanValue(before);
  if(after===before)return;
  node.nodeValue=after;
  hideEmptyStandalone(parent);
}

function cleanElement(element){
  if(!(element instanceof Element))return;
  if(element.matches("script,style,noscript,template"))return;
  for(const attribute of TEXT_ATTRIBUTES){
    if(!element.hasAttribute(attribute))continue;
    const before=element.getAttribute(attribute)||"";
    const after=cleanValue(before);
    if(after!==before)element.setAttribute(attribute,after);
  }
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode()))cleanTextNode(node);
}

function cleanPage(){cleanElement(document.documentElement)}

const observer=new MutationObserver(records=>{
  for(const record of records){
    if(record.type==="characterData")cleanTextNode(record.target);
    if(record.type==="attributes")cleanElement(record.target);
    if(record.type==="childList")record.addedNodes.forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE)cleanTextNode(node);
      else if(node.nodeType===Node.ELEMENT_NODE)cleanElement(node);
    });
  }
});

cleanPage();
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:TEXT_ATTRIBUTES});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",cleanPage,{once:true});
window.addEventListener("pageshow",cleanPage);
