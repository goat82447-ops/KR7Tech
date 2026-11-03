const { authenticatedUser, getEntitlements, sendError, supabaseRest } = require("./_shared");

const PRO_TIER = "Pro";
const LEVEL_TIERS = new Set(["L1", "L2", "L3"]);

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  try {
    const user = await authenticatedUser(req);
    const entitlements = user ? await getEntitlements(user.id) : [];
    const grantedTiers = new Set(entitlements.filter(item => item.active !== false).map(item => item.tier));
    const adminIds = (process.env.ADMIN_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);
    const profile = user
      ? await supabaseRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=is_admin`)
      : [];
    const result = await supabaseRest(
      "questions?select=id,company,topic,question,answer,example,access_level,is_free&order=topic.asc,company.asc,id.asc",
    );
    const visible = result.filter(item =>
      item.is_free ||
      grantedTiers.has(PRO_TIER) ||
      (LEVEL_TIERS.has(item.access_level) && grantedTiers.has(item.access_level)),
    );
    const locked = result
      .filter(item => !visible.includes(item))
      .map(({ id, company, topic, question }) => ({ id, company, topic, question }));

    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    return res.status(200).json({
      questions: visible.map(({ access_level, is_free, ...question }) => question),
      locked,
      access: {
        signedIn: Boolean(user),
        tiers: [...grantedTiers],
        premium: grantedTiers.size > 0,
        isAdmin: adminIds.includes(user?.id) || profile?.[0]?.is_admin === true,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

