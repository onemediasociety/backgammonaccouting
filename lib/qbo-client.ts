import { put, head } from "@vercel/blob";

export interface QBOTokens {
  accessToken: string;
  refreshToken: string;
  realmId: string;       // QuickBooks company ID
  expiresAt: number;     // unix ms
  refreshExpiresAt: number;
}

const BLOB_KEY = "qbo/tokens.json";
const INTUIT_BASE = "https://appcenter.intuit.com/connect/oauth2";
const API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

function creds() {
  return {
    clientId: process.env.QBO_CLIENT_ID!,
    clientSecret: process.env.QBO_CLIENT_SECRET!,
    redirectUri: process.env.QBO_REDIRECT_URI!,
  };
}

// ── Token storage ─────────────────────────────────────────────────────────────

export async function saveTokens(tokens: QBOTokens): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(tokens), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function loadTokens(): Promise<QBOTokens | null> {
  try {
    const info = await head(BLOB_KEY);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json() as QBOTokens;
  } catch {
    return null;
  }
}

export async function isConnected(): Promise<boolean> {
  const tokens = await loadTokens();
  if (!tokens) return false;
  // Refresh token lasts 100 days — if it's expired the user needs to re-auth
  return tokens.refreshExpiresAt > Date.now();
}

// ── OAuth URLs ────────────────────────────────────────────────────────────────

export function getAuthUrl(state: string): string {
  const { clientId, redirectUri } = creds();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });
  return `${INTUIT_BASE}?${params}`;
}

// ── Token exchange & refresh ──────────────────────────────────────────────────

export async function exchangeCode(code: string, realmId: string): Promise<QBOTokens> {
  const { clientId, clientSecret, redirectUri } = creds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = await res.json();
  const now = Date.now();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    realmId,
    expiresAt: now + data.expires_in * 1000,
    refreshExpiresAt: now + data.x_refresh_token_expires_in * 1000,
  };
}

async function refreshAccessToken(tokens: QBOTokens): Promise<QBOTokens> {
  const { clientId, clientSecret } = creds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refreshToken }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = await res.json();
  const now = Date.now();
  const updated: QBOTokens = {
    ...tokens,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: now + data.expires_in * 1000,
    refreshExpiresAt: data.x_refresh_token_expires_in
      ? now + data.x_refresh_token_expires_in * 1000
      : tokens.refreshExpiresAt,
  };
  await saveTokens(updated);
  return updated;
}

async function getValidTokens(): Promise<QBOTokens> {
  const tokens = await loadTokens();
  if (!tokens) throw new Error("QuickBooks not connected");
  if (tokens.expiresAt - Date.now() < 60_000) {
    return refreshAccessToken(tokens);
  }
  return tokens;
}

// ── API helper ────────────────────────────────────────────────────────────────

async function qboFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const tokens = await getValidTokens();
  return fetch(`${API_BASE}/${tokens.realmId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

// ── Invoice creation ──────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  amount: number; // in major currency units (dollars)
}

export interface QBOInvoiceParams {
  customerName: string;
  customerEmail: string;
  lines: InvoiceLineItem[];
  memo?: string;
  currency?: string;
}

export async function findOrCreateCustomer(name: string, email: string): Promise<string> {
  const tokens = await getValidTokens();
  // Search for existing customer by name
  const query = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${name.replace(/'/g, "\\'")}'`);
  const res = await fetch(`${API_BASE}/${tokens.realmId}/query?query=${query}`, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      Accept: "application/json",
    },
  });
  if (res.ok) {
    const data = await res.json();
    const existing = data.QueryResponse?.Customer?.[0];
    if (existing) return existing.Id;
  }

  // Create new customer
  const createRes = await qboFetch("/customer", {
    method: "POST",
    body: JSON.stringify({
      DisplayName: name,
      PrimaryEmailAddr: email ? { Address: email } : undefined,
    }),
  });
  if (!createRes.ok) throw new Error(`Failed to create QBO customer: ${await createRes.text()}`);
  const created = await createRes.json();
  return created.Customer.Id;
}

export async function createAndSendInvoice(params: QBOInvoiceParams): Promise<string> {
  const customerId = await findOrCreateCustomer(params.customerName, params.customerEmail);

  const invoice = {
    CustomerRef: { value: customerId },
    BillEmail: params.customerEmail ? { Address: params.customerEmail } : undefined,
    CurrencyRef: params.currency ? { value: params.currency.toUpperCase() } : undefined,
    PrivateNote: params.memo,
    Line: params.lines.map((l) => ({
      DetailType: "SalesItemLineDetail",
      Amount: l.amount,
      Description: l.description,
      SalesItemLineDetail: {
        ItemRef: { value: "1", name: "Services" }, // default Services item
        UnitPrice: l.amount,
        Qty: 1,
      },
    })),
  };

  const res = await qboFetch("/invoice", {
    method: "POST",
    body: JSON.stringify(invoice),
  });
  if (!res.ok) throw new Error(`Failed to create QBO invoice: ${await res.text()}`);
  const data = await res.json();
  const invoiceId = data.Invoice.Id;

  // Send the invoice via email
  const sendRes = await qboFetch(`/invoice/${invoiceId}/send?sendTo=${encodeURIComponent(params.customerEmail)}`, {
    method: "POST",
    body: "",
  });
  if (!sendRes.ok) {
    // Invoice created but email failed — not fatal, return invoice ID
    console.warn(`QBO invoice ${invoiceId} created but email failed: ${await sendRes.text()}`);
  }

  return invoiceId;
}
