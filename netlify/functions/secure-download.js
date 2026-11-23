import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";
import { getProductById } from "../lib/tsec-products.js";

const DOWNLOAD_STORE = "tsec-pro-downloads";

export function createSecureDownloadHandler({ db, getStore, getProductById }) {
    if (!db || typeof db.sql !== "function") {
        throw new TypeError("A valid database dependency is required");
    }

    if (typeof getStore !== "function") {
        throw new TypeError("A valid getStore dependency is required");
    }

    if (typeof getProductById !== "function") {
        throw new TypeError("A valid getProductById dependency is required");
    }

    return async (request) => {
    try {
        // ---------------------------------------------------------
        // METHOD
        // ---------------------------------------------------------

        if (request.method !== "GET") {
            return new Response(
                JSON.stringify({
                    error: "Method not allowed"
                }),
                {
                    status: 405,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store",
                        "Allow": "GET"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // TOKEN
        // ---------------------------------------------------------

        const url = new URL(request.url);
        const token = url.searchParams.get("token");

        if (!token) {
            return new Response(
                JSON.stringify({
                    error: "Download token is required"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // Basic token format validation.
        // Current webhook generates 32 random bytes as hex.
        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return new Response(
                JSON.stringify({
                    error: "Invalid download token"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // FIND ENTITLEMENT
        // ---------------------------------------------------------

        const entitlementResult = await db.sql`
            SELECT
                e.id,
                e.purchase_id,
                e.customer_email,
                e.product_id,
                e.download_token,
                e.download_count,
                e.max_downloads,
                e.expires_at,
                e.status,
                p.product_id AS purchase_product_id,
                p.payment_status,
                p.fulfillment_status
            FROM purchases p
            INNER JOIN download_entitlements e
                ON e.purchase_id = p.id
            WHERE e.download_token = ${token}
            LIMIT 1
        `;

        if (entitlementResult.length === 0) {
            return new Response(
                JSON.stringify({
                    error: "Invalid or expired download link"
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        const entitlement = entitlementResult[0];
        // ---------------------------------------------------------
        // PURCHASE AND PAYMENT VALIDATION
        // ---------------------------------------------------------

        if (
            entitlement.product_id !==
            entitlement.purchase_product_id
        ) {
            console.error(
                "Purchase and entitlement product mismatch:",
                entitlement.purchase_id
            );

            return new Response(
                JSON.stringify({
                    error: "Download entitlement verification failed"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        if (
            entitlement.payment_status !== "completed" ||
            entitlement.fulfillment_status !== "ready"
        ) {
            return new Response(
                JSON.stringify({
                    error: "Download is not authorized"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // STATUS
        // ---------------------------------------------------------

        if (entitlement.status !== "active") {
            return new Response(
                JSON.stringify({
                    error: "Download entitlement is not active"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // ENTITLEMENT DATA VALIDATION
        // ---------------------------------------------------------

        const expirationTime =
            entitlement.expires_at === null
                ? null
                : new Date(entitlement.expires_at).getTime();

        const validExpiration =
            expirationTime === null ||
            Number.isFinite(expirationTime);

        const validDownloadCount =
            Number.isSafeInteger(entitlement.download_count) &&
            entitlement.download_count >= 0;

        const validDownloadLimit =
            Number.isSafeInteger(entitlement.max_downloads) &&
            entitlement.max_downloads > 0;

        if (
            !validExpiration ||
            !validDownloadCount ||
            !validDownloadLimit ||
            entitlement.download_count > entitlement.max_downloads
        ) {
            return new Response(
                JSON.stringify({
                    error: "Download entitlement data is invalid"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }
        // EXPIRATION
        // ---------------------------------------------------------

        if (
            entitlement.expires_at &&
            new Date(entitlement.expires_at).getTime() <= Date.now()
        ) {
            await db.sql`
                UPDATE download_entitlements
                SET
                    status = ${"expired"},
                    updated_at = NOW()
                WHERE id = ${entitlement.id}
                  AND status = ${"active"}
            `;

            return new Response(
                JSON.stringify({
                    error: "Download link has expired"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // DOWNLOAD LIMIT
        // ---------------------------------------------------------

        if (
            entitlement.download_count >=
            entitlement.max_downloads
        ) {
            return new Response(
                JSON.stringify({
                    error: "Download limit reached"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // ---------------------------------------------------------
        // RESOLVE TSEC PRODUCT
        // ---------------------------------------------------------

        const tsecProduct = getProductById(entitlement.product_id);

        if (!tsecProduct) {
            console.error(
                "Unrecognized TSEC product:",
                entitlement.product_id
            );

            return new Response(
                JSON.stringify({
                    error: "Download product is not configured"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // GET PRIVATE BLOB BEFORE CONSUMING A DOWNLOAD
        // ---------------------------------------------------------

        const store = getStore(DOWNLOAD_STORE);

        const zipData = await store.get(
            tsecProduct.blobKey,
            {
                type: "arrayBuffer"
            }
        );

        if (!zipData) {
            console.error(
                "TSEC product ZIP not found in Netlify Blob Store:",
                tsecProduct.blobKey
            );

            return new Response(
                JSON.stringify({
                    error: "Download file is temporarily unavailable"
                }),
                {
                    status: 503,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // ATOMIC DOWNLOAD COUNTER UPDATE
        // ---------------------------------------------------------

        const updatedEntitlement = await db.sql`
            UPDATE download_entitlements
            SET
                download_count = download_count + 1,
                last_downloaded_at = NOW(),
                updated_at = NOW()
            WHERE id = ${entitlement.id}
              AND status = ${"active"}
              AND download_count < max_downloads
              AND (
                  expires_at IS NULL
                  OR expires_at > NOW()
              )
              AND EXISTS (
                  SELECT 1
                  FROM purchases p
                  WHERE p.id = download_entitlements.purchase_id
                    AND p.payment_status = ${"completed"}
                    AND p.fulfillment_status = ${"ready"}
                    AND p.product_id = download_entitlements.product_id
              )
              RETURNING
                id,
                download_count,
                max_downloads
        `;

        if (updatedEntitlement.length === 0) {
            return new Response(
                JSON.stringify({
                    error: "Download limit reached or entitlement is no longer active"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "private, no-store"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // RESPONSE
        // ---------------------------------------------------------

        return new Response(zipData, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition":
                    `attachment; filename="${tsecProduct.downloadFilename}"`,
                "Content-Length":
                    String(zipData.byteLength),
                "Cache-Control":
                    "private, no-store, max-age=0",
                "Pragma": "no-cache",
                "X-Download-Count":
                    String(updatedEntitlement[0].download_count),
                "X-Download-Limit":
                    String(updatedEntitlement[0].max_downloads)
            }
        });

    } catch (error) {

        console.error(
            "SECURE DOWNLOAD ERROR:",
            error
        );

        return new Response(
            JSON.stringify({
                error: "Internal server error"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "private, no-store"
                }
            }
        );
    }
    };
}

let defaultHandler;

export default async (request) => {
    if (!defaultHandler) {
        defaultHandler = createSecureDownloadHandler({
            db: getDatabase(),
            getStore,
            getProductById
        });
    }

    return defaultHandler(request);
};
