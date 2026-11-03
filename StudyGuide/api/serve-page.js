const fs = require("node:fs");
const path = require("node:path");
const { getEntitlements, sendError, supabaseUrl } = require("./_shared");

const PROTECTED_PAGES = new Set([
  "Amazon-Design.html",
  "AZURECICD.html",
  "AZURECICD - Copy.html",
  "C#Dotnet.html",
  "DSA.html",
  "How AI work.html",
  "Project.html",
  "C#Dotnet.html",
  "DSA.html",
]);

function sessionCookie(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map(item => item.trim()).find(item => item.startsWith("visual_pro_session="));
  return match ? decodeURIComponent(match.slice("visual_pro_session=".length)) : null;
}

async function userFromCookie(req) {
  const token = sessionCookie(req);
  if (!token) return null;
  const response = await fetch(supabaseUrl("/auth/v1/user"), {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  return response.ok ? response.json() : null;
}

module.exports = async function handler(req, res) {
  try {
    const page = req.query.page;
    if (!PROTECTED_PAGES.has(page)) return res.status(404).send("Page not found.");

    const user = await userFromCookie(req);
    if (!user) return res.redirect(302, `/Company-Interviews.html?login=required`);

    const entitlements = await getEntitlements(user.id);
    const isPro = entitlements.some(item => item.tier === "Pro" && item.active !== false);
    if (!isPro) return res.redirect(302, `/Company-Interviews.html?upgrade=Pro`);

    const candidates = [path.join(process.cwd(), page), path.join(process.cwd(), "StudyGuide", page)];
    const file = candidates.find(candidate => fs.existsSync(candidate));
    if (!file) return res.status(404).send("Page not found.");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    return res.status(200).send(fs.readFileSync(file));
  } catch (error) {
    return sendError(res, error);
  }
};
