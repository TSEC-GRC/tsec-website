import { getDatabase } from "@netlify/database";

const db = getDatabase();

export default async (request) => {

    try {

        // =====================================================
        // METHOD
        // =====================================================

        if (request.method !== "GET") {

            return new Response(
                JSON.stringify({
                    error: "Method not allowed"
                }),
                {
                    status: 405,
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Allow":
                            "GET"
                    }
                }
            );

        }


        // =====================================================
        // TRANSACTION ID
        // =====================================================

        const url =
            new URL(request.url);

        const transactionId =
            url.searchParams.get(
                "transaction_id"
            );


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
        // =====================================================

        if (
            !/^txn_[a-z0-9]+$/i.test(
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


        // =====================================================
        // FIND PURCHASE + ENTITLEMENT
        // =====================================================

        const result =
            await db.sql`

                SELECT

                    p.id AS purchase_id,

                    p.transaction_id,

                    p.customer_email,

                    p.product_id,

                    p.product_name,

                    p.payment_status,

                    p.fulfillment_status,

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