import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

function dataUrlToBytes(dataUrl) {
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function formatDateCompact(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}년${d.getMonth() + 1}월${d.getDate()}일`;
}

function formatDateFull(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export async function downloadMemberCert(member, returnBlob) {
  const pdfUrl = "/k-spara.pdf";
  const pdfBytes = await fetch(pdfUrl).then((r) => r.arrayBuffer());

  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(1);
  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");

  await page.render({ canvasContext: ctx, viewport }).promise;

  const fontSize = Math.round(18 * scale);
  ctx.font = `${fontSize}px 궁서, Gungsuh, serif`;
  ctx.textBaseline = "middle";

  function fillText(x, y, text, maxWidth) {
    const rectW = ((maxWidth || 180) * scale) / 1.4;
    const rectH = fontSize + 6;
    ctx.fillStyle = "white";
    ctx.fillRect(x * scale, y * scale - rectH / 2, rectW, rectH);
    ctx.fillStyle = "black";
    ctx.fillText(text, x * scale, y * scale);
  }

  function fillText2(x, y, text, maxWidth) {
    const rectW = ((maxWidth || 180) * scale) / 1.8;
    const rectH = fontSize + 6;
    ctx.fillStyle = "white";
    ctx.fillRect(x * scale, y * scale - rectH / 2, rectW, rectH);
    ctx.fillStyle = "black";
    ctx.fillText(text, x * scale, y * scale);
  }

  const memberNumber = member.member_number || "";
  fillText(408, 228, `제 ${memberNumber} 호`, 180);

  const chars = [...member.name];
  const charGap = 50;
  const nameStartX = 408;
  ctx.font = `${Math.round(20 * scale)}px 궁서, Gungsuh, serif`;
  chars.forEach((ch, i) => {
    fillText(nameStartX + i * charGap, 285, ch, charGap);
  });
  ctx.font = `${Math.round(11 * scale)}px 궁서, Gungsuh, serif`;
  fillText2(408, 314, member.email, 280);
  ctx.font = `${Math.round(18 * scale)}px 궁서, Gungsuh, serif`;

  fillText(408, 341, formatDateCompact(member.created_at), 220);
  ctx.font = `${Math.round(25 * scale)}px 궁서, Gungsuh, serif`;

  fillText(217, 581, formatDateFull(member.approved_at), 250);

  const imgData = canvas.toDataURL("image/png");
  const imgBytes = dataUrlToBytes(imgData);

  const newPdf = await PDFDocument.create();
  const image = await newPdf.embedPng(imgBytes);
  const { width, height } = image.scale(1);
  const newPage = newPdf.addPage([width, height]);
  newPage.drawImage(image, { x: 0, y: 0, width, height });

  const finalBytes = await newPdf.save();

  const blob = new Blob([finalBytes], { type: "application/pdf" });

  if (returnBlob) {
    return blob;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `회원증_${member.name}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
