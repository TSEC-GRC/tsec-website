// ============================================================
// TSEC — Paddle Webhook
// TEMPORARY STRUCTURE DIAGNOSTIC
// P1.9 — Inspect Paddle-Signature Header Structure
// ============================================================

export default async function handler(request) {

    // --------------------------------------------------------
    // Only POST is allowed
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
    // Read raw body exactly as received
    // --------------------------------------------------------

    const rawBody = await request.text();


    // --------------------------------------------------------
    // Read Paddle-Signature header
    // --------------------------------------------------------

    const paddleSignature =
        request.headers.get("paddle-signature");


    // --------------------------------------------------------
    // Basic diagnostics
    // --------------------------------------------------------

    const headerPresent =
        Boolean(paddleSignature);


    const headerLength =
        paddleSignature
            ? paddleSignature.length
            : 0;


    // --------------------------------------------------------
    // Parse header components
    //
    // Example:
    // ts=1234567890;h1=abcdef...
    // --------------------------------------------------------

    const components =
        paddleSignature
            ? paddleSignature.split(";")
            : [];


    const componentNames = [];

    const h1Lengths = [];

    let timestampLength = 0;

    let h1Count = 0;

    let unknownComponentCount = 0;

    let emptyComponentCount = 0;


    // --------------------------------------------------------
    // Inspect each component WITHOUT exposing values
    // --------------------------------------------------------

    for (const component of components) {

        const trimmedComponent =
            component.trim();


        if (!trimmedComponent) {

            emptyComponentCount++;

            continue;
        }


        const separatorIndex =
            trimmedComponent.indexOf("=");


        if (separatorIndex === -1) {

            componentNames.push(
                "INVALID_COMPONENT"
            );

            unknownComponentCount++;

            continue;
        }


        const key =
            trimmedComponent.substring(
                0,
                separatorIndex
            );


        const value =
            trimmedComponent.substring(
                separatorIndex + 1
            );


        componentNames.push(key);


        // ----------------------------------------------------
        // Timestamp
        // ----------------------------------------------------

        if (key === "ts") {

            timestampLength =
                value.length;

            continue;
        }


        // ----------------------------------------------------
        // H1 signature
        // ----------------------------------------------------

        if (key === "h1") {

            h1Count++;

            h1Lengths.push(
                value.length
            );

            continue;
        }


        // ----------------------------------------------------
        // Anything unexpected
        // ----------------------------------------------------

        unknownComponentCount++;
    }


    // --------------------------------------------------------
    // Parse payload JSON
    // --------------------------------------------------------

    let event = null;

    try {

        event =
            JSON.parse(rawBody);

    } catch (error) {

        console.error(
            "❌ Payload is not valid JSON"
        );
    }


    const eventType =
        event?.event_type || null;


    const eventId =
        event?.event_id || null;


    const transactionId =
        event?.data?.id || null;


    // --------------------------------------------------------
    // SERVER LOGS
    // --------------------------------------------------------

    console.log(
        "=============================================="
    );

    console.log(
        "TSEC PADDLE SIGNATURE STRUCTURE DIAGNOSTIC"
    );

    console.log(
        "=============================================="
    );

    console.log(
        "HTTP Method:",
        request.method
    );

    console.log(
        "Raw body length:",
        rawBody.length
    );

    console.log(
        "Paddle-Signature present:",
        headerPresent
    );

    console.log(
        "Paddle-Signature length:",
        headerLength
    );

    console.log(
        "Component count:",
        components.length
    );

    console.log(
        "Component names:",
        componentNames
    );

    console.log(
        "Timestamp length:",
        timestampLength
    );

    console.log(
        "H1 count:",
        h1Count
    );

    console.log(
        "H1 lengths:",
        h1Lengths
    );

    console.log(
        "Unknown component count:",
        unknownComponentCount
    );

    console.log(
        "Empty component count:",
        emptyComponentCount
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
        "=============================================="
    );


    // --------------------------------------------------------
    // Safe diagnostic response
    // --------------------------------------------------------

    return new Response(

        JSON.stringify(

            {
                diagnostic: true,

                method:
                    request.method,

                raw_body_length:
                    rawBody.length,

                paddle_signature_present:
                    headerPresent,

                paddle_signature_length:
                    headerLength,

                component_count:
                    components.length,

                component_names:
                    componentNames,

                timestamp_length:
                    timestampLength,

                h1_count:
                    h1Count,

                h1_lengths:
                    h1Lengths,

                unknown_component_count:
                    unknownComponentCount,

                empty_component_count:
                    emptyComponentCount,

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
                "Content-Type":
                    "application/json"
            }
        }

    );
}
