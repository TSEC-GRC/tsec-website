// ============================================================
// TSEC — Paddle Webhook
// Production-Ready Sandbox Version
// P1.9 — Signature Verification + Transaction Validation
// ============================================================

import crypto from "crypto";
import { getDatabase } from "@netlify/database";
import { getProductByPriceId } from "./tsec-products.js";

const db = getDatabase();

const PADDLE_API_BASE_URL =
    "https://sandbox-api.paddle.com";

// ============================================================
// TSEC CONFIGURATION
// ============================================================


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
// Identify the purchased product through the private
// TSEC product catalog using the Paddle Price ID.
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
            getProductByPriceId(
                item?.price?.id
            )
    );


if (!matchingItem) {

    console.error(
        "❌ Transaction does not contain a recognized TSEC Price ID",
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


const tsecProduct =
    getProductByPriceId(
        matchingItem?.price?.id
    );


if (!tsecProduct) {

    console.error(
        "❌ TSEC product catalog lookup failed",
        {
            transactionId,
            priceId:
                matchingItem?.price?.id
        }
    );

    return jsonResponse(
        {
            error:
                "TSEC product catalog lookup failed"
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
console.log(
    "🔎 Paddle customer email diagnostic",
    {
        transactionId,
        customerId,

        transactionKeys:
            Object.keys(transaction || {}),
        customer:
            transaction?.customer || null,
        billingDetails:
            transaction?.billing_details || null,
        checkout:
            transaction?.checkout || null,
        customData:
            transaction?.custom_data || null
    }
);

if (!customerId) {

    console.error(
        "❌ Missing Paddle customer_id",
        {
            transactionId
        }
    );

    return jsonResponse(
        {
            error:
                "Missing Paddle customer ID"
        },
        400
    );
}


let customerEmail = null;


const paddleApiKey =
    process.env.PADDLE_API_KEY;


if (!paddleApiKey) {

    console.error(
        "❌ PADDLE_API_KEY is not configured"
    );

    return jsonResponse(
        {
            error:
                "Paddle API key not configured"
        },
        500
    );
}


try {

    const paddleTransactionResponse =
        await fetch(
            `${PADDLE_API_BASE_URL}/transactions/${transactionId}`,
            {
                method: "GET",
                headers: {
                    Authorization:
                        `Bearer ${paddleApiKey}`,
                    "Content-Type":
                        "application/json"
                }
            }
        );


    if (
        !paddleTransactionResponse.ok
    ) {

        const errorBody =
            await paddleTransactionResponse.text();


        console.error(
            "❌ Paddle transaction lookup failed",
            {
                transactionId,
                customerId,
                status:
                    paddleTransactionResponse.status,
                response:
                    errorBody
            }
        );

        return jsonResponse(
            {
                error:
                    "Unable to retrieve Paddle customer information"
            },
            502
        );
    }


    const paddleTransactionData =
        await paddleTransactionResponse.json();


    customerEmail =
        paddleTransactionData
            ?.data
            ?.custom_data
            ?.customer_email ||
        null;


} catch (error) {

    console.error(
        "❌ Paddle API request failed",
        {
            transactionId,
            customerId,
            error:
                error?.message ||
                String(error)
        }
    );

    return jsonResponse(
        {
            error:
                "Paddle customer lookup failed"
        },
        502
    );
}


if (!customerEmail) {

    console.error(
        "❌ Paddle customer email not found",
        {
            transactionId,
            customerId
        }
    );

    return jsonResponse(
        {
            error:
                "Customer email not found"
        },
        400
    );
}


console.log(
    "✅ Paddle customer information retrieved",
    {
        transactionId,
        customerId,
        customerEmail
    }
);
    

// --------------------------------------------------------
// 16. EXTRACT PURCHASE INFORMATION
// --------------------------------------------------------

const quantity =
    Number(
        matchingItem?.quantity || 1
    );


const currency =
    transaction?.currency_code ||
    null;


const totals =
    transaction?.details?.totals ||
    null;


const totalAmountMinor =
    totals?.grand_total ||
    totals?.total ||
    null;


// Paddle monetary values are provided
// in the lowest denomination.
// Example: USD 54266 = $542.66.

const totalAmount =
    totalAmountMinor !== null
        ? Number(totalAmountMinor) / 100
        : null;


// Current TSEC catalog product name.

const productName =
    "SOC 2 Professional Pack™";


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
// 18. SAVE PURCHASE — IDEMPOTENT
//
// Paddle can deliver the same event more than once.
// event_id is UNIQUE in the database.
//
// ON CONFLICT DO NOTHING guarantees that the same
// Paddle event cannot create a duplicate purchase.
// --------------------------------------------------------

const insertedPurchase =
    await db.sql`
        INSERT INTO purchases (
            event_id,
            transaction_id,
            customer_email,
            product_id,
            price_id,
            product_name,
            quantity,
            amount,
            currency,
            payment_status,
            fulfillment_status
        )
        VALUES (
            ${eventId},
            ${transactionId},
            ${customerEmail},
            ${TSEC_SOC2_PRODUCT_ID},
            ${TSEC_SOC2_PRICE_ID},
            ${productName},
            ${quantity},
            ${totalAmount},
            ${currency},
            ${"completed"},
            ${"pending"}
        )
        ON CONFLICT (event_id)
        DO NOTHING
        RETURNING id
    `;


// --------------------------------------------------------
// 19. RESOLVE PURCHASE ID
//
// For a new event, use the ID returned by INSERT.
// For a duplicate event, retrieve the existing purchase.
// --------------------------------------------------------

let purchaseId;

if (insertedPurchase.length > 0) {

    purchaseId =
        insertedPurchase[0].id;

    console.log(
        "✅ Purchase recorded in Netlify Database",
        {
            purchaseId,
            eventId,
            transactionId
        }
    );

} else {

    const existingPurchase =
        await db.sql`
            SELECT id
            FROM purchases
            WHERE event_id = ${eventId}
            LIMIT 1
        `;

    if (existingPurchase.length === 0) {

        throw new Error(
            "Purchase conflict detected, but existing purchase could not be found."
        );

    }

    purchaseId =
        existingPurchase[0].id;

    console.log(
        "ℹ️ Duplicate Paddle event detected",
        {
            purchaseId,
            eventId,
            transactionId
        }
    );
}


// --------------------------------------------------------
// 20. CREATE DOWNLOAD ENTITLEMENT — IDEMPOTENT
//
// Each purchase may have only one entitlement.
// purchase_id is UNIQUE in download_entitlements.
//
// The token is generated only when the entitlement does
// not already exist.
// --------------------------------------------------------

const existingEntitlement =
    await db.sql`
        SELECT id
        FROM download_entitlements
        WHERE purchase_id = ${purchaseId}
        LIMIT 1
    `;


let entitlementId;

if (existingEntitlement.length > 0) {

    entitlementId =
        existingEntitlement[0].id;

    console.log(
        "ℹ️ Download entitlement already exists",
        {
            entitlementId,
            purchaseId,
            eventId
        }
    );

} else {

    const cryptoToken =
        crypto.randomBytes(32).toString("hex");

    const entitlement =
        await db.sql`
            INSERT INTO download_entitlements (
                purchase_id,
                customer_email,
                product_id,
                download_token,
                download_count,
                max_downloads,
                expires_at,
                status
            )
            VALUES (
                ${purchaseId},
                ${customerEmail},
                ${TSEC_SOC2_PRODUCT_ID},
                ${cryptoToken},
                ${0},
                ${5},
                ${new Date(
                    Date.now() +
                    7 * 24 * 60 * 60 * 1000
                ).toISOString()},
                ${"active"}
            )
            ON CONFLICT (purchase_id)
            DO NOTHING
            RETURNING id
        `;

    if (entitlement.length === 0) {

        const existingAfterConflict =
            await db.sql`
                SELECT id
                FROM download_entitlements
                WHERE purchase_id = ${purchaseId}
                LIMIT 1
            `;

        if (existingAfterConflict.length === 0) {

            throw new Error(
                "Download entitlement could not be created."
            );

        }

        entitlementId =
            existingAfterConflict[0].id;

    } else {

        entitlementId =
            entitlement[0].id;
    }

    console.log(
        "✅ Download entitlement ready",
        {
            entitlementId,
            purchaseId,
            productId:
                TSEC_SOC2_PRODUCT_ID,
            expiresInDays: 7,
            maxDownloads: 5
        }
    );
}


// --------------------------------------------------------
// 21. MARK PURCHASE READY FOR FULFILLMENT
//
// "ready" means the secure download entitlement exists.
// The customer has not necessarily downloaded the product yet.
// --------------------------------------------------------

await db.sql`
    UPDATE purchases
    SET
        fulfillment_status = ${"ready"},
        updated_at = NOW()
    WHERE id = ${purchaseId}
`;

console.log(
    "✅ Purchase fulfillment status updated",
    {
        purchaseId,
        fulfillmentStatus: "ready"
    }
);
    // --------------------------------------------------------
    // 19. SUCCESS RESPONSE
    // --------------------------------------------------------

    return jsonResponse(
    {
        received: true,
        processed: true,
        purchase_recorded:
            true,
        fulfillment:
            "ready",
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





