import * as dotenv from "dotenv";
import axios from "axios";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, ".env") });

const BOLNA_HOST = "https://api.bolna.ai";

async function run() {
    const apiKey = process.env.BOLNA_API_KEY;
    if (!apiKey) {
        console.log("No BOLNA_API_KEY in .env");
        return;
    }
    console.log("Testing with BOLNA_API_KEY:", apiKey.substring(0, 5) + "...");

    const urls = [
        "/v2/phone-numbers/all",
        "/v2/phone-numbers",
        "/v2/phone_numbers/all",
        "/v2/phone_numbers",
        "/v1/phone-numbers/all",
        "/v1/phone_numbers/all",
        "/phone-numbers/all",
        "/phone-numbers",
        "/v1/phone-numbers"
    ];

    for (const url of urls) {
        try {
            console.log(`Testing ${url}...`);
            const res = await axios.get(`${BOLNA_HOST}${url}`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            console.log(`SUCCESS: ${url} -> status ${res.status}`);
            break; // stop when we find the right one
        } catch (e: any) {
            console.log(
                `FAILED: ${url} -> ${e.response?.status} ${e.response?.data ? JSON.stringify(e.response.data) : e.message
                }`
            );
        }
    }
}
run();
