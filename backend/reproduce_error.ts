
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const BOLNA_HOST = "https://api.bolna.ai";
const apiKey = process.env.BOLNA_API_KEY; // Make sure this is in your .env

async function testCreateBatch() {
    if (!apiKey) {
        console.error("BOLNA_API_KEY not found in .env");
        return;
    }

    const form = new FormData();
    form.append("agent_id", "7c41d916-43d9-482f-87d3-8326779b5327"); // Using a sample agent ID
    form.append("from_phone_number", "+911234567890");

    const csvContent = "contact_number,first_name,full_name,history,status\n+919876543210,Test,Test User,No history,fresh";
    form.append("file", Buffer.from(csvContent), { filename: "test_campaign.csv", contentType: "text/csv" });

    console.log("Sending request to Bolna...");
    try {
        const response = await axios.post(`${BOLNA_HOST}/batches`, form, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                ...form.getHeaders(),
            },
        });
        console.log("Success:", response.data);
    } catch (err: any) {
        console.error("Error from Bolna:", err.response?.data || err.message);
    }
}

testCreateBatch();
