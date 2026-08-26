import Stripe from "stripe";

export async function getStripeClient(): Promise<Stripe> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Run this script from a Replit workflow with the Stripe integration attached.");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${response.status}`);
  }

  const payload = await response.json() as {
    items?: Array<{ settings?: { secret?: string } }>;
  };
  const secretKey = payload.items?.[0]?.settings?.secret;
  if (!secretKey) {
    throw new Error("Stripe secret key not found in the attached integration.");
  }
  return new Stripe(secretKey);
}