import nodemailer from "nodemailer";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

// 1. Inicializar el Transportador de Gmail
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 2. Inicializar el Cliente de WhatsApp Web Local con persistencia de sesión
const whatsappClient = new Client({
  authStrategy: new LocalAuth({ dataPath: "./whatsapp-session" }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }
});

// Mostrar el código QR en la consola la primera vez que se corra el proyecto
whatsappClient.on("qr", (qr) => {
  console.log("\n=================================================================");
  console.log("📱 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP PARA VINCULAR EL SERVIDOR:");
  console.log("=================================================================\n");
  qrcode.generate(qr, { small: true });
});

whatsappClient.on("ready", () => {
  console.log("✅ [WhatsApp] ¡Cliente listo y autenticado correctamente!");
});

whatsappClient.initialize();

interface NotificationPayload {
  toEmail: string;
  toPhone?: string | null;
  validatorName: string;
  studentName: string;
  certificateCode: string;
  token: string;
}

export class NotificationService {
  /**
   * CANAL 1: Envío de Correo Electrónico Real via SMTP
   */
  static async sendEmail(payload: NotificationPayload): Promise<boolean> {
    const urlFirma = `http://localhost:5173/sign/${payload.token}`;
    
    try {
      await transporter.sendMail({
        from: `"Certificaciones Blockchain" <${process.env.EMAIL_USER}>`,
        to: payload.toEmail,
        subject: `🖋️ Invitación para firmar documento de ${payload.studentName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
            <h2 style="color: #752ea6; text-align: center;">Flujo de Consenso Académico</h2>
            <hr style="border: 0; border-top: 1px solid #eee; margin-bottom: 20px;">
            <p>Hola <strong>${payload.validatorName}</strong>,</p>
            <p>Has sido asignado como validador para el documento oficial del estudiante <strong>${payload.studentName}</strong> (Código de registro: <code>${payload.certificateCode}</code>).</p>
            <p>Por favor, ingresa al siguiente enlace seguro para revisar el archivo PDF y estampar tu firma digital:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${urlFirma}" style="background-color: #752ea6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;" target="_blank">Firmar Documento</a>
            </p>
            <p><small style="color: #666;">Enlace directo: <br>${urlFirma}</small></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
            <p style="font-size: 11px; color: #999; text-align: center;">Este es un mensaje automático del Sistema Descentralizado de Certificados.</p>
          </div>
        `,
      });
      console.log(`[NotificationService] ✉️ Correo enviado con éxito a: ${payload.toEmail}`);
      return true;
    } catch (error) {
      console.error(`[NotificationService Error] ❌ Error al enviar correo a ${payload.toEmail}:`, error);
      return false;
    }
  }

  /**
   * CANAL 2: Envío de Mensaje por WhatsApp usando whatsapp-web.js
   */
  static async sendWhatsApp(payload: NotificationPayload): Promise<boolean> {
    if (!payload.toPhone) {
      console.log(`[NotificationService] ⚠️ El colaborador ${payload.validatorName} no tiene teléfono registrado. Saltando WhatsApp.`);
      return false;
    }

    try {
      const urlFirma = `http://localhost:5173/sign/${payload.token}`;
      let cleanPhone = payload.toPhone.replace(/\D/g, "");
      
      // Auto-completar prefijo de Bolivia (591) si tiene 8 dígitos
      if (cleanPhone.length === 8) {
        cleanPhone = "591" + cleanPhone;
      }

      const chatId = `${cleanPhone}@c.us`;

      const mensaje = `Hola ${payload.validatorName}, has sido asignado para validar el certificado de ${payload.studentName} (Código: ${payload.certificateCode}). Por favor ingresa aquí para revisar y plasmar tu firma digital: ${urlFirma}`;

      await whatsappClient.sendMessage(chatId, mensaje);
      console.log(`[NotificationService] 📱 WhatsApp enviado con éxito a: ${cleanPhone}`);
      return true;
    } catch (error) {
      console.error(`[NotificationService Error] ❌ Error local de WhatsApp al enviar a ${payload.toPhone}:`, error);
      return false;
    }
  }

  /**
   * ORQUESTADOR: Ejecuta ambos en segundo plano sin congelar la API principal
   */
  static sendAll(payload: NotificationPayload): void {
    this.sendEmail(payload);
    this.sendWhatsApp(payload);
  }
}