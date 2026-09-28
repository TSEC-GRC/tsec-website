import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";
import { getProductById } from "./tsec-products.js";

const db = getDatabase();

const DOWNLOAD_STORE = "tsec-pro-downloads";
export default async (request) => {
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
                        "Content-Type": "application/json"
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
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // FIND ENTITLEMENT
        // ---------------------------------------------------------

        const entitlementResult = await db.sql`
            SELECT
                id,
                purchase_id,
                customer_email,
                product_id,
                download_token,
                download_count,
                max_downloads,
                expires_at,
                status
            FROM download_entitlements
            WHERE download_token = ${token}
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
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const entitlement = entitlementResult[0];

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
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // ---------------------------------------------------------
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
                        "Content-Type": "application/json"
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
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // ATOMIC DOWNLOAD COUNTER UPDATE
        // ---------------------------------------------------------
        //
        // This prevents two simultaneous requests from both
        // consuming the same remaining download slot.
        //
        // We only increment while:
        //   status = active
        //   download_count < max_downloads
        //
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
            RETURNING
                id,
                download_count,
                max_downloads
        `;

        if (updatedEntitlement.length === 0) {
            return new Response(
                JSON.stringify({
                    error: "Download limit reached"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // RESOLVE TSEC PRODUCT
        // ---------------------------------------------------------
        //
        // The entitlement stores the internal TSEC product ID.
        // Resolve the corresponding private product catalog
        // entry to determine the Blob key and download filename.
        // ---------------------------------------------------------

        const tsecProduct =
            getProductById(
                entitlement.product_id
            );

        if (!tsecProduct) {

            // Roll back the download counter if the product
            // is not recognized by the private catalog.
            await db.sql`
                UPDATE download_entitlements
                SET
                    download_count = GREATEST(
                        download_count - 1,
                        0
                    ),
                    last_downloaded_at = NULL,
                    updated_at = NOW()
                WHERE id = ${entitlement.id}
            `;

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
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // ---------------------------------------------------------
        // GET PRIVATE BLOB
        // ---------------------------------------------------------

        const store =
            getStore(DOWNLOAD_STORE);

        const zipData =
            await store.get(
                tsecProduct.blobKey,
                {
                    type: "arrayBuffer"
                }
            );

        if (!zipData) {

            // Roll back the download counter if the file cannot
            // be retrieved.
            await db.sql`
                UPDATE download_entitlements
                SET
                    download_count = GREATEST(
                        download_count - 1,
                        0
                    ),
                    last_downloaded_at = NULL,
                    updated_at = NOW()
                WHERE id = ${entitlement.id}
            `;

            console.error(
                "TSEC product ZIP not found in Netlify Blob Store:",
                tsecProduct.blobKey
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Download file is temporarily unavailable"
                }),
                {
                    status: 503,
                    headers: {
                        "Content-Type": "application/json"
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
                    "Content-Type": "application/json"
                }
            }
        );
    }
};
