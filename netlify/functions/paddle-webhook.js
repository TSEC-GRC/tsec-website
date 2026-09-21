// ============================================================
// TSEC — Paddle Webhook
// TEMPORARY SECRET FORMAT DIAGNOSTIC
// ============================================================

export default async function handler(request) {

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

    const rawBody = await request.text();

    const paddleSignature =
        request.headers.get("paddle-signature");

    const secretKey =
        process.env.PADDLE_WEBHOOK_SECRET || "";


    // --------------------------------------------------------
    // SECRET STRUCTURE — NEVER expose the secret itself
    // --------------------------------------------------------

    const secretLength =
        secretKey.length;

    const trimmedSecret =
        secretKey.trim();

    const hasLeadingWhitespace =
        secretKey.length !==
        secretKey.trimStart().length;

    const hasTrailingWhitespace =
        secretKey.length !==
        secretKey.trimEnd().length;

    const hasWhitespaceAnywhere =
        /\s/.test(secretKey);

    const hasDoubleQuotes =
        secretKey.includes('"');

    const hasSingleQuotes =
        secretKey.includes("'");

    const startsCorrectly =
        secretKey.startsWith("pdl_ntfset_");

    const secretFormatCorrect =
        /^pdl_ntfset_[A-Za-z0-9]{26}_[A-Za-z0-9]{32}$/.test(
            secretKey
        );


    // --------------------------------------------------------
    // SIGNATURE STRUCTURE
    // --------------------------------------------------------

    let timestamp = null;
    let receivedSignature = null;

    if (paddleSignature) {

        const components =
            paddleSignature.split(";");

        for (const component of components) {

            const separatorIndex =
                component.indexOf("=");

            if (separatorIndex === -1) continue;

            const key =
                component.substring(
                    0,
                    separatorIndex
                ).trim();

            const value =
                component.substring(
                    separatorIndex + 1
                ).trim();

            if (key === "ts") {
                timestamp = value;
            }

            if (key === "h1") {
                receivedSignature = value;
            }
        }
    }


    // --------------------------------------------------------
    // PAYLOAD
    // --------------------------------------------------------

    let event = null;

    try {

        event =
            JSON.parse(rawBody);

    } catch (error) {

        console.error(
            "Payload is not valid JSON"
        );
    }


    // --------------------------------------------------------
    // LOG SAFE DIAGNOSTICS
    // --------------------------------------------------------

    console.log(
        "=============================================="
    );

    console.log(
        "TSEC PADDLE SECRET FORMAT DIAGNOSTIC"
    );

    console.log(
        "=============================================="
    );

    console.log(
        "Secret configured:",
        Boolean(secretKey)
    );

    console.log(
        "Secret length:",
        secretLength
    );

    console.log(
        "Starts with pdl_ntfset_:",
        startsCorrectly
    );

    console.log(
        "Secret format correct:",
        secretFormatCorrect
    );

    console.log(
        "Has leading whitespace:",
        hasLeadingWhitespace
    );

    console.log(
        "Has trailing whitespace:",
        hasTrailingWhitespace
    );

    console.log(
        "Has whitespace anywhere:",
        hasWhitespaceAnywhere
    );

    console.log(
        "Contains double quotes:",
        hasDoubleQuotes
    );

    console.log(
        "Contains single quotes:",
        hasSingleQuotes
    );

    console.log(
        "Timestamp present:",
        Boolean(timestamp)
    );

    console.log(
        "Timestamp length:",
        timestamp
            ? timestamp.length
            : 0
    );

    console.log(
        "H1 present:",
        Boolean(receivedSignature)
    );

    console.log(
        "H1 length:",
        receivedSignature
            ? receivedSignature.length
            : 0
    );

    console.log(
        "Raw body length:",
        rawBody.length
    );

    console.log(
        "Event type:",
        event?.event_type || null
    );

    console.log(
        "=============================================="
    );


    // --------------------------------------------------------
    // SAFE RESPONSE
    // --------------------------------------------------------

    return new Response(

        JSON.stringify(
            {
                diagnostic: true,

                secret_configured:
                    Boolean(secretKey),

                secret_length:
                    secretLength,

                starts_with_pdl_ntfset:
                    startsCorrectly,

                secret_format_correct:
                    secretFormatCorrect,

                has_leading_whitespace:
                    hasLeadingWhitespace,

                has_trailing_whitespace:
                    hasTrailingWhitespace,

                has_whitespace_anywhere:
                    hasWhitespaceAnywhere,

                contains_double_quotes:
                    hasDoubleQuotes,

                contains_single_quotes:
                    hasSingleQuotes,

                timestamp_present:
                    Boolean(timestamp),

                timestamp_length:
                    timestamp
                        ? timestamp.length
                        : 0,

                h1_present:
                    Boolean(receivedSignature),

                h1_length:
                    receivedSignature
                        ? receivedSignature.length
                        : 0,

                raw_body_length:
                    rawBody.length,

                event_type:
                    event?.event_type || null
            },
            null,
            2
        ),

        {
            status: 200,

            headers: {
                "Content-Type":
                    "application/json"
            }
        }
    );
}
