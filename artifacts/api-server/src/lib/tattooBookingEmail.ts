import { ReplitConnectors } from "@replit/connectors-sdk";

type BookingEmailReference = {
  originalName: string;
};

type BookingEmailRequest = {
  id: number;
  requestType: "tattoo" | "painting" | "other";
  name: string;
  email: string;
  phone: string | null;
  idea: string;
  placement: string;
  estimatedSize: string;
  preferredArtist: string;
  references: BookingEmailReference[];
};

const connectors = new ReplitConnectors();

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendTattooBookingNotification(
  booking: BookingEmailRequest,
): Promise<void> {
  const requestLabel = {
    tattoo: "Tattoo",
    painting: "Painting",
    other: "Creative project",
  }[booking.requestType];
  const detailLabels = {
    tattoo: ["Body placement", "Estimated size"],
    painting: ["Canvas / surface", "Approximate dimensions"],
    other: ["Medium / project type", "Timeline / scope"],
  }[booking.requestType];
  const to =
    process.env.BOOKING_NOTIFICATION_TO?.trim() || "info@artismydrug.com";
  const from =
    process.env.BOOKING_NOTIFICATION_FROM?.trim() ||
    "AIMD Studio <info@artismydrug.com>";
  const subject = `New ${requestLabel.toLowerCase()} inquiry #${booking.id} — ${booking.name}`;
  const referenceSummary =
    booking.references.length > 0
      ? booking.references.map((reference) => reference.originalName).join(", ")
      : "No reference images attached";

  const text = [
    `New ${requestLabel.toLowerCase()} commission inquiry #${booking.id}`,
    "",
    `Client: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone || "Not provided"}`,
    `Preferred artist: ${booking.preferredArtist}`,
    `${detailLabels[0]}: ${booking.placement}`,
    `${detailLabels[1]}: ${booking.estimatedSize}`,
    "",
    `${requestLabel} project details:`,
    booking.idea,
    "",
    `Reference images: ${referenceSummary}`,
    "",
    "Open the AIMD Admin Dashboard to review the private images and update the booking status.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f1720">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#c21878">AIMD Creator Studio</p>
      <h1 style="font-size:24px;margin:8px 0 24px">New ${escapeHtml(requestLabel.toLowerCase())} inquiry #${booking.id}</h1>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#6f6470">Client</td><td style="padding:8px 0"><strong>${escapeHtml(booking.name)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#6f6470">Email</td><td style="padding:8px 0">${escapeHtml(booking.email)}</td></tr>
        <tr><td style="padding:8px 0;color:#6f6470">Phone</td><td style="padding:8px 0">${escapeHtml(booking.phone || "Not provided")}</td></tr>
        <tr><td style="padding:8px 0;color:#6f6470">Artist</td><td style="padding:8px 0">${escapeHtml(booking.preferredArtist)}</td></tr>
        <tr><td style="padding:8px 0;color:#6f6470">${escapeHtml(detailLabels[0])}</td><td style="padding:8px 0">${escapeHtml(booking.placement)}</td></tr>
        <tr><td style="padding:8px 0;color:#6f6470">${escapeHtml(detailLabels[1])}</td><td style="padding:8px 0">${escapeHtml(booking.estimatedSize)}</td></tr>
      </table>
      <h2 style="font-size:16px;margin:24px 0 8px">${escapeHtml(requestLabel)} project details</h2>
      <p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(booking.idea)}</p>
      <h2 style="font-size:16px;margin:24px 0 8px">Reference images</h2>
      <p style="line-height:1.6">${escapeHtml(referenceSummary)}</p>
      <p style="margin-top:28px;padding:16px;background:#fff3f8;border-left:4px solid #c21878">
        Open the AIMD Admin Dashboard to review private images and update the inquiry status.
      </p>
    </div>
  `;

  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    body: {
      from,
      to: [to],
      reply_to: booking.email,
      subject,
      text,
      html,
    },
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`Resend rejected booking notification (${response.status}): ${body}`);
  }
}