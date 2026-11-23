import { getDatabase } from "@netlify/database";
import { verifyDownloadAuthorization } from "../lib/paypal-download-auth.js";

const db = getDatabase();

export default async (request) => {

    try {

        // =====================================================
        // METHOD
        // =====================================================

        if (!["GET", "POST"].includes(request.method)) {
            return new Response(
                JSON.stringify({ error: "Method not allowed" }),
                {
                    status: 405,
                    headers: {
                        "Content-Type": "application/json",
                        "Allow": "GET, POST",
                        "Cache-Control": "no-store"
                    }
                }
            );
        }

// =====================================================
        // TRANSACTION ID
        // =====================================================

        const url = new URL(request.url);
        let transactionId = null;

        if (request.method === "GET") {
            transactionId = url.searchParams.get("transaction_id");
        } else {
            let body;

            try {
                body = await request.json();
            } catch {
                return new Response(
                    JSON.stringify({ error: "Invalid JSON body" }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Cache-Control": "no-store"
                        }
                    }
                );
            }

            transactionId = body?.transaction_id;
            const downloadAuthorization = body?.downloadAuthorization;
            const downloadTokenSecret = process.env.PAYPAL_DOWNLOAD_TOKEN_SECRET;

            if (
                typeof downloadTokenSecret !== "string" ||
                !/^[a-f0-9]{64}$/i.test(downloadTokenSecret)
            ) {
                console.error("PayPal download authorization secret is missing or invalid.");

                return new Response(
                    JSON.stringify({ error: "Download authorization is temporarily unavailable" }),
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "application/json",
                            "Cache-Control": "no-store"
                        }
                    }
                );
            }

            if (
                typeof transactionId !== "string" ||
                !verifyDownloadAuthorization(
                    downloadAuthorization,
                    transactionId,
                    downloadTokenSecret
                )
            ) {
                return new Response(
                    JSON.stringify({ error: "Invalid or expired download authorization" }),
                    {
                        status: 401,
                        headers: {
                            "Content-Type": "application/json",
                            "Cache-Control": "no-store"
                        }
                    }
                );
            }
        }

        if (!transactionId) {

            return new Response(
                JSON.stringify({
                    error:
                        "transaction_id is required"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        // =====================================================
        // BASIC FORMAT VALIDATION
        // Supports Paddle transaction IDs and PayPal capture IDs
        // =====================================================

        if (
            !(request.method === "GET" ? /^txn_[a-z0-9]+$/i : /^[a-z0-9]{10,64}$/i).test(
                transactionId
            )
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "Invalid transaction ID"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }

        // FIND PURCHASE + ENTITLEMENT
        // =====================================================

        const result =
            await db.sql`

                SELECT

                    p.id AS purchase_id,

                    p.transaction_id,

                    p.payment_provider,

                    p.customer_email,

                    p.product_id,

                    p.product_name,

                    p.payment_status,

                    p.fulfillment_status,

                    e.product_id AS entitlement_product_id,

                    e.id AS entitlement_id,

                    e.download_token,

                    e.download_count,

                    e.max_downloads,

                    e.expires_at,

                    e.status AS entitlement_status

                FROM purchases p

                INNER JOIN download_entitlements e

                    ON e.purchase_id = p.id

                WHERE p.transaction_id =
                    ${transactionId}

                LIMIT 1

            `;


        // =====================================================
        // PURCHASE NOT READY
        // =====================================================

        if (
            result.length === 0
        ) {

            return new Response(
                JSON.stringify({
                    ready: false,
                    status:
                        "processing"
                }),
                {
                    status: 202,
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );

        }


        const record =
            result[0];

        // =====================================================
        // PAYMENT PROVIDER / METHOD VALIDATION
        // =====================================================

        const expectedProvider =
            request.method === "GET" ? "paddle" : "paypal";

        if (record.payment_provider !== expectedProvider) {
            return new Response(
                JSON.stringify({ error: "Payment provider verification failed" }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store"
                    }
                }
            );
        }


        // =====================================================
        // PURCHASE / ENTITLEMENT CONSISTENCY
        // =====================================================

        if (
            record.product_id !==
            record.entitlement_product_id
        ) {

            console.error(
                "Purchase and entitlement product mismatch:",
                record.purchase_id
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Download entitlement verification failed"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );

        }


        // =====================================================
        // PAYMENT VERIFICATION
        // =====================================================

        if (
            record.payment_status !==
                "completed"
            ||
            record.fulfillment_status !==
                "ready"
        ) {

            return new Response(
                JSON.stringify({
                    ready: false,
                    status:
                        "processing"
                }),
                {
                    status: 202,
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );

        }


        // =====================================================
        // ENTITLEMENT STATUS
        // =====================================================

        if (
            record.entitlement_status !==
                "active"
        ) {

            return new Response(
                JSON.stringify({
                    ready: false,
                    status:
                        "unavailable"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );

        }


        // =====================================================
        // EXPIRATION
        // =====================================================

        if (
            record.expires_at
            &&
            new Date(
                record.expires_at
            ).getTime()
            <=
            Date.now()
        ) {

            return new Response(
                JSON.stringify({
                    ready: false,
                    status:
                        "expired"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );

        }


        // =====================================================
        // DOWNLOAD LIMIT
        // =====================================================

        if (
            record.download_count
            >=
            record.max_downloads
        ) {

            return new Response(
                JSON.stringify({
                    ready: false,
                    status:
                        "limit_reached"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );

        }


        // =====================================================
        // DOWNLOAD TOKEN VALIDATION
        // =====================================================

        if (
            typeof record.download_token !== "string"
            ||
            !/^[a-f0-9]{64}$/i.test(
                record.download_token
            )
        ) {

            console.error(
                "Invalid download token for entitlement:",
                record.entitlement_id
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Secure download verification failed"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );

        }

        // BUILD SECURE DOWNLOAD URL
        // =====================================================

        const downloadUrl =
            new URL(
                "/.netlify/functions/secure-download",
                url.origin
            );


        downloadUrl.searchParams.set(
            "token",
            record.download_token
        );


        // =====================================================
        // SUCCESS
        // =====================================================

        return new Response(
            JSON.stringify({

                ready:
                    true,

                status:
                    "ready",

                product:
                    record.product_name,

                transaction_id:
                    record.transaction_id,

                downloads_remaining:
                    record.max_downloads -
                    record.download_count,

                expires_at:
                    record.expires_at,

                download_url:
                    downloadUrl.toString()

            }),
            {
                status: 200,
                headers: {
                    "Content-Type":
                        "application/json",

                    "Cache-Control":
                        "no-store"
                }
            }
        );


    } catch (error) {

        console.error(
            "GET DOWNLOAD LINK ERROR:",
            error
        );


        return new Response(
            JSON.stringify({
                error:
                    "Internal server error"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );

    }

};