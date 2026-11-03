const crypto = require("node:crypto");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

function supabaseUrl(path) {
  return `${required("SUPABASE_URL").replace(/\/$/, "")}${path}`;
}

function serviceHeaders(extra = {}) {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function supabaseRest(path, options = {}) {
  const response = await fetch(supabaseUrl(`/rest/v1/${path}`), {
    ...options,
    headers: serviceHeaders(options.headers || {}),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

async function authenticatedUser(req) {
  const authorization = req.headers.authorization || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const response = await fetch(supabaseUrl("/auth/v1/user"), {
    headers: {
      apikey: required("SUPABASE_ANON_KEY"),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function getEntitlements(userId) {
  return supabaseRest(
    `entitlements?user_id=eq.${encodeURIComponent(userId)}&active=eq.true&select=tier`,
  );
}

function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === "string") return Promise.resolve(Buffer.from(req.body));
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function safeEqualHex(actual, expected) {
  if (!/^[\da-f]+$/i.test(actual) || !/^[\da-f]+$/i.test(expected)) return false;
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sendError(res, error, status = 500) {
  console.error(error);
  return res.status(status).json({ error: status === 500 ? "Request could not be completed." : error });
}

function tierAmount(tier) {
  const amounts = { L1: 50000, L2: 50000, L3: 50000, Pro: 150000 };
  return amounts[tier] || null;
}

function paypalAmountMinor(tier) {
  const amount = process.env[`PAYPAL_${tier.toUpperCase()}_USD`];
  if (!amount || !/^\d+\.\d{2}$/.test(amount)) {
    throw new Error(`Set PAYPAL_${tier.toUpperCase()}_USD to the approved USD price before enabling PayPal.`);
  }
  const amountMinor = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor > 2147483647) {
    throw new Error(`PAYPAL_${tier.toUpperCase()}_USD exceeds the supported payment amount.`);
  }
  return amountMinor;
}

async function markPaymentPaid(provider, providerReference, paymentId, tier, userId, amountMinor, currency) {
  if (!providerReference || !paymentId || !userId || !tier || !Number.isSafeInteger(amountMinor) || !currency) {
    throw new Error("Verified payment details are incomplete.");
  }
  await supabaseRest("rpc/complete_verified_payment", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      p_provider: provider,
      p_provider_reference: providerReference,
      p_payment_id: paymentId,
      p_tier: tier,
      p_user_id: userId,
      p_amount_minor: amountMinor,
      p_currency: currency,
    }),
  });
}

module.exports = {
  authenticatedUser,
  getEntitlements,
  markPaymentPaid,
  paypalAmountMinor,
  rawBody,
  required,
  safeEqualHex,
  sendError,
  supabaseRest,
  supabaseUrl,
  tierAmount,
};
