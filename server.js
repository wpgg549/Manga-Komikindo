const express = require("express");
const axios = require("axios");
const JSZip = require("jszip");
const path = require("path");
const cors = require("cors");
const { jsPDF } = require("jspdf");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Helper ambil list gambar via API Siputzx
async function fetchImages(url){
    const api = `https://api.siputzx.my.id/api/anime/komikindo-download?url=${encodeURIComponent(url)}`;
    const res = await axios.get(api);
    return res.data.data;
}

// Proxy route untuk frontend (hindari bot found)
app.get("/proxy", async (req,res)=>{
    try{
        const { url } = req.query;
        const images = await fetchImages(url);
        res.json({ data: images });
    } catch(e){
        res.status(500).json({error:"Fetch failed"});
    }
});

// Download ZIP
app.get("/download/zip", async (req,res)=>{
    try{
        const { url } = req.query;
        const images = await fetchImages(url);
        const zip = new JSZip();
        for(let i=0;i<images.length;i++){
            const imgResp = await axios.get(images[i], { responseType: "arraybuffer" });
            zip.file(`${String(i+1).padStart(3,"0")}.jpg`, imgResp.data);
        }
        const content = await zip.generateAsync({type:"nodebuffer"});
        res.set({
            "Content-Type":"application/zip",
            "Content-Disposition":"attachment; filename=manga.zip"
        });
        res.send(content);
    } catch(e){
        res.status(500).send("Error generating ZIP");
    }
});

// Download PDF
app.get("/download/pdf", async (req,res)=>{
    try{
        const { url } = req.query;
        const images = await fetchImages(url);
        const pdf = new jsPDF({orientation:"portrait", unit:"px"});
        for(let i=0;i<images.length;i++){
            const imgResp = await axios.get(images[i], { responseType:"arraybuffer" });
            const imgBase64 = Buffer.from(imgResp.data).toString('base64');
            const imgData = "data:image/jpeg;base64," + imgBase64;
            const w = pdf.internal.pageSize.getWidth();
            const ratio = w / 800;
            const h = 600 * ratio;
            if(i>0) pdf.addPage();
            pdf.addImage(imgData,"JPEG",0,0,w,h);
        }
        const pdfData = pdf.output("arraybuffer");
        res.set({
            "Content-Type":"application/pdf",
            "Content-Disposition":"attachment; filename=manga.pdf"
        });
        res.send(Buffer.from(pdfData));
    } catch(e){
        res.status(500).send("Error generating PDF");
    }
});

app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
