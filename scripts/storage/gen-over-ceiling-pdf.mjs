// Generate a 65-page test PDF over the 60-page ceiling (AC-2 refusal proof).
import { createRequire } from "module";
import { writeFileSync } from "fs";

const req = createRequire("file:///C:/Users/SBS/OneDrive/Bureau/deepseek/pcem-study-companion/");
const { PDFDocument } = req("pdf-lib");

const doc = await PDFDocument.create();
for (let i = 0; i < 65; i++) {
  const page = doc.addPage([595, 842]);
  page.drawText("Page " + (i + 1) + " du cours de test.", { x: 40, y: 700, size: 11 });
}
const bytes = await doc.save();
writeFileSync(process.env.TEMP + "\\over-ceiling.pdf", bytes);
console.log("wrote", bytes.length, "bytes,", 65, "pages");
