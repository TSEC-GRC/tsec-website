// ============================================================
// TSEC — Paddle Webhook
// TEMPORARY DIAGNOSTIC VERSION
// P1.9 — Webhook Signature Diagnostics
// ============================================================

import crypto from "crypto";

export default async function handler(request) {

    // ------------------------------------------------------------
    // 1. METHOD CHECK
    // ------------------------------------------------------------

    if (request.method !== "POST") {

        return new Response(
            JSON.stringify({
                error: "Method Not Allowed"
            }),
            {
                status: 405,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }


    // ------------------------------------------------------------
    // 2. READ RAW BODY
    // ------------------------------------------------------------

    const rawBody = await request.text();


    // ------------------------------------------------------------
    // 3. READ PADDLE SIGNATURE HEADER
    // ------------------------------------------------------------

    const paddleSignature =
        request.headers.get("paddle-signature");


    // ------------------------------------------------------------
    // 4. READ WEBHOOK SECRET
    // ------------------------------------------------------------

    const secretKey =
        process.env.PADDLE_WEBHOOK_SECRET;


    // ------------------------------------------------------------
    // 5. BASIC SIGNATURE DIAGNOSTICS
    // ------------------------------------------------------------

    const signaturePresent =
        Boolean(paddleSignature);

    const secretPresent =
        Boolean(secretKey);

    let timestamp = null;
    let receivedSignature = null;

    let signatureParts = [];

    if (paddleSignature) {

        signatureParts =
            paddleSignature.split(";");

        for (const part of signatureParts) {

            const separatorIndex =
                part.indexOf("=");

            if (separatorIndex === -1) {
                continue;
            }

            const key =
                part.substring(
                    0,
                    separatorIndex
                );

            const value =
                part.substring(
                    separatorIndex + 1
                );

            if (key === "ts") {
                timestamp = value;
            }

            if (key === "h1") {
                receivedSignature = value;
            }
        }
    }


    // ------------------------------------------------------------
    // 6. SAFE SIGNATURE INFORMATION
    // ------------------------------------------------------------

    const timestampPresent =
        Boolean(timestamp);

    const h1Present =
        Boolean(receivedSignature);

    const h1Length =
        receivedSignature
            ? receivedSignature.length
            : 0;


    // ------------------------------------------------------------
    // 7. PAYLOAD INFORMATION
    // ------------------------------------------------------------

    let event = null;

    try {

        event =
            JSON.parse(rawBody);

    } catch (error) {

        console.error(
            "❌ Payload is not valid JSON"
        );
    }


    const eventType =
        event?.event_type || null;

    const eventId =
        event?.event_id || null;

    const transactionId =
        event?.data?.id || null;


    // ------------------------------------------------------------
    // 8. LOG SAFE DIAGNOSTIC INFORMATION
    // ------------------------------------------------------------

    console.log(
        "============================================================"
    );

    console.log(
        "TSEC PADDLE WEBHOOK DIAGNOSTIC"
    );

    console.log(
        "============================================================"
    );

    console.log(
        "HTTP Method:",
        request.method
    );

    console.log(
        "Raw body length:",
        rawBody.length
    );

    console.log(
        "Paddle-Signature present:",
        signaturePresent
    );

    console.log(
        "PADDLE_WEBHOOK_SECRET configured:",
        secretPresent
    );

    console.log(
        "Signature timestamp present:",
        timestampPresent
    );

    console.log(
        "Signature h1 present:",
        h1Present
    );

    console.log(
        "Signature h1 length:",
        h1Length
    );

    console.log(
        "Event type:",
        eventType
    );

    console.log(
        "Event ID:",
        eventId
    );

    console.log(
        "Transaction ID:",
        transactionId
    );

    console.log(
        "============================================================"
    );


    // ------------------------------------------------------------
    // 9. TEMPORARY DIAGNOSTIC RESPONSE
    // ------------------------------------------------------------

    return new Response(
        JSON.stringify(
            {
                diagnostic: true,

                method: request.method,

                paddle_signature_present:
                    signaturePresent,

                secret_configured:
                    secretPresent,

                timestamp_present:
                    timestampPresent,

                h1_present:
                    h1Present,

                h1_length:
                    h1Length,

                event_type:
                    eventType,

                event_id:
                    eventId,

                transaction_id:
                    transactionId
            },
            null,
            2
        ),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
}
