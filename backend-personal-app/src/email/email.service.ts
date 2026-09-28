import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendTenantInvitation(input: {
    to: string;
    tenantName: string;
    role: 'ADMIN' | 'MEMBER';
    inviterName: string;
    acceptUrl: string;
  }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      throw new InternalServerErrorException(
        'Email service belum dikonfigurasi',
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `Invitation ke workspace ${input.tenantName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2>Anda diundang ke workspace ${escapeHtml(input.tenantName)}</h2>
            <p>${escapeHtml(input.inviterName)} mengundang Anda sebagai <strong>${input.role}</strong>.</p>
            <p>Gunakan tombol berikut untuk menerima invitation:</p>
            <p><a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Accept Invitation</a></p>
            <p style="font-size:12px;color:#666">Link invitation berlaku terbatas dan hanya dapat digunakan satu kali.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new InternalServerErrorException(
        `Gagal mengirim email invitation: ${detail}`,
      );
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
