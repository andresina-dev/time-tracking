import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  return transporter;
}

export class EmailService {
  async send(to: string, subject: string, text: string): Promise<void> {
    const client = getTransporter();
    if (!client) {
      // Kein SMTP konfiguriert: Ausgabe der E-Mail im Server-Log zu Entwicklungszwecken.
      console.log(`[EmailService] SMTP nicht konfiguriert. Würde senden an ${to}:\n${subject}\n${text}`);
      return;
    }
    await client.sendMail({ from: process.env.SMTP_FROM ?? "no-reply@time-tracking.local", to, subject, text });
  }

  async sendAccountSetup(to: string, name: string, link: string): Promise<void> {
    await this.send(to, "Dein Zugang zur Zeiterfassung", `Hallo ${name},\n\nein Administrator hat für dich ein Konto angelegt. Bitte setze dein Passwort über folgenden Link:\n${link}\n\nDer Link ist 48 Stunden gültig.`);
  }

  async sendPasswordReset(to: string, name: string, link: string): Promise<void> {
    await this.send(to, "Passwort zurücksetzen", `Hallo ${name},\n\ndu hast das Zurücksetzen deines Passworts angefordert. Nutze folgenden Link:\n${link}\n\nDer Link ist 2 Stunden gültig. Falls du das nicht warst, ignoriere diese E-Mail.`);
  }
}
