// ============================================================
// TSEC — Paddle Webhook
// TEMPORARY HMAC DIAGNOSTIC VERSION
// P1.9 — Signature Verification Diagnostics
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

    const rawBody =
        await request.text();


    // ------------------------------------------------------------
    // 3. READ PADDLE SIGNATURE
    // ------------------------------------------------------------

    const paddleSignature =
        request.headers.get(
            "paddle-signature"
        );


    if (!paddleSignature) {

        return new Response(
            JSON.stringify({
                error: "Missing Paddle signature"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }


    // ------------------------------------------------------------
    // 4. READ SECRET
    // ------------------------------------------------------------

    const secretKey =
        process.env.PADDLE_WEBHOOK_SECRET;


    if (!secretKey) {

        return new Response(
            JSON.stringify({
                error: "PADDLE_WEBHOOK_SECRET is not configured"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }


    // ------------------------------------------------------------
    // 5. PARSE PADDLE-SIGNATURE
    // ------------------------------------------------------------

    let timestamp = null;
    let receivedSignature = null;

    const signatureParts =
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


    // ------------------------------------------------------------
    // 6. BASIC VALIDATION
    // ------------------------------------------------------------

    if (!timestamp) {

        return new Response(
            JSON.stringify({
                error: "Missing timestamp"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }


    if (!receivedSignature) {

        return new Response(
            JSON.stringify({
                error: "Missing h1 signature"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }


    // ------------------------------------------------------------
    // 7. TIMESTAMP VALIDATION
    // ------------------------------------------------------------

    const timestampSeconds =
        Number(timestamp);


    if (!Number.isFinite(timestampSeconds)) {

        return new Response(
            JSON.stringify({
                error: "Invalid timestamp"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }


    const currentTimestamp =
        Math.floor(
            Date.now() / 1000
        );


    const timestampDifference =
        Math.abs(
            currentTimestamp -
            timestampSeconds
        );


    console.log(
        "Paddle timestamp difference:",
        timestampDifference,
        "seconds"
    );


    // ------------------------------------------------------------
    // 8. CALCULATE EXPECTED HMAC
    // ------------------------------------------------------------

    const signedPayload =
        `${timestamp}:${rawBody}`;


    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                secretKey
            )
            .update(
                signedPayload,
                "utf8"
            )
            .digest("hex");


    // ------------------------------------------------------------
    // 9. SAFE LENGTH CHECK
    // ------------------------------------------------------------

    const receivedLength =
        receivedSignature.length;


    const expectedLength =
        expectedSignature.length;


    // ------------------------------------------------------------
    // 10. SAFE SIGNATURE COMPARISON
    // ------------------------------------------------------------

    let signatureMatch = false;


    if (
        receivedLength ===
        expectedLength
    ) {

        const receivedBuffer =
            Buffer.from(
                receivedSignature,
                "hex"
            );


        const expectedBuffer =
            Buffer.from(
                expectedSignature,
                "hex"
            );


        if (
            receivedBuffer.length ===
            expectedBuffer.length
        ) {

            signatureMatch =
                crypto.timingSafeEqual(
                    receivedBuffer,
                    expectedBuffer
                );

        }

    }


    // ------------------------------------------------------------
    // 11. PARSE EVENT
    // ------------------------------------------------------------

    let event = null;


    try {

        event =
            JSON.parse(rawBody);

    } catch (error) {

        console.error(
            "❌ Invalid JSON payload"
        );

        return new Response(
            JSON.stringify({
                error: "Invalid JSON"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    const eventType =
        event?.event_type || null;


    const eventId =
        event?.event_id || null;


    const transactionId =
        event?.data?.id || null;


    // ------------------------------------------------------------
    // 12. SAFE DIAGNOSTIC LOGGING
    // ------------------------------------------------------------

    console.log(
        "============================================================"
    );

    console.log(
        "TSEC PADDLE HMAC DIAGNOSTIC"
    );

    console.log(
        "============================================================"
    );

    console.log(
        "Method:",
        request.method
    );

    console.log(
        "Raw body length:",
        rawBody.length
    );

    console.log(
        "Timestamp present:",
        Boolean(timestamp)
    );

    console.log(
        "Received signature length:",
        receivedLength
    );

    console.log(
        "Expected signature length:",
        expectedLength
    );

    console.log(
        "Signature match:",
        signatureMatch
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
    // 13. DIAGNOSTIC RESPONSE
    // ------------------------------------------------------------

    return new Response(
        JSON.stringify(
            {
                diagnostic: true,

                method:
                    request.method,

                timestamp_present:
                    Boolean(timestamp),

                received_signature_length:
                    receivedLength,

                expected_signature_length:
                    expectedLength,

                signature_match:
                    signatureMatch,

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
