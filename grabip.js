
const webhookURL = "YOUR_DISCORD_WEBHOOK_URL";

async function sendToDiscord(ip) {
    if (!ip) {
        console.error("IP address is missing.");
        return;
    }

    const payload = {
        username: "Site Monitor",
        embeds: [
            {
                title: "🌐 Website Request",
                description: "A visitor submitted a diagnostic report.",
                color: 0x36E6D0,
                fields: [
                    {
                        name: "IP Address",
                        value: `\`${ip}\``,
                        inline: true
                    },
                    {
                        name: "Status",
                        value: "Diagnostic received",
                        inline: true
                    },
                    {
                        name: "Timestamp",
                        value: new Date().toISOString(),
                        inline: false
                    }
                ],
                footer: {
                    text: "Website Monitoring"
                },
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

        if (!response.ok) {
            console.error(
                "Discord webhook error:",
                response.status
            );
        }
    } catch (error) {
        console.error("Notification error:", error);
    }
}
