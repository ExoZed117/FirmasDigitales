import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { ethers } from "ethers";
import QRCode from "qrcode";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

import { sequelize, User, Document, Collaborator, AuditLog } from "./models";
// Importamos de manera segura nuestro nuevo servicio de notificaciones modular
import { NotificationService } from "./services/notificationService";

dotenv.config();

// Blockchain Client Setup
const providerUrl = process.env.PROVIDER_URL || "http://127.0.0.1:8545";
const privateKey = process.env.INSTITUTIONAL_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const contractAddress = process.env.CONTRACT_ADDRESS!;

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let blockchainContract: ethers.Contract;

try {
  provider = new ethers.JsonRpcProvider(providerUrl);
  wallet = new ethers.Wallet(privateKey, provider);
  const contractAbi = [
    "function owner() external view returns (address)",
    "function emitirCertificado(string _codigo, string _estudiante, address _estudianteWallet, bytes32 _hashDocumento) external",
    "function confirmarRecepcion(bytes32 _hashDocumento) external",
    "function revocarCertificado(bytes32 _hashDocumento, string _motivo) external",
    "function verificarCertificado(bytes32 _hashDocumento) external view returns (bool existe, string codigo, string estudiante, uint256 fechaEmision, bool valido, string motivoRevocacion, address emisor, address estudianteWallet, bool recepcionConfirmada, uint256 fechaRecepcion)",
    "function consultarCertificado(string _codigo) external view returns (bool existe, string estudiante, bytes32 hashDocumento, uint256 fechaEmision, bool valido, string motivoRevocacion, address emisor, address estudianteWallet, bool recepcionConfirmada, uint256 fechaRecepcion)",
    "function consultarHistorial(bytes32 _hashDocumento) external view returns (uint256 fechaEmision, address emisor, string cargoEmisor, bool recepcionConfirmada, uint256 fechaRecepcion, address estudianteWallet, bool valido, uint256 fechaRevocacion, string motivoRevocacion)"
  ];
  blockchainContract = new ethers.Contract(contractAddress, contractAbi, wallet);
  console.log("Blockchain Client initialized with wallet:", wallet.address);
} catch (err) {
  console.error("Failed to initialize Blockchain Client:", err);
}

// Helpers for Blockchain operations
async function registerCertificateOnBlockchain(doc: Document, hash: string): Promise<{
  txHash: string;
  blockNumber: number;
  contractAddress: string;
  timestamp: Date;
}> {
  if (!blockchainContract) {
    throw new Error("Cliente blockchain no inicializado");
  }
  const studentWallet = (doc.estudianteWallet && ethers.isAddress(doc.estudianteWallet))
    ? doc.estudianteWallet
    : ethers.ZeroAddress;

  console.log(`Enviando transaccion emitirCertificado para hash ${hash}...`);
  const tx = await blockchainContract.emitirCertificado(
    doc.codigo,
    doc.estudiante,
    studentWallet,
    hash
  );
  console.log(`Transaccion enviada: ${tx.hash}. Esperando confirmacion...`);
  const receipt = await tx.wait(1);
  if (!receipt) {
    throw new Error("La transaccion no retorno recibo");
  }
  console.log(`Transaccion confirmada en bloque ${receipt.blockNumber}`);

  let blockTimestamp = new Date();
  try {
    const block = await provider.getBlock(receipt.blockNumber);
    if (block) {
      blockTimestamp = new Date(Number(block.timestamp) * 1000);
    }
  } catch (err) {
    console.warn("No se pudo obtener la marca de tiempo del bloque, usando hora local:", err);
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    contractAddress: contractAddress,
    timestamp: blockTimestamp,
  };
}

async function generateCertificatePdf(doc: Document, finalHash: string, allCols: any[], blockchainDetails?: any) {
  const certDoc = await PDFDocument.create();
  const certPage = certDoc.addPage([600, 800]);
  const helveticaBold = await certDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaRegular = await certDoc.embedFont(StandardFonts.Helvetica);

  // Border decoration
  certPage.drawRectangle({
    x: 20,
    y: 20,
    width: 560,
    height: 760,
    borderColor: rgb(0.46, 0.23, 0.65),
    borderWidth: 2,
  });

  // Diagonal Watermark
  certPage.drawText("VALIDADO - BLOCKCHAIN", {
    x: 100,
    y: 300,
    size: 40,
    font: helveticaBold,
    color: rgb(0.95, 0.93, 0.97),
    rotate: degrees(45),
    opacity: 0.4,
  });

  // Banner decoration
  certPage.drawRectangle({
    x: 22,
    y: 730,
    width: 556,
    height: 48,
    color: rgb(0.46, 0.23, 0.65),
  });

  // Write certificate header title text safely
  certPage.drawText("CERTIFICADO DE AUTENTICIDAD ACADEMICA", {
    x: 50,
    y: 746,
    size: 16,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  certPage.drawText("El presente documento certifica la validez e integridad del archivo academico adjunto,", {
    x: 50,
    y: 690,
    size: 10,
    font: helveticaRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  certPage.drawText("el cual ha completado satisfactoriamente el flujo de consenso de firmas digitales.", {
    x: 50,
    y: 675,
    size: 10,
    font: helveticaRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  certPage.drawText("DETALLES DEL DOCUMENTO", { x: 50, y: 630, size: 12, font: helveticaBold, color: rgb(0.46, 0.23, 0.65) });
  certPage.drawText(`Estudiante: ${doc.estudiante}`, { x: 50, y: 605, size: 10, font: helveticaRegular });
  certPage.drawText(`Codigo de Registro: ${doc.codigo}`, { x: 50, y: 585, size: 10, font: helveticaRegular });
  certPage.drawText(`Hash SHA-256 del Documento Oficializado:`, { x: 50, y: 565, size: 10, font: helveticaBold });
  certPage.drawText(`${finalHash}`, { x: 50, y: 550, size: 9, font: helveticaRegular, color: rgb(0.4, 0.4, 0.4) });

  certPage.drawText("HISTORIAL DE FIRMAS (CONSENSO)", { x: 50, y: 500, size: 12, font: helveticaBold, color: rgb(0.46, 0.23, 0.65) });
  
  let yPos = 470;
  for (const col of allCols) {
    certPage.drawText(`Validador: ${col.name} (${col.email})`, { x: 50, y: yPos, size: 10, font: helveticaBold });
    certPage.drawText(`Firmado el: ${new Date(col.signedAt!).toLocaleString()}`, { x: 50, y: yPos - 15, size: 9, font: helveticaRegular, color: rgb(0.4, 0.4, 0.4) });
    
    if (col.signatureImage) {
      try {
        const base64Data = col.signatureImage.split(",")[1];
        const sigBytes = Buffer.from(base64Data, "base64");
        const sigImg = await certDoc.embedPng(sigBytes);
        certPage.drawImage(sigImg, {
          x: 420,
          y: yPos - 20,
          width: 80,
          height: 35,
        });
      } catch (e) {
        console.error("Failed to embed sig in cert:", e);
      }
    }
    yPos -= 50;
  }

  // Blockchain section
  certPage.drawText("RESPALDO EN BLOCKCHAIN", { x: 50, y: yPos - 10, size: 12, font: helveticaBold, color: rgb(0.46, 0.23, 0.65) });
  if (blockchainDetails) {
    certPage.drawText(`Estado: REGISTRADO`, { x: 50, y: yPos - 28, size: 9, font: helveticaBold, color: rgb(0, 0.5, 0) });
    certPage.drawText(`Direccion del Smart Contract: ${blockchainDetails.contractAddress}`, { x: 50, y: yPos - 40, size: 9, font: helveticaRegular });
    certPage.drawText(`Hash de Transaccion: ${blockchainDetails.txHash}`, { x: 50, y: yPos - 52, size: 9, font: helveticaRegular });
    certPage.drawText(`Numero de Bloque: ${blockchainDetails.blockNumber} | Fecha: ${blockchainDetails.timestamp.toLocaleString()}`, { x: 50, y: yPos - 64, size: 9, font: helveticaRegular });
  } else {
    certPage.drawText(`Estado: PENDIENTE DE REGISTRO EN BLOCKCHAIN`, { x: 50, y: yPos - 28, size: 9, font: helveticaBold, color: rgb(0.8, 0.5, 0) });
    certPage.drawText(`Direccion del Smart Contract: ${contractAddress}`, { x: 50, y: yPos - 40, size: 9, font: helveticaRegular });
  }

  certPage.drawText("Para verificar la autenticidad de su documento, cargue el Documento Oficializado en la", {
    x: 50,
    y: yPos - 85,
    size: 9,
    font: helveticaRegular,
    color: rgb(0.3, 0.3, 0.3),
  });
  certPage.drawText("plataforma de validacion. El sistema recalculara el hash y lo contrastara contra Ethereum.", {
    x: 50,
    y: yPos - 97,
    size: 9,
    font: helveticaRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Generate QR Code referencing the verification portal (running on port 5174)
  try {
    const frontendPublicUrl = process.env.FRONTEND_PUBLIC_URL || "http://localhost:5174";
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const verificationUrl = `${frontendPublicUrl}/?code=${doc.codigo}&apiUrl=${backendUrl}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 150 });
    const qrBase64 = qrDataUrl.split(",")[1];
    const qrBytes = Buffer.from(qrBase64, "base64");
    const qrImage = await certDoc.embedPng(qrBytes);

    certPage.drawImage(qrImage, {
      x: 460,
      y: 40,
      width: 80,
      height: 80,
    });
    certPage.drawText("Verificación QR", {
      x: 465,
      y: 30,
      size: 7,
      font: helveticaBold,
      color: rgb(0.46, 0.23, 0.65),
    });
  } catch (qrError) {
    console.error("Failed to generate/embed QR code:", qrError);
  }

  const certFilename = `certificate-${doc.id}.pdf`;
  const certFullPath = path.join(certDir, certFilename);
  const certPdfBytes = await certDoc.save();
  fs.writeFileSync(certFullPath, certPdfBytes);

  return `uploads/certificates/${certFilename}`;
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup folders for uploads
const uploadDir = path.join(__dirname, "../uploads");
const originalDir = path.join(uploadDir, "original");
const officialDir = path.join(uploadDir, "officialized");
const certDir = path.join(uploadDir, "certificates");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });
if (!fs.existsSync(officialDir)) fs.mkdirSync(officialDir, { recursive: true });
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

// Serve PDFs statically
app.use("/uploads", express.static(uploadDir));

// Config Multer for PDF upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, originalDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === "application/pdf" || ext === ".pdf" || ext === ".docx" || ext === ".doc") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF o Word (.docx, .doc)"));
    }
  },
});

// Helper: Calculate SHA-256 of a file buffer
function calculateSha256(buffer: Buffer): string {
  return "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
}

// ENDPOINTS

// 1. Get all documents for Admin Portal
app.get("/api/documents/admin", async (req, res) => {
  try {
    const docs = await Document.findAll({
      include: [
        { model: Collaborator, as: "collaborators" },
        { model: AuditLog, as: "auditLogs" },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(docs);
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Upload Document & Create Collaborators
app.post("/api/documents", upload.single("pdf"), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { codigo, estudiante, estudianteWallet, collaboratorsJson, requireFacial } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "Debe subir un archivo de certificado" });
    }

    // Convert Word to PDF if uploaded file is docx or doc
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isWord = ext === ".docx" || ext === ".doc";

    if (isWord) {
      const docxPath = path.resolve(req.file.path);
      const pdfFilename = req.file.filename.replace(/\.(docx|doc)$/i, "") + ".pdf";
      const pdfPath = path.join(originalDir, pdfFilename);

      const powershellCmd = `
$word = New-Object -ComObject Word.Application;
$word.Visible = $false;
try {
    $doc = $word.Documents.Open('${docxPath.replace(/\\/g, '\\\\')}');
    $doc.SaveAs('${pdfPath.replace(/\\/g, '\\\\')}', 17);
    $doc.Close();
    Write-Host "Success";
} catch {
    Write-Error $_;
} finally {
    $word.Quit();
}
      `.trim();

      const escapedCmd = powershellCmd.replace(/\n/g, ' ');
      try {
        await execPromise(`powershell -Command "${escapedCmd}"`);

        if (!fs.existsSync(pdfPath)) {
          throw new Error("No se pudo generar el archivo PDF.");
        }

        // Delete original Word file
        try {
          fs.unlinkSync(docxPath);
        } catch (unlinkErr) {
          console.warn("No se pudo eliminar el archivo Word original:", unlinkErr);
        }

        // Update req.file details to reflect PDF
        req.file.filename = pdfFilename;
        req.file.path = pdfPath;
        req.file.mimetype = "application/pdf";
      } catch (convErr: any) {
        console.error("Error al convertir Word a PDF:", convErr);
        await transaction.rollback();
        return res.status(500).json({ error: `Error en la conversion del archivo Word a PDF: ${convErr.message}` });
      }
    }

    const collaboratorsData = JSON.parse(collaboratorsJson || "[]");

    // Check if code already exists
    const existingDoc = await Document.findOne({ where: { codigo } });
    if (existingDoc) {
      return res.status(400).json({ error: "El codigo de certificado ya esta registrado en la base de datos" });
    }

    const requireFacialBool = requireFacial === "true" || requireFacial === true;

    // Create Document
    const newDoc = await Document.create(
      {
        codigo,
        estudiante,
        estudianteWallet: estudianteWallet || null,
        status: "pending",
        originalPath: `uploads/original/${req.file.filename}`,
        requireFacial: requireFacialBool,
      },
      { transaction }
    );

    // Create Audit Log: Subida
    await AuditLog.create(
      {
        documentId: newDoc.id,
        action: "Subida",
        details: `El documento fue subido por el administrador. Archivo: ${req.file.originalname}`,
      },
      { transaction }
    );

    // Create Collaborators and invitations
    const createdCols = [];
    for (const col of collaboratorsData) {
      const token = uuidv4();
      const newCol = await Collaborator.create(
        {
          documentId: newDoc.id,
          name: col.name,
          email: col.email,
          phone: col.phone || null,
          token,
          signed: false,
          posX: col.posX || 100,
          posY: col.posY || 100,
          page: col.page || 1,
        },
        { transaction }
      );
      createdCols.push(newCol);

      // Create Audit Log: Invitación
      await AuditLog.create(
        {
          documentId: newDoc.id,
          action: "Envio_Invitacion",
          details: `Invitacion a firmar enviada a ${col.name} (${col.email}). Link: /sign/${token}`,
        },
        { transaction }
      );

      // ==========================================================
      // INTEGRACIÓN DEL SERVICIO MODULAR DE CORREO Y WHATSAPP LOCAL
      // ==========================================================
      NotificationService.sendAll({
        toEmail: col.email,
        toPhone: col.phone,
        validatorName: col.name,
        studentName: estudiante,
        certificateCode: codigo,
        token: token
      });
      // ==========================================================
    }

    // Update document with fechaEnvioSolicitud
    newDoc.fechaEnvioSolicitud = new Date();
    await newDoc.save({ transaction });

    await transaction.commit();

    res.json({
      document: newDoc,
      collaborators: createdCols,
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error("Error creating document:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Get document details by token for Collaborator Portal
app.get("/api/documents/sign/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const collaborator = await Collaborator.findOne({
      where: { token },
      include: [{ 
        model: Document, 
        as: "document",
        include: [{ model: Collaborator, as: "collaborators" }]
      }],
    });

    if (!collaborator) {
      return res.status(404).json({ error: "Enlace de invitacion invalido o expirado" });
    }

    res.json(collaborator);
  } catch (error: any) {
    console.error("Error fetching invitation details:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Submit Signature (Sign Canvas & Draw into PDF)
app.post("/api/documents/sign/:token", async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { token } = req.params;
    const { signatureImage } = req.body; // Base64 data url

    if (!signatureImage) {
      return res.status(400).json({ error: "Falta la imagen de la firma" });
    }

    const collaborator = await Collaborator.findOne({
      where: { token, signed: false },
      include: [{ model: Document, as: "document" }],
    });

    if (!collaborator) {
      return res.status(404).json({ error: "Colaborador no encontrado o ya ha firmado este documento" });
    }

    const doc = collaborator.document;

    // 1. Update collaborator status
    collaborator.signed = true;
    collaborator.signedAt = new Date();
    collaborator.signatureImage = signatureImage;
    await collaborator.save({ transaction });

    // 2. Create Audit Log: Firma
    await AuditLog.create(
      {
        documentId: doc.id,
        action: "Firma_Validador",
        details: `El colaborador ${collaborator.name} (${collaborator.email}) realizo su firma digital.`,
      },
      { transaction }
    );

    await transaction.commit();

    // 3. Check if all other collaborators signed
    const allCols = await Collaborator.findAll({
      where: { documentId: doc.id },
    });
    const pendingCols = allCols.filter((c) => !c.signed);

    if (pendingCols.length === 0) {
      console.log(`All signatures collected for document ${doc.codigo}. Processing PDFs...`);
      // Start generating the officialized PDF and certificate PDF
      const originalFileFullPath = path.join(__dirname, "..", doc.originalPath!);
      const originalPdfBytes = fs.readFileSync(originalFileFullPath);
      const pdfDoc = await PDFDocument.load(originalPdfBytes);

      // Add a page at the end for signatures
      const targetPage = pdfDoc.addPage([612, 792]);
      
      try {
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        targetPage.drawText("CONSENSO DE FIRMAS DIGITALES", {
          x: 50,
          y: 740,
          size: 14,
          font: helveticaBold,
          color: rgb(0.46, 0.23, 0.65),
        });
        
        const helveticaRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        targetPage.drawText(`Certificado academico: ${doc.codigo} | Estudiante: ${doc.estudiante}`, {
          x: 50,
          y: 720,
          size: 9,
          font: helveticaRegular,
          color: rgb(0.4, 0.4, 0.4),
        });
      } catch (err) {
        console.error("Failed to draw header on appended page:", err);
      }

      // Embed each collaborator signature image in PDF
      for (const col of allCols) {
        if (col.signatureImage) {
          try {
            const base64Data = col.signatureImage.split(",")[1];
            const signatureBytes = Buffer.from(base64Data, "base64");
            const embeddedSig = await pdfDoc.embedPng(signatureBytes);

            // Overlay signature at coordinates on the newly added page
            targetPage.drawImage(embeddedSig, {
              x: col.posX,
              y: col.posY,
              width: 100,
              height: 50,
            });

            // Draw collaborator name below signature
            try {
              const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
              targetPage.drawText(col.name, {
                x: col.posX,
                y: Math.max(5, col.posY - 12),
                size: 8,
                font: helveticaFont,
                color: rgb(0.2, 0.2, 0.2),
              });
            } catch (textErr) {
              console.error("Failed to write collaborator name under signature:", textErr);
            }
          } catch (embedError) {
            console.error(`Failed to embed signature for ${col.name}:`, embedError);
          }
        }
      }

      // Save Officialized PDF
      const officialFilename = `officialized-${doc.id}.pdf`;
      const officialFullPath = path.join(officialDir, officialFilename);
      const officialPdfBytes = await pdfDoc.save();
      fs.writeFileSync(officialFullPath, officialPdfBytes);

      // Calculate hash of officialized PDF
      const finalHash = calculateSha256(Buffer.from(officialPdfBytes));

      // Re-load the officialized PDF and write the cryptographic hash at the bottom of all pages
      const finalPdfDoc = await PDFDocument.load(officialPdfBytes);
      const helveticaFont = await finalPdfDoc.embedFont(StandardFonts.Helvetica);
      const finalPages = finalPdfDoc.getPages();
      for (let i = 0; i < finalPages.length; i++) {
        const p = finalPages[i];
        p.drawText(`VERIFICACION BLOCKCHAIN - Codigo: ${doc.codigo} | Hash SHA-256: ${finalHash}`, {
          x: 30,
          y: 20,
          size: 7,
          font: helveticaFont,
          color: rgb(0.46, 0.23, 0.65), // purple
        });
      }
      const officialPdfWithHashBytes = await finalPdfDoc.save();
      fs.writeFileSync(officialFullPath, officialPdfWithHashBytes);

      // Recalculate hash of officialized PDF with hash label
      const finalHashWithLabel = calculateSha256(Buffer.from(officialPdfWithHashBytes));
      
      doc.officializedPath = `uploads/officialized/${officialFilename}`;
      doc.hashDocumento = finalHashWithLabel;

      // Automatically register in blockchain via institutional wallet
      try {
        const blockchainDetails = await registerCertificateOnBlockchain(doc, finalHashWithLabel);

        doc.status = "registered";
        doc.blockchainTxHash = blockchainDetails.txHash;
        doc.blockchainBlockNumber = blockchainDetails.blockNumber;
        doc.blockchainContractAddress = blockchainDetails.contractAddress;
        doc.blockchainTimestamp = blockchainDetails.timestamp;
        doc.fechaRegistroBlockchain = blockchainDetails.timestamp;

        // Generate final certificate PDF incorporating blockchain details
        const certificatePath = await generateCertificatePdf(doc, finalHashWithLabel, allCols, blockchainDetails);
        doc.certificatePath = certificatePath;

        await doc.save();

        await AuditLog.create({
          documentId: doc.id,
          action: "Registro_Blockchain",
          details: `El certificado fue registrado exitosamente en la Blockchain mediante wallet institutional. Hash Tx: ${blockchainDetails.txHash}`,
        });
      } catch (bcError: any) {
        console.error("Fallo el registro automatico en Blockchain, guardando como ready_for_blockchain:", bcError);
        doc.status = "ready_for_blockchain";

        // Generate draft certificate (without blockchain details)
        const certificatePath = await generateCertificatePdf(doc, finalHashWithLabel, allCols);
        doc.certificatePath = certificatePath;

        await doc.save();

        await AuditLog.create({
          documentId: doc.id,
          action: "Firma_Validador",
          details: `Consenso de firmas completo. Error al registrar en Blockchain: ${bcError.message}. Listo para reintentar.`,
        });
      }
    }

    res.json({ success: true, message: "Firma guardada correctamente" });
  } catch (error: any) {
    console.error("Error signing document:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Confirm registration in blockchain (Backend-triggered retry)
app.post("/api/documents/register/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findByPk(id, {
      include: [{ model: Collaborator, as: "collaborators" }]
    });
    if (!doc) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    if (!doc.hashDocumento) {
      return res.status(400).json({ error: "El documento aun no tiene un hash generado" });
    }

    console.log(`Reintentando registro en blockchain para el documento: ${doc.codigo}`);

    const blockchainDetails = await registerCertificateOnBlockchain(doc, doc.hashDocumento);

    doc.status = "registered";
    doc.blockchainTxHash = blockchainDetails.txHash;
    doc.blockchainBlockNumber = blockchainDetails.blockNumber;
    doc.blockchainContractAddress = blockchainDetails.contractAddress;
    doc.blockchainTimestamp = blockchainDetails.timestamp;
    doc.fechaRegistroBlockchain = blockchainDetails.timestamp;

    // Re-generate final certificate PDF incorporating blockchain details
    const allCols = doc.collaborators || [];
    const certificatePath = await generateCertificatePdf(doc, doc.hashDocumento, allCols, blockchainDetails);
    doc.certificatePath = certificatePath;

    await doc.save();

    // Audit Log
    await AuditLog.create({
      documentId: doc.id,
      action: "Registro_Blockchain",
      details: `El certificado fue registrado exitosamente en la Blockchain tras reintento. Hash Tx: ${blockchainDetails.txHash}`,
    });

    res.json({ success: true, document: doc });
  } catch (error: any) {
    console.error("Error confirming blockchain registration:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5b. Confirm student reception in database and Blockchain (called by student via canvas signature)
app.post("/api/documents/receive/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const { signatureImage } = req.body;

    if (!signatureImage) {
      return res.status(400).json({ error: "La firma de recepcion es requerida" });
    }

    const doc = await Document.findOne({ where: { hashDocumento: hash } });
    if (!doc) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    console.log(`Registrando recepcion en Blockchain para el hash: ${hash}...`);
    let txHash = "";
    if (blockchainContract) {
      const tx = await blockchainContract.confirmarRecepcion(hash);
      console.log(`Transaccion de recepcion enviada: ${tx.hash}. Esperando confirmacion...`);
      const receipt = await tx.wait(1);
      txHash = receipt ? receipt.hash : tx.hash;
      console.log("Transaccion de recepcion confirmada.");
    } else {
      throw new Error("Cliente blockchain no disponible");
    }

    doc.recepcionConfirmada = true;
    doc.fechaRecepcion = new Date();
    doc.estudianteSignatureImage = signatureImage;
    await doc.save();

    // Audit Log
    await AuditLog.create({
      documentId: doc.id,
      action: "Firma_Recepcion",
      details: `El estudiante (${doc.estudiante}) firmo la recepcion. Registro en Blockchain exitoso. Hash Tx: ${txHash}`,
    });

    res.json({ success: true, document: doc });
  } catch (error: any) {
    console.error("Error confirming student reception:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Verify by hash (Get database details to complement blockchain result)
app.get("/api/verify/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const doc = await Document.findOne({
      where: { hashDocumento: hash },
      include: [
        { model: Collaborator, as: "collaborators" },
        { model: AuditLog, as: "auditLogs" },
      ],
    });

    if (!doc) {
      return res.status(404).json({ error: "Certificado no encontrado en la base de datos local" });
    }

    res.json(doc);
  } catch (error: any) {
    console.error("Error verifying document by hash:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para consultar verificacion por hash en Blockchain
app.get("/api/blockchain/verify-hash/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    if (!blockchainContract) {
      return res.status(503).json({ error: "Cliente blockchain no inicializado" });
    }

    console.log(`[Proxy] consultando verificarCertificado para hash ${hash}`);
    const result = await blockchainContract.verificarCertificado(hash);
    
    if (!result.existe) {
      return res.status(404).json({ error: "CERTIFICADO NO REGISTRADO O ALTERADO: El hash calculado de este PDF no coincide con ningun certificado emitido en la Blockchain." });
    }

    console.log(`[Proxy] consultando consultarHistorial para hash ${hash}`);
    const historyResult = await blockchainContract.consultarHistorial(hash);

    res.json({
      existe: result.existe,
      codigo: result.codigo,
      estudiante: result.estudiante,
      fechaEmision: Number(historyResult.fechaEmision) * 1000,
      valido: historyResult.valido,
      motivoRevocacion: historyResult.motivoRevocacion,
      emisor: historyResult.emisor,
      estudianteWallet: historyResult.estudianteWallet,
      recepcionConfirmada: historyResult.recepcionConfirmada,
      fechaRecepcion: Number(historyResult.fechaRecepcion) * 1000,
      cargoEmisor: historyResult.cargoEmisor,
      fechaRevocacion: Number(historyResult.fechaRevocacion) * 1000
    });
  } catch (error: any) {
    console.error("Error en proxy blockchain verify-hash:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para consultar verificacion por codigo unico en Blockchain
app.get("/api/blockchain/verify-code/:code", async (req, res) => {
  try {
    const { code } = req.params;
    if (!blockchainContract) {
      return res.status(503).json({ error: "Cliente blockchain no inicializado" });
    }

    console.log(`[Proxy] consultando consultarCertificado para codigo ${code}`);
    const result = await blockchainContract.consultarCertificado(code.trim());
    
    if (!result.existe) {
      return res.status(404).json({ error: "CODIGO NO ENCONTRADO: El codigo ingresado no corresponde a ningun certificado registrado en la Blockchain." });
    }

    res.json({
      existe: result.existe,
      estudiante: result.estudiante,
      hashDocumento: result.hashDocumento,
      fechaEmision: Number(result.fechaEmision) * 1000,
      valido: result.valido,
      motivoRevocacion: result.motivoRevocacion,
      emisor: result.emisor,
      estudianteWallet: result.estudianteWallet,
      recepcionConfirmada: result.recepcionConfirmada,
      fechaRecepcion: Number(result.fechaRecepcion) * 1000
    });
  } catch (error: any) {
    console.error("Error en proxy blockchain verify-code:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Revoke document in database and blockchain
app.post("/api/documents/revoke/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ error: "El motivo de la revocacion es requerido" });
    }

    const doc = await Document.findOne({ where: { hashDocumento: hash } });
    if (!doc) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    console.log(`Registrando revocacion en Blockchain para el hash: ${hash}...`);
    let txHash = "";
    if (blockchainContract) {
      const tx = await blockchainContract.revocarCertificado(hash, motivo);
      console.log(`Transaccion de revocacion enviada: ${tx.hash}. Esperando confirmacion...`);
      const receipt = await tx.wait(1);
      txHash = receipt ? receipt.hash : tx.hash;
      console.log("Transaccion de revocacion confirmada.");
    } else {
      throw new Error("Cliente blockchain no disponible");
    }

    doc.status = "revoked";
    doc.motivoRevocacion = motivo;
    doc.fechaRevocacion = new Date();
    await doc.save();

    // Audit Log
    await AuditLog.create({
      documentId: doc.id,
      action: "Revocacion",
      details: `Certificado revocado. Motivo: ${motivo}. Registrado en Blockchain. Hash Tx: ${txHash}`,
    });

    res.json({ success: true, document: doc });
  } catch (error: any) {
    console.error("Error revoking document:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Sincronización automática de base de datos con blockchain al arrancar
async function synchronizeBlockchainOnStartup() {
  if (!blockchainContract) {
    console.warn("Blockchain Client no inicializado. Omitiendo sincronización de arranque.");
    return;
  }

  try {
    console.log("--------------------------------------------------");
    console.log("Iniciando validación y sincronización de Blockchain en el arranque...");

    // Test contract owner to verify connectivity
    try {
      const owner = await blockchainContract.owner();
      console.log(`[+] Conexión de Blockchain exitosa. Owner del contrato: ${owner}`);
    } catch (connErr: any) {
      console.error("[-] No se pudo conectar al Smart Contract. Saltando sincronización de arranque:", connErr.message);
      return;
    }

    const docs = await Document.findAll();
    console.log(`[i] Encontrados ${docs.length} documentos en la base de datos.`);

    let syncedCount = 0;
    for (const doc of docs) {
      if (doc.status === "registered" || doc.status === "ready_for_blockchain") {
        if (!doc.hashDocumento) continue;

        try {
          // Verify on-chain presence
          const onChain = await blockchainContract.verificarCertificado(doc.hashDocumento);

          if (!onChain.existe) {
            console.log(`[!] Certificado desincronizado: ${doc.codigo} (${doc.estudiante}) no está en Blockchain. Registrando...`);
            const studentWallet = (doc.estudianteWallet && ethers.isAddress(doc.estudianteWallet))
              ? doc.estudianteWallet
              : ethers.ZeroAddress;

            const tx = await blockchainContract.emitirCertificado(
              doc.codigo,
              doc.estudiante,
              studentWallet,
              doc.hashDocumento
            );
            console.log(`    Transacción enviada: ${tx.hash}. Esperando confirmación...`);
            const receipt = await tx.wait(1);

            if (receipt) {
              console.log(`    [+] Confirmado en bloque ${receipt.blockNumber}!`);
              doc.blockchainTxHash = receipt.hash;
              doc.blockchainBlockNumber = receipt.blockNumber;
              doc.blockchainContractAddress = contractAddress;
              doc.status = "registered";
              await doc.save();
              syncedCount++;
            }
          }
        } catch (itemErr: any) {
          console.error(`[-] Error al verificar/emitir certificado ${doc.codigo}:`, itemErr.message);
        }
      }
    }

    if (syncedCount > 0) {
      console.log(`[+] Sincronización de arranque completada. Se re-registraron ${syncedCount} certificados.`);
    } else {
      console.log("[+] Todos los certificados de la base de datos están sincronizados en Blockchain.");
    }
    console.log("--------------------------------------------------");
  } catch (err: any) {
    console.error("[-] Error en la sincronización de arranque de Blockchain:", err);
  }
}

async function runMigrations() {
  try {
    const dialect = sequelize.getDialect();
    if (dialect === "mssql") {
      const [results] = await sequelize.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Documents' AND COLUMN_NAME = 'requireFacial'"
      );
      if (results.length === 0) {
        console.log("[Migration] Adding 'requireFacial' column to 'Documents' table...");
        await sequelize.query("ALTER TABLE Documents ADD requireFacial BIT NOT NULL DEFAULT 0");
        console.log("[Migration] Column 'requireFacial' added successfully.");
      }
    } else {
      const [results] = await sequelize.query("PRAGMA table_info(Documents)") as any[];
      const hasColumn = results.some((col: any) => col.name === "requireFacial");
      if (!hasColumn) {
        console.log("[Migration] Adding 'requireFacial' column to 'Documents' table (SQLite)...");
        await sequelize.query("ALTER TABLE Documents ADD COLUMN requireFacial BOOLEAN NOT NULL DEFAULT 0");
        console.log("[Migration] Column 'requireFacial' added successfully.");
      }
    }
  } catch (err) {
    console.error("[-] Error running database migrations:", err);
  }
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
  });
});

// Connect to DB and start Server
runMigrations()
  .then(() => sequelize.sync())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
      // Ejecutar sincronización en segundo plano al arrancar
      synchronizeBlockchainOnStartup().catch((syncErr) => {
        console.error("[-] Error crítico en la sincronización automática al arrancar:", syncErr);
      });
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
  });