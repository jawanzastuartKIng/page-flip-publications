const config = window.FLIPBOOK_CONFIG || {};
const $ = (id) => document.getElementById(id);
const els = Object.fromEntries(["app","publicationTitle","pageStatus","openButton","shareButton","fullscreenButton","welcome","welcomeOpen","viewer","dropZone","dropMessage","loading","loadingText","bookWrap","book","leftPaper","rightPaper","leftCanvas","rightCanvas","leftNumber","rightNumber","turnSheet","turnCanvas","toolbar","thumbPanel","thumbGrid","thumbButton","closeThumbs","zoomOut","zoomIn","zoomValue","firstPage","previousPage","pageInput","pageTotal","nextPage","lastPage","edgePrevious","edgeNext","printButton","downloadButton","fileInput"].map(id=>[id,$(id)]));

let pdfDoc=null,currentPage=1,zoom=1,currentUrl="",objectUrl="",renderToken=0,isTurning=false,touchStartX=0;
const pdfjsUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
const isMobile=()=>matchMedia("(max-width: 760px)").matches;
const spreadStart=(page)=>isMobile()?page:(page===1?1:(page%2===0?page:page-1));

document.documentElement.style.setProperty("--accent",config.accent||"#28b6d8");
document.documentElement.style.setProperty("--bg",config.background||"#151515");
els.publicationTitle.textContent=config.title||"My Publication";
document.title=config.title||"My Publication";

async function getPdfJs(){
  try{const lib=await import(pdfjsUrl);lib.GlobalWorkerOptions.workerSrc=workerUrl;return lib}
  catch(error){throw new Error("The PDF viewer could not load. Check your internet connection, then refresh.")}
}

function setLoading(show,text="Loading publication…"){els.loading.hidden=!show;els.loadingText.textContent=text}
function setError(message){setLoading(false);els.pageStatus.textContent=message;alert(message)}
function setButtons(){
  if(!pdfDoc)return;
  const first=currentPage<=1,last=currentPage>=pdfDoc.numPages;
  [els.firstPage,els.previousPage,els.edgePrevious].forEach(b=>b.disabled=first);
  [els.lastPage,els.nextPage,els.edgeNext].forEach(b=>b.disabled=last);
  els.pageInput.value=currentPage;els.pageTotal.textContent=`/ ${pdfDoc.numPages}`;
  els.pageStatus.textContent=`Page ${currentPage} of ${pdfDoc.numPages}`;
  els.zoomValue.textContent=`${Math.round(zoom*100)}%`;
}

async function loadPdf(source,name="Publication",url=""){
  setLoading(true,"Opening PDF…");
  try{
    const pdfjs=await getPdfJs();
    pdfDoc=await pdfjs.getDocument(source).promise;
    currentPage=Math.min(Math.max(Number(config.startPage)||1,1),pdfDoc.numPages);
    currentUrl=url;renderToken++;
    els.publicationTitle.textContent=name.replace(/\.pdf$/i,"")||config.title||"Publication";
    document.title=els.publicationTitle.textContent;
    els.welcome.hidden=true;els.viewer.hidden=false;els.toolbar.hidden=false;
    els.downloadButton.hidden=config.allowDownload===false||!url;
    if(url){els.downloadButton.href=url;els.downloadButton.download=name}
    await renderSpread();
    setLoading(false);
    buildThumbnails();
  }catch(error){setError(error.message||"This PDF could not be opened.")}
}

async function renderPage(number,canvas,maxWidth=1500){
  if(!number||number<1||number>pdfDoc.numPages)return false;
  const page=await pdfDoc.getPage(number);const base=page.getViewport({scale:1});
  const scale=Math.min(2,maxWidth/base.width);const viewport=page.getViewport({scale});
  canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);
  await page.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport}).promise;
  return true;
}

async function renderSpread(){
  if(!pdfDoc)return;const token=++renderToken;const start=spreadStart(currentPage);
  setLoading(true,"Rendering pages…");
  if(isMobile()){
    els.leftPaper.hidden=true;els.rightPaper.hidden=false;
    await renderPage(currentPage,els.rightCanvas);els.rightNumber.textContent=currentPage;
  }else if(start===1){
    els.leftPaper.hidden=true;els.rightPaper.hidden=false;
    await renderPage(1,els.rightCanvas);els.rightNumber.textContent="1";
  }else{
    els.leftPaper.hidden=false;els.rightPaper.hidden=start+1>pdfDoc.numPages;
    await Promise.all([renderPage(start,els.leftCanvas),renderPage(start+1,els.rightCanvas)]);
    els.leftNumber.textContent=start;els.rightNumber.textContent=start+1<=pdfDoc.numPages?start+1:"";
  }
  if(token!==renderToken)return;currentPage=start===1?1:(isMobile()?currentPage:start);setButtons();setLoading(false);highlightThumb();
}

async function goTo(page,direction=0){
  if(!pdfDoc||isTurning)return;page=Math.max(1,Math.min(pdfDoc.numPages,page));if(page===currentPage)return;
  isTurning=true;const source=direction<0?els.leftCanvas:els.rightCanvas;
  els.turnCanvas.width=source.width;els.turnCanvas.height=source.height;
  els.turnCanvas.getContext("2d").drawImage(source,0,0);
  const rect=source.getBoundingClientRect();els.turnSheet.style.width=`${rect.width}px`;els.turnSheet.style.height=`${rect.height}px`;
  els.turnSheet.hidden=false;els.turnSheet.className=`turn-sheet ${direction<0?"turn-previous":"turn-next"}`;
  setTimeout(async()=>{currentPage=page;await renderSpread();els.turnSheet.hidden=true;els.turnSheet.className="turn-sheet";isTurning=false},540);
}
function next(){goTo(currentPage+(isMobile()?1:(currentPage===1?1:2)),1)}
function previous(){goTo(currentPage-(isMobile()?1:(currentPage<=2?1:2)),-1)}
function setZoom(value){zoom=Math.max(.65,Math.min(1.65,value));els.bookWrap.style.setProperty("--book-zoom",zoom);setButtons()}

async function buildThumbnails(){
  els.thumbGrid.textContent="";
  for(let n=1;n<=pdfDoc.numPages;n++){
    const button=document.createElement("button");button.className="thumb";button.type="button";button.dataset.page=n;
    const canvas=document.createElement("canvas"),label=document.createElement("span");label.textContent=n;button.append(canvas,label);els.thumbGrid.append(button);
    button.addEventListener("click",()=>{goTo(n,n<currentPage?-1:1);els.thumbPanel.hidden=true});
    window.requestIdleCallback?window.requestIdleCallback(()=>renderPage(n,canvas,180)):setTimeout(()=>renderPage(n,canvas,180),n*35);
  }highlightThumb();
}
function highlightThumb(){document.querySelectorAll(".thumb").forEach(t=>t.classList.toggle("active",Number(t.dataset.page)===currentPage))}
function chooseFile(){els.fileInput.click()}
function openFile(file){
  if(!file||(!file.type.includes("pdf")&&!file.name.toLowerCase().endsWith(".pdf")))return setError("Please choose a PDF file.");
  if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);loadPdf({url:objectUrl},file.name,objectUrl)
}
async function share(){
  const data={title:els.publicationTitle.textContent,text:`View ${els.publicationTitle.textContent}`,url:location.href};
  if(navigator.share){try{await navigator.share(data)}catch{}}
  else{await navigator.clipboard.writeText(location.href);els.pageStatus.textContent="Link copied to clipboard"}
}

[els.openButton,els.welcomeOpen].forEach(b=>b.addEventListener("click",chooseFile));
els.fileInput.addEventListener("change",e=>openFile(e.target.files[0]));
els.nextPage.addEventListener("click",next);els.edgeNext.addEventListener("click",next);
els.previousPage.addEventListener("click",previous);els.edgePrevious.addEventListener("click",previous);
els.firstPage.addEventListener("click",()=>goTo(1,-1));els.lastPage.addEventListener("click",()=>goTo(pdfDoc.numPages,1));
els.pageInput.addEventListener("change",()=>goTo(Number(els.pageInput.value),Number(els.pageInput.value)<currentPage?-1:1));
els.zoomIn.addEventListener("click",()=>setZoom(zoom+.1));els.zoomOut.addEventListener("click",()=>setZoom(zoom-.1));
els.thumbButton.addEventListener("click",()=>els.thumbPanel.hidden=!els.thumbPanel.hidden);els.closeThumbs.addEventListener("click",()=>els.thumbPanel.hidden=true);
els.fullscreenButton.addEventListener("click",()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen());
els.shareButton.addEventListener("click",share);els.printButton.addEventListener("click",()=>currentUrl?open(currentUrl,"_blank"):alert("Download the PDF first, then print it from your PDF viewer."));
document.addEventListener("keydown",e=>{if(e.key==="ArrowRight"||e.key==="PageDown")next();if(e.key==="ArrowLeft"||e.key==="PageUp")previous();if(e.key==="Escape")els.thumbPanel.hidden=true});
els.dropZone.addEventListener("dragover",e=>{e.preventDefault();els.app.classList.add("dragging")});
els.dropZone.addEventListener("dragleave",()=>els.app.classList.remove("dragging"));
els.dropZone.addEventListener("drop",e=>{e.preventDefault();els.app.classList.remove("dragging");openFile(e.dataTransfer.files[0])});
els.book.addEventListener("touchstart",e=>touchStartX=e.changedTouches[0].clientX,{passive:true});
els.book.addEventListener("touchend",e=>{const d=e.changedTouches[0].clientX-touchStartX;if(Math.abs(d)>45)(d<0?next:previous)()},{passive:true});
addEventListener("resize",()=>{if(pdfDoc)renderSpread()});

const params=new URLSearchParams(location.search);const defaultPdf=params.get("pdf")||config.defaultPdf;
if(defaultPdf){const title=params.get("title")||defaultPdf.split("/").pop()||config.title;loadPdf({url:defaultPdf},title,defaultPdf)}
