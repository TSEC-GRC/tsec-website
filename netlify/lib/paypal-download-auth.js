import crypto from "node:crypto";

const TOKEN_TTL_SECONDS = 30 * 60;

function isValidSecret(secret) {
    return (
        typeof secret === "string" &&
        /^[a-f0-9]{64}$/i.test(secret)
    );
}

function isValidTransactionId(transactionId) {
    return (
        typeof transactionId === "string" &&
        /^[a-z0-9]{10,64}$/i.test(transactionId)
    );
}

function signPayload(encodedPayload, secret) {
    return crypto
        .createHmac("sha256", Buffer.from(secret, "hex"))
        .update(encodedPayload)
        .digest("base64url");
}

export function createDownloadAuthorization(
    transactionId,
    secret,
    ttlSeconds = TOKEN_TTL_SECONDS
) {
    if (
        !isValidTransactionId(transactionId) ||
        !isValidSecret(secret) ||
        !Number.isInteger(ttlSeconds) ||
        ttlSeconds < 60 ||
        ttlSeconds > 3600
    ) {
        throw new Error("Invalid download authorization parameters.");
    }

    const now = Math.floor(Date.now() / 1000);

    const payload = {
        version: 1,
        purpose: "paypal-download-status",
        transactionId,
        issuedAt: now,
        expiresAt: now + ttlSeconds
    };

    const encodedPayload = Buffer
        .from(JSON.stringify(payload))
        .toString("base64url");

    const signature = signPayload(encodedPayload, secret);

    return `${encodedPayload}.${signature}`;
}

export function verifyDownloadAuthorization(
    token,
    transactionId,
    secret
) {
    try {
        if (
            typeof token !== "string" ||
            token.length > 2048 ||
            !isValidTransactionId(transactionId) ||
            !isValidSecret(secret)
        ) {
            return false;
        }

        const parts = token.split(".");

        if (parts.length !== 2) {
            return false;
        }

        const [encodedPayload, suppliedSignature] = parts;

        if (
            !/^[A-Za-z0-9_-]+$/.test(encodedPayload) ||
            !/^[A-Za-z0-9_-]+$/.test(suppliedSignature)
        ) {
            return false;
        }

        const expectedSignature = signPayload(
            encodedPayload,
            secret
        );

        const expectedBuffer = Buffer.from(
            expectedSignature,
            "base64url"
        );

        const suppliedBuffer = Buffer.from(
            suppliedSignature,
            "base64url"
        );

        if (
            expectedBuffer.length !== suppliedBuffer.length ||
            !crypto.timingSafeEqual(
                expectedBuffer,
                suppliedBuffer
            )
        ) {
            return false;
        }

        const payload = JSON.parse(
            Buffer.from(
                encodedPayload,
                "base64url"
            ).toString("utf8")
        );

        const now = Math.floor(Date.now() / 1000);

        return (
            payload.version === 1 &&
            payload.purpose === "paypal-download-status" &&
            payload.transactionId === transactionId &&
            Number.isInteger(payload.issuedAt) &&
            Number.isInteger(payload.expiresAt) &&
            payload.issuedAt <= now + 60 &&
            payload.expiresAt > now &&
            payload.expiresAt > payload.issuedAt &&
            payload.expiresAt - payload.issuedAt <= 3600
        );
    } catch {
        return false;
    }
}
