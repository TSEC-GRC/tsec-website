// ============================================================
// TSEC — Paddle Webhook
// Production-Ready Sandbox Version
// P1.9 — Signature Verification + Transaction Validation
// ============================================================

import crypto from "crypto";


// ============================================================
// TSEC CONFIGURATION
// ============================================================

const TSEC_SOC2_PRICE_ID =
    "pri_01m306t66hbgv4rn4zg3n7xqzr";

const TSEC_SOC2_PRODUCT_ID =
    "pro_01m2zw8nsgkxj3kzx2jptkmr3p";

const EXPECTED_EVENT_TYPE =
    "transaction.completed";


// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(request) {

    // --------------------------------------------------------
    // 1. HTTP METHOD
    // --------------------------------------------------------

    if (request.method !== "POST") {

        return jsonResponse(
            {
                error: "Method Not Allowed"
            },
            405
        );
    }


    // --------------------------------------------------------
    // 2. READ RAW BODY
    //
    // IMPORTANT:
    // Paddle signature verification requires the raw body.
    // Do not parse JSON before verification.
    // --------------------------------------------------------

    const rawBody =
        await request.text();


    // --------------------------------------------------------
    // 3. READ SECURITY CREDENTIALS
    // --------------------------------------------------------

    const paddleSignature =
        request.headers.get(
            "paddle-signature"
        );

    const secretKey =
        process.env.PADDLE_WEBHOOK_SECRET;


    if (!paddleSignature) {

        console.error(
            "❌ Missing Paddle-Signature header"
        );

        return jsonResponse(
            {
                error:
                    "Missing Paddle-Signature"
            },
            400
        );
    }


    if (!secretKey) {

        console.error(
            "❌ PADDLE_WEBHOOK_SECRET is not configured"
        );

        return jsonResponse(
            {
                error:
                    "Webhook secret not configured"
            },
            500
        );
    }


    // --------------------------------------------------------
    // 4. PARSE PADDLE-SIGNATURE
    //
    // Expected structure:
    //
    // ts=1234567890;h1=abcdef...
    //
    // Multiple h1 values are supported.
    // --------------------------------------------------------

    let timestamp = null;

    const receivedSignatures = [];


    const signatureParts =
        paddleSignature.split(";");


    for (const part of signatureParts) {

        const separatorIndex =
            part.indexOf("=");


        if (separatorIndex === -1) {
            continue;
        }


        const key =
            part
                .substring(
                    0,
                    separatorIndex
                )
                .trim();


        const value =
            part
                .substring(
                    separatorIndex + 1
                )
                .trim();


        if (key === "ts") {

            timestamp =
                value;
        }


        if (key === "h1") {

            receivedSignatures.push(
                value
            );
        }
    }


    if (!timestamp) {

        console.error(
            "❌ Paddle signature timestamp missing"
        );

        return jsonResponse(
            {
                error:
                    "Missing signature timestamp"
            },
            400
        );
    }


    if (
        receivedSignatures.length === 0
    ) {

        console.error(
            "❌ Paddle h1 signature missing"
        );

        return jsonResponse(
            {
                error:
                    "Missing signature"
            },
            400
        );
    }


    // --------------------------------------------------------
    // 5. REPLAY PROTECTION
    //
    // Paddle recommends checking that the timestamp is recent.
    // Five minutes gives some operational tolerance while
    // preventing old signed requests from being replayed.
    // --------------------------------------------------------

    const timestampSeconds =
        Number(timestamp);


    if (
        !Number.isFinite(
            timestampSeconds
        )
    ) {

        console.error(
            "❌ Invalid Paddle timestamp"
        );

        return jsonResponse(
            {
                error:
                    "Invalid signature timestamp"
            },
            400
        );
    }


    const currentTimestamp =
        Math.floor(
            Date.now() / 1000
        );


    const timestampAge =
        Math.abs(
            currentTimestamp -
            timestampSeconds
        );


    const MAX_SIGNATURE_AGE =
        300;


    if (
        timestampAge >
        MAX_SIGNATURE_AGE
    ) {

        console.error(
            "❌ Paddle webhook timestamp outside allowed window",
            {
                timestampAge
            }
        );

        return jsonResponse(
            {
                error:
                    "Webhook timestamp outside allowed window"
            },
            401
        );
    }


    // --------------------------------------------------------
    // 6. BUILD SIGNED PAYLOAD
    //
    // Paddle:
    //
    // timestamp + ":" + rawBody
    // --------------------------------------------------------

    const signedPayload =
        `${timestamp}:${rawBody}`;


    // --------------------------------------------------------
    // 7. CALCULATE EXPECTED HMAC
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // 8. COMPARE AGAINST RECEIVED SIGNATURES
    // --------------------------------------------------------

    let signatureVerified =
        false;


    for (
        const receivedSignature
        of receivedSignatures
    ) {

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

            signatureVerified =
                true;

            break;
        }
    }


    // --------------------------------------------------------
    // 9. REJECT INVALID SIGNATURE
    // --------------------------------------------------------

    if (!signatureVerified) {

        console.error(
            "❌ Paddle webhook signature verification failed"
        );

        return jsonResponse(
            {
                error:
                    "Invalid signature"
            },
            401
        );
    }


    console.log(
        "✅ Paddle webhook signature verified"
    );


    // --------------------------------------------------------
    // 10. PARSE JSON AFTER SIGNATURE VERIFICATION
    // --------------------------------------------------------

    let event;


    try {

        event =
            JSON.parse(
                rawBody
            );

    } catch (error) {

        console.error(
            "❌ Invalid JSON payload"
        );

        return jsonResponse(
            {
                error:
                    "Invalid JSON payload"
            },
            400
        );
    }


    // --------------------------------------------------------
    // 11. BASIC EVENT VALIDATION
    // --------------------------------------------------------

    const eventType =
        event?.event_type;


    const eventId =
        event?.event_id;


    const transaction =
        event?.data;


    const transactionId =
        transaction?.id;


    if (
        eventType !==
        EXPECTED_EVENT_TYPE
    ) {

        console.log(
            "ℹ️ Ignoring unsupported event type:",
            eventType
        );

        return jsonResponse(
            {
                received: true,
                processed: false,
                reason:
                    "Unsupported event type"
            },
            200
        );
    }


    if (!eventId) {

        console.error(
            "❌ Missing Paddle event_id"
        );

        return jsonResponse(
            {
                error:
                    "Missing event_id"
            },
            400
        );
    }


    if (!transactionId) {

        console.error(
            "❌ Missing transaction ID"
        );

        return jsonResponse(
            {
                error:
                    "Missing transaction ID"
            },
            400
        );
    }


    // --------------------------------------------------------
    // 12. VALIDATE TRANSACTION STATUS
    // --------------------------------------------------------

    const transactionStatus =
        transaction?.status;


    if (
        transactionStatus &&
        transactionStatus !==
            "completed"
    ) {

        console.error(
            "❌ Transaction status is not completed:",
            transactionStatus
        );

        return jsonResponse(
            {
                error:
                    "Transaction is not completed"
            },
            400
        );
    }


    // --------------------------------------------------------
    // 13. VALIDATE TSEC PRODUCT
    //
    // We accept the transaction only if one of its items
    // contains our exact Paddle Price ID.
    // --------------------------------------------------------

    const items =
        Array.isArray(
            transaction?.items
        )
            ? transaction.items
            : [];


    const matchingItem =
        items.find(
            item =>
                item?.price?.id ===
                TSEC_SOC2_PRICE_ID
        );


    if (!matchingItem) {

        console.error(
            "❌ Transaction does not contain the TSEC SOC 2 Price ID",
            {
                transactionId
            }
        );

        return jsonResponse(
            {
                error:
                    "Unrecognized TSEC product"
            },
            400
        );
    }


    // --------------------------------------------------------
    // 14. VALIDATE PRODUCT ID
    // --------------------------------------------------------

    const receivedProductId =
        matchingItem?.price?.product_id;


    if (
        receivedProductId !==
        TSEC_SOC2_PRODUCT_ID
    ) {

        console.error(
            "❌ Product ID mismatch",
            {
                transactionId
            }
        );

        return jsonResponse(
            {
                error:
                    "Product ID mismatch"
            },
            400
        );
    }


    // --------------------------------------------------------
    // 15. EXTRACT CUSTOMER INFORMATION
    // --------------------------------------------------------

    const customerId =
        transaction?.customer_id ||
        null;


    const customerEmail =
        transaction?.customer?.email ||
        transaction?.billing_details?.email ||
        null;


    // --------------------------------------------------------
    // 16. EXTRACT PURCHASE INFORMATION
    // --------------------------------------------------------

    const quantity =
        matchingItem?.quantity ||
        1;


    const currency =
        transaction?.currency_code ||
        null;


    const totals =
        transaction?.details?.totals ||
        null;


    const totalAmount =
        totals?.grand_total ||
        totals?.total ||
        null;


    // --------------------------------------------------------
    // 17. LOG VERIFIED TRANSACTION
    //
    // DO NOT log secrets or payment information.
    // --------------------------------------------------------

    console.log(
        "=============================================="
    );

    console.log(
        "TSEC PADDLE WEBHOOK — VERIFIED"
    );

    console.log(
        "=============================================="
    );

    console.log(
        "Event:",
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
        "Product ID:",
        receivedProductId
    );

    console.log(
        "Price ID:",
        matchingItem.price.id
    );

    console.log(
        "Quantity:",
        quantity
    );

    console.log(
        "Customer ID:",
        customerId
    );

    console.log(
        "Customer email:",
        customerEmail
            ? "[present]"
            : "[not provided]"
    );

    console.log(
        "Currency:",
        currency
    );

    console.log(
        "Amount:",
        totalAmount
    );

    console.log(
        "=============================================="
    );


    // --------------------------------------------------------
    // 18. FULFILLMENT PLACEHOLDER
    //
    // IMPORTANT:
    // We do NOT grant access here yet.
    //
    // P1.10 will add:
    //
    // - idempotency
    // - purchase record
    // - secure fulfillment
    // - download/access provisioning
    //
    // This prevents accidental double fulfillment.
    // --------------------------------------------------------

    console.log(
        "ℹ️ Transaction verified. Fulfillment not yet provisioned."
    );


    // --------------------------------------------------------
    // 19. SUCCESS RESPONSE
    // --------------------------------------------------------

    return jsonResponse(
        {
            received: true,
            processed: true,
            fulfillment:
                "pending",
            event_id:
                eventId,
            transaction_id:
                transactionId
        },
        200
    );
}


// ============================================================
// JSON RESPONSE HELPER
// ============================================================

function jsonResponse(
    payload,
    status = 200
) {

    return new Response(
        JSON.stringify(
            payload,
            null,
            2
        ),
        {
            status,
            headers: {
                "Content-Type":
                    "application/json"
            }
        }
    );
}
