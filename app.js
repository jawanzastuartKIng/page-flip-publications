const config=window.FLIPBOOK_CONFIG||{};
const $=id=>document.getElementById(id);
const els=Object.fromEntries(["viewerShell","publicationTitle","pageStatus","openButton","shareButton","fullscreenButton","dropZone","bookMount","flipbook","welcome","welcomeOpen","loading","loadingText","loadingProgress","dropMessage","controlDock","thumbButton","firstPage","previousPage","dockPrevious","pageInput","pageTotal","dockNext","nextPage","lastPage","zoomOut","zoomIn","downloadButton","thumbDrawer","closeThumbs","thumbGrid","fileInput"].map(id=>[id,$(id)]));
const pdfjsUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
let pdfDoc=null,pageFlip=null,currentUrl="",objectUrl="",zoom=1,hasBackPadding=false;

document.documentElement.style.setProperty("--accent",config.accent||"#28b6d8");
els.publicationTitle.textContent=config.title||"My Publication";document.title=config.title||"My Publication";
function loading(show,text="Opening publication…",progress="Please wait"){els.loading.hidden=!show;els.loadingText.textContent=text;els.loadingProgress.textContent=progress}
function error(message){loading(false);els.pageStatus.textContent=message;alert(message)}
async function pdfjs(){const lib=await import(pdfjsUrl);lib.GlobalWorkerOptions.workerSrc=workerUrl;return lib}
async function renderCanvas(pageNumber,targetWidth=900){const page=await pdfDoc.getPage(pageNumber),base=page.getViewport({scale:1}),scale=targetWidth/base.width,viewport=page.getViewport({scale});const canvas=document.createElement("canvas");canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);await page.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport}).promise;return canvas}

async function loadPdf(source,name="Publication",url=""){
  loading(true,"Opening publication…","Reading PDF");
  try{
    if(pageFlip){pageFlip.destroy();pageFlip=null}els.flipbook.textContent="";els.thumbGrid.textContent="";
    const lib=await pdfjs();pdfDoc=await lib.getDocument(source).promise;currentUrl=url;
    els.publicationTitle.textContent=name.replace(/\.pdf$/i,"");document.title=els.publicationTitle.textContent;els.welcome.hidden=true;els.controlDock.hidden=false;els.downloadButton.hidden=config.allowDownload===false||!url;
    if(url){els.downloadButton.href=url;els.downloadButton.download=name}
    const pages=[];hasBackPadding=pdfDoc.numPages%2===1;
    for(let n=1;n<=pdfDoc.numPages;n++){
      loading(true,"Building flipbook…",`Rendering page ${n} of ${pdfDoc.numPages}`);
      if(hasBackPadding&&n===pdfDoc.numPages){const inside=document.createElement("div");inside.className="page inside-cover";inside.dataset.density="soft";els.flipbook.append(inside);pages.push(inside)}
      const page=document.createElement("div");page.className=`page${n===1||n===pdfDoc.numPages?" page-cover":""}`;page.dataset.density="soft";
      page.append(await renderCanvas(n));const label=document.createElement("span");label.className="page-number";label.textContent=n;page.append(label);els.flipbook.append(page);pages.push(page);
    }
    if(!window.St?.PageFlip)throw new Error("The page-turn engine did not load. Refresh and try again.");
    pageFlip=new window.St.PageFlip(els.flipbook,{width:695,height:900,size:"stretch",minWidth:280,maxWidth:1000,minHeight:370,maxHeight:1450,showCover:true,usePortrait:true,mobileScrollSupport:false,autoSize:true,drawShadow:true,maxShadowOpacity:.62,flippingTime:950,clickEventForward:true,swipeDistance:24,showPageCorners:true,disableFlipByClick:false});
    pageFlip.loadFromHTML(pages);pageFlip.on("flip",e=>update(internalToPdf(e.data)));pageFlip.on("changeOrientation",()=>setTimeout(()=>centerBook(Number(els.pageInput.value)||1),80));update(1);buildThumbs();fitBook();setTimeout(()=>centerBook(1),120);loading(false);
  }catch(e){error(e.message||"This PDF could not be opened.")}
}

function update(page){if(!pdfDoc)return;els.pageInput.value=page;els.pageTotal.textContent=`/ ${pdfDoc.numPages}`;els.pageStatus.textContent=`Page ${page} of ${pdfDoc.numPages}`;[els.previousPage,els.dockPrevious,els.firstPage].forEach(b=>b.disabled=page<=1);[els.nextPage,els.dockNext,els.lastPage].forEach(b=>b.disabled=page>=pdfDoc.numPages);document.querySelectorAll(".thumb").forEach(t=>t.classList.toggle("active",Number(t.dataset.page)===page));setTimeout(()=>centerBook(page),40)}
function pdfToInternal(page){return hasBackPadding&&page===pdfDoc.numPages?page:page-1}
function internalToPdf(index){if(hasBackPadding&&index===pdfDoc.numPages-1)return pdfDoc.numPages-1;if(hasBackPadding&&index>=pdfDoc.numPages)return pdfDoc.numPages;return Math.min(index+1,pdfDoc.numPages)}
function centerBook(page){const frame=els.flipbook.querySelector(".stf__parent");if(!frame||!pdfDoc)return;if(matchMedia("(max-width: 780px)").matches){els.flipbook.style.transform="translateX(0px)";return}const quarter=frame.offsetWidth/4;const offset=page===1?-quarter:page===pdfDoc.numPages?quarter:0;els.flipbook.style.transform=`translateX(${offset}px)`}
function fitBook(){els.bookMount.style.setProperty("--zoom",zoom)}
function flipNext(){pageFlip?.flipNext("top")}
function flipPrev(){pageFlip?.flipPrev("top")}
async function buildThumbs(){for(let n=1;n<=pdfDoc.numPages;n++){const b=document.createElement("button");b.className="thumb";b.dataset.page=n;b.type="button";const c=await renderCanvas(n,170),s=document.createElement("span");s.textContent=n;b.append(c,s);b.onclick=()=>{pageFlip.flip(pdfToInternal(n),"top");els.thumbDrawer.hidden=true};els.thumbGrid.append(b)}}
function choose(){els.fileInput.click()}
function openFile(file){if(!file||(!file.type.includes("pdf")&&!file.name.toLowerCase().endsWith(".pdf")))return error("Please choose a PDF file.");if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);loadPdf({url:objectUrl},file.name,objectUrl)}
async function share(){const data={title:els.publicationTitle.textContent,text:`View ${els.publicationTitle.textContent}`,url:location.href};if(navigator.share){try{await navigator.share(data)}catch{}}else{await navigator.clipboard.writeText(location.href);els.pageStatus.textContent="Link copied"}}

[els.openButton,els.welcomeOpen].forEach(b=>b.addEventListener("click",choose));els.fileInput.addEventListener("change",e=>openFile(e.target.files[0]));[els.nextPage,els.dockNext].forEach(b=>b.addEventListener("click",flipNext));[els.previousPage,els.dockPrevious].forEach(b=>b.addEventListener("click",flipPrev));els.firstPage.onclick=()=>pageFlip?.flip(0,"top");els.lastPage.onclick=()=>pageFlip?.flip(pdfToInternal(pdfDoc.numPages),"top");els.pageInput.onchange=()=>pageFlip?.flip(pdfToInternal(Math.max(1,Math.min(pdfDoc.numPages,Number(els.pageInput.value)))),"top");els.zoomIn.onclick=()=>{zoom=Math.min(1.22,zoom+.08);fitBook()};els.zoomOut.onclick=()=>{zoom=Math.max(.72,zoom-.08);fitBook()};els.thumbButton.onclick=()=>els.thumbDrawer.hidden=!els.thumbDrawer.hidden;els.closeThumbs.onclick=()=>els.thumbDrawer.hidden=true;els.fullscreenButton.onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();els.shareButton.onclick=share;
document.addEventListener("keydown",e=>{if(e.key==="ArrowRight"||e.key==="PageDown")flipNext();if(e.key==="ArrowLeft"||e.key==="PageUp")flipPrev();if(e.key==="Escape")els.thumbDrawer.hidden=true});els.dropZone.addEventListener("dragover",e=>{e.preventDefault();els.viewerShell.classList.add("dragging")});els.dropZone.addEventListener("dragleave",()=>els.viewerShell.classList.remove("dragging"));els.dropZone.addEventListener("drop",e=>{e.preventDefault();els.viewerShell.classList.remove("dragging");openFile(e.dataTransfer.files[0])});
const params=new URLSearchParams(location.search),defaultPdf=params.get("pdf")||config.defaultPdf;if(defaultPdf){loadPdf({url:defaultPdf},params.get("title")||defaultPdf.split("/").pop()||config.title,defaultPdf)}else{loading(false);els.welcome.hidden=false;els.controlDock.hidden=true}
