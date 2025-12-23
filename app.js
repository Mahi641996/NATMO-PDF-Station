let selectedFiles = [];
const fileList = document.getElementById("fileList");
const addMoreBox = document.getElementById("addMoreBox");

/* ===== FILE INPUT ===== */
document.getElementById("fileInput").addEventListener("change", e => {
  const newFiles = Array.from(e.target.files);

  // For split/delete/rotate → replace
  if (!["merge","img2pdf"].includes(currentAction)) {
    selectedFiles = newFiles;
  } else {
    selectedFiles = selectedFiles.concat(newFiles);
  }

  renderFileList();

  // Show add-more only for merge & image->pdf AFTER first upload
  if (["merge","img2pdf"].includes(currentAction) && selectedFiles.length>0) {
    addMoreBox.style.display="block";
  }

  e.target.value="";
});

/* ===== FILE LIST ===== */
function renderFileList(){
  fileList.innerHTML="";
  selectedFiles.forEach((file,index)=>{
    const li=document.createElement("li");
    li.draggable=true;
    li.innerHTML=`<span>${file.name}</span>
      <button style="float:right;color:red;border:none;background:none;cursor:pointer;">✖</button>`;
    li.querySelector("button").onclick=()=>{
      selectedFiles.splice(index,1);
      renderFileList();
      if(selectedFiles.length===0) addMoreBox.style.display="none";
    };
    li.ondragstart=e=>e.dataTransfer.setData("i",index);
    li.ondragover=e=>e.preventDefault();
    li.ondrop=e=>{
      const from=e.dataTransfer.getData("i");
      [selectedFiles[from],selectedFiles[index]]=[selectedFiles[index],selectedFiles[from]];
      renderFileList();
    };
    fileList.appendChild(li);
  });
}

/* ===== HELPERS ===== */
function getSinglePDF(){
  const pdfs=selectedFiles.filter(f=>f.type==="application/pdf");
  if(pdfs.length!==1){ alert("Please select exactly ONE PDF file."); return null; }
  return pdfs[0];
}

function parseRanges(str){
  const set=new Set();
  str.split(",").forEach(p=>{
    if(p.includes("-")){
      let[s,e]=p.split("-").map(Number);
      for(let i=s;i<=e;i++) set.add(i-1);
    } else set.add(parseInt(p)-1);
  });
  return [...set];
}

function download(bytes,name){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([bytes]));
  a.download=name;
  a.click();
}

/* ===== MERGE ===== */
async function mergePDF(){
  const pdfs=selectedFiles.filter(f=>f.type==="application/pdf");
  if(pdfs.length<2) return alert("Select at least two PDFs");
  const out=await PDFLib.PDFDocument.create();
  for(const f of pdfs){
    const src=await PDFLib.PDFDocument.load(await f.arrayBuffer());
    const pages=await out.copyPages(src,src.getPageIndices());
    pages.forEach(p=>out.addPage(p));
  }
  download(await out.save(),"merged.pdf");
}

/* ===== SPLIT ===== */
async function splitPDF(){
  const file=getSinglePDF(); if(!file) return;
  const ranges=document.getElementById("ranges").value.trim();
  if(!ranges) return alert("Enter page numbers");
  const src=await PDFLib.PDFDocument.load(await file.arrayBuffer());
  const out=await PDFLib.PDFDocument.create();
  for(const i of parseRanges(ranges)){
    const[p]=await out.copyPages(src,[i]);
    out.addPage(p);
  }
  download(await out.save(),"split.pdf");
}

/* ===== DELETE ===== */
async function deletePages(){
  const file=getSinglePDF(); if(!file) return;
  const ranges=document.getElementById("ranges").value.trim();
  if(!ranges) return alert("Enter page numbers");
  const del=new Set(parseRanges(ranges));
  const src=await PDFLib.PDFDocument.load(await file.arrayBuffer());
  const out=await PDFLib.PDFDocument.create();
  for(let i=0;i<src.getPageCount();i++){
    if(!del.has(i)){
      const[p]=await out.copyPages(src,[i]);
      out.addPage(p);
    }
  }
  download(await out.save(),"deleted.pdf");
}

/* ===== ROTATE ===== */
async function rotatePages(){
  const file=getSinglePDF(); if(!file) return;
  const opt=document.getElementById("rotateOption").value;
  const pdf=await PDFLib.PDFDocument.load(await file.arrayBuffer());
  pdf.getPages().forEach(p=>{
    const{width,height}=p.getSize();
    if(opt==="90")p.setRotation(PDFLib.degrees(90));
    if(opt==="180")p.setRotation(PDFLib.degrees(180));
    if(opt==="270")p.setRotation(PDFLib.degrees(270));
    if(opt==="flipH"){p.scale(-1,1);p.translate(width,0);}
    if(opt==="flipV"){p.scale(1,-1);p.translate(0,height);}
  });
  download(await pdf.save(),"rotated.pdf");
}

/* ===== IMAGE → PDF ===== */
async function imagesToPdf(){
  const imgs=selectedFiles.filter(f=>f.type.startsWith("image/"));
  if(!imgs.length) return alert("Select image files");
  const{jsPDF}=window.jspdf;
  const size=document.getElementById("pageSize").value;
  const orient=document.getElementById("orientation").value;
  const pdf=new jsPDF({orientation:orient,format:size});
  for(let i=0;i<imgs.length;i++){
    const data=await new Promise(r=>{
      const fr=new FileReader();
      fr.onload=()=>r(fr.result);
      fr.readAsDataURL(imgs[i]);
    });
    if(i>0)pdf.addPage();
    pdf.addImage(data,"JPEG",10,10,
      pdf.internal.pageSize.getWidth()-20,
      pdf.internal.pageSize.getHeight()-20);
  }
  pdf.save("images.pdf");
}
