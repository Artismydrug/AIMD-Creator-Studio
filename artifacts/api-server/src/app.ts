import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { clerkAuth } from "./middlewares/clerkAuth";
import router from "./routes";
import { WebhookHandlers } from "./webhookHandlers";
import { handleClerkWebhook } from "./routes/webhooks/clerk";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Clerk FAPI proxy — must be before ALL body parsers ────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ── Clerk webhook MUST be registered before express.json() ───────────────────
// Svix requires the raw Buffer body for signature verification.
app.post(
  '/api/webhooks/clerk',
  // Accept any content-type so tests (Buffer/string) and Clerk (application/json)
  // both produce a raw Buffer body for Svix signature verification.
  express.raw({ type: '*/*' }),
  handleClerkWebhook,
);

// ── Stripe webhook MUST be registered before express.json() ──────────────────
// Stripe requires the raw Buffer body for signature verification.
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, 'Stripe webhook error');
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// ── Standard middleware ───────────────────────────────────────────────────────
app.use(cors({ credentials: true, origin: true }));
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Clerk session validation ──────────────────────────────────────────────────
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// ── JIT user provisioning: sets req.dbUser for authenticated requests ─────────
app.use(clerkAuth);

app.use("/api", router);

export default app;
