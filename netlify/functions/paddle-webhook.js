import crypto from "crypto";

export default async function handler(request) {

    // --------------------------------------------------------
    // Only POST
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // IMPORTANT:
    // Read the raw body exactly once.
    // --------------------------------------------------------

    const rawBody = await request.text();

    const paddleSignature =
        request.headers.get("paddle-signature");

    const secretKey =
        process.env.PADDLE_WEBHOOK_SECRET;

    if (!paddleSignature) {
        return new Response(
            JSON.stringify({
                error: "Missing Paddle-Signature"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }

    if (!secretKey) {
        return new Response(
            JSON.stringify({
                error: "Missing PADDLE_WEBHOOK_SECRET"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }

    // --------------------------------------------------------
    // Parse Paddle-Signature
    // --------------------------------------------------------

    let timestamp = null;
    const receivedSignatures = [];

    const components =
        paddleSignature.split(";");

    for (const component of components) {

        const separatorIndex =
            component.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const key =
            component
                .substring(0, separatorIndex)
                .trim();

        const value =
            component
                .substring(separatorIndex + 1)
                .trim();

        if (key === "ts") {
            timestamp = value;
        }

        if (key === "h1") {
            receivedSignatures.push(value);
        }
    }

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

    if (receivedSignatures.length === 0) {
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

    // --------------------------------------------------------
    // Paddle signing specification:
    //
    // signed_payload = timestamp + ":" + rawBody
    // --------------------------------------------------------

    const signedPayload =
        `${timestamp}:${rawBody}`;

    // --------------------------------------------------------
    // Calculate expected HMAC
    // --------------------------------------------------------

    const expectedSignature =
        crypto
            .createHmac("sha256", secretKey)
            .update(signedPayload, "utf8")
            .digest("hex");

    // --------------------------------------------------------
    // Compare against ALL received h1 values
    // --------------------------------------------------------

    let signatureMatch = false;

    for (const receivedSignature of receivedSignatures) {

        if (
            receivedSignature.length !==
            expectedSignature.length
        ) {
            continue;
        }

        const expectedBuffer =
            Buffer.from(
                expectedSignature,
                "utf8"
            );

        const receivedBuffer =
            Buffer.from(
                receivedSignature,
                "utf8"
            );

        if (
            crypto.timingSafeEqual(
                expectedBuffer,
                receivedBuffer
            )
        ) {
            signatureMatch = true;
            break;
        }
    }

    // --------------------------------------------------------
    // Parse event
    // --------------------------------------------------------

    let event = null;

    try {
        event = JSON.parse(rawBody);
    } catch (error) {
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

    // --------------------------------------------------------
    // Safe diagnostics
    // --------------------------------------------------------

    console.log(
        "=============================================="
    );

    console.log(
        "TSEC PADDLE HMAC DIAGNOSTIC"
    );

    console.log(
        "=============================================="
    );

    console.log(
        "Secret length:",
        secretKey.length
    );

    console.log(
        "Secret starts with pdl_ntfset_:",
        secretKey.startsWith("pdl_ntfset_")
    );

    console.log(
        "Timestamp length:",
        timestamp.length
    );

    console.log(
        "Raw body length:",
        rawBody.length
    );

    console.log(
        "Received h1 count:",
        receivedSignatures.length
    );

    console.log(
        "Received h1 lengths:",
        receivedSignatures.map(
            signature => signature.length
        )
    );

    console.log(
        "Expected signature length:",
        expectedSignature.length
    );

    console.log(
        "Signature match:",
        signatureMatch
    );

    console.log(
        "Event type:",
        event.event_type || null
    );

    console.log(
        "Event ID:",
        event.event_id || null
    );

    console.log(
        "Transaction ID:",
        event.data?.id || null
    );

    console.log(
        "=============================================="
    );

    // --------------------------------------------------------
    // IMPORTANT:
    // Do NOT fulfill if signature is invalid.
    // --------------------------------------------------------

    if (!signatureMatch) {

        return new Response(
            JSON.stringify({
                diagnostic: true,
                signature_match: false,
                received_h1_count:
                    receivedSignatures.length,
                received_h1_lengths:
                    receivedSignatures.map(
                        signature => signature.length
                    ),
                expected_signature_length:
                    expectedSignature.length,
                event_type:
                    event.event_type || null
            }, null, 2),
            {
                status: 401,
                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );
    }

    // --------------------------------------------------------
    // Signature VERIFIED
    // --------------------------------------------------------

    return new Response(
        JSON.stringify({
            diagnostic: true,
            signature_match: true,
            event_type:
                event.event_type || null,
            event_id:
                event.event_id || null,
            transaction_id:
                event.data?.id || null
        }, null, 2),
        {
            status: 200,
            headers: {
                "Content-Type":
                    "application/json"
            }
        }
    );
}
