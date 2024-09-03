import { createApp } from "@deroll/app";
import { getAddress, hexToString, stringToHex } from "viem";

const app = createApp({ url: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004" });

let listings = {};

app.addAdvanceHandler(async ({ metadata, payload }) => {
    const sender = getAddress(metadata.msg_sender);
    const payloadString = hexToString(payload);
    console.log("Sender:", sender, "Payload:", payloadString);

    try {
        const jsonPayload = JSON.parse(payloadString);

        if (jsonPayload.method === "list_property") {
            listings[jsonPayload.propertyId] = {
                owner: sender,
                price: BigInt(jsonPayload.price),
                details: jsonPayload.details
            };
            console.log("Property listed:", jsonPayload.propertyId);

        } else if (jsonPayload.method === "buy_property") {
            const property = listings[jsonPayload.propertyId];
            if (property && BigInt(jsonPayload.amount) >= property.price) {
                property.owner = sender;
                console.log("Property bought:", jsonPayload.propertyId);
            } else {
                console.error("Error: Property not found or insufficient funds.");
            }
        }

        return "accept";
    } catch (e) {
        console.error(e);
        app.createReport({ payload: stringToHex(String(e)) });
        return "reject";
    }
});

app.addInspectHandler(async ({ payload }) => {
    const propertyId = hexToString(payload).split("/")[1];
    const property = listings[propertyId] || {};
    await app.createReport({ payload: stringToHex(JSON.stringify(property)) });
});

app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
