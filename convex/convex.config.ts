import betterAuth from "@convex-dev/better-auth/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
	env: {
		BETTER_AUTH_SECRET: v.string(),
		SITE_URL: v.string(),
		PHONE_AUTH_ENABLED: v.optional(v.string()),
		TWILIO_ACCOUNT_SID: v.optional(v.string()),
		TWILIO_API_KEY_SID: v.optional(v.string()),
		TWILIO_API_KEY_SECRET: v.optional(v.string()),
		TWILIO_VERIFY_SERVICE_SID: v.optional(v.string()),
	},
});

app.use(betterAuth);
app.use(rateLimiter);

export default app;
