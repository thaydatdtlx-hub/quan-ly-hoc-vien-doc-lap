const BRAND_NAME="học lái xe cùng Đạt";
const BRAND_PATTERN=/THẦY ĐẠT|Thầy Đạt|thầy Đạt|thầy đạt/gu;
const ATTRIBUTES=["title","aria-label","alt","placeholder","content"];

function replaceBrand(value){
  return String(value??"").replace(BRAND_PATTERN,BRAND_NAME);
}

function updateTextNode(node){
  if(node.nodeType!==Node.TEXT_NODE||!BRAND_PATTERN.test(node.nodeValue||""))return;
  BRAND_PATTERN.lastIndex=0;
  node.nodeValue=replaceBrand(node.nodeValue);
}

function updateElement(element){
  if(!(element instanceof Element))return;
  for(const attribute of ATTRIBUTES){
    if(!element.hasAttribute(attribute))continue;
    const current=element.getAttribute(attribute)||"";
    const next=replaceBrand(current);
    if(next!==current)element.setAttribute(attribute,next);
  }

  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode()))updateTextNode(node);
}

function applyBrandName(root=document){
  const title=replaceBrand(document.title);
  if(title!==document.title)document.title=title;

  if(root.nodeType===Node.TEXT_NODE){
    updateTextNode(root);
    return;
  }

  if(root instanceof Element)updateElement(root);
  else root.querySelectorAll?.("*").forEach(updateElement);
}

function bootBrandName(){
  document.documentElement.classList.add("brand-hoc-lai-xe-cung-dat");
  applyBrandName(document);

  new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.type==="characterData")updateTextNode(mutation.target);
      for(const node of mutation.addedNodes)applyBrandName(node);
    }
  }).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootBrandName,{once:true});
else bootBrandName();
