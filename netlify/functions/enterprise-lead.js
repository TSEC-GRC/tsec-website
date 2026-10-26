
import { getDatabase } from "@netlify/database";

const db = getDatabase();

const allowedServices = new Set([
    "Cybersecurity Governance Assessment",
    "Cybersecurity Risk Assessment",
    "ISO/IEC 27001 Implementation",
    "Fractional vCISO Advisory",
    "Other / Additional Requirements"
]);

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}

export default async (request) => {
    try {
        if (request.method !== "POST") {
            return jsonResponse(
                { error: "Method not allowed" },
                405
            );
        }

        const contentType =
            request.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            return jsonResponse(
                { error: "Content-Type must be application/json" },
                415
            );
        }

        const data = await request.json();

        const company = String(data.company || "").trim();
        const industry = String(data.industry || "").trim();
        const firstName = String(data.firstName || "").trim();
        const lastName = String(data.lastName || "").trim();
        const email = String(data.email || "").trim();
        const role = String(data.role || "").trim();
        const requirements = String(data.requirements || "").trim();

        if (
            !company ||
            !industry ||
            !firstName ||
            !lastName ||
            !email
        ) {
            return jsonResponse(
                { error: "Please complete all required fields." },
                400
            );
        }

        if (
            company.length > 200 ||
            industry.length > 100 ||
            firstName.length > 100 ||
            lastName.length > 100 ||
            email.length > 254 ||
            role.length > 150 ||
            requirements.length > 10000
        ) {
            return jsonResponse(
                { error: "One or more fields exceed the allowed length." },
                400
            );
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            return jsonResponse(
                { error: "Please provide a valid email address." },
                400
            );
        }

        if (!Array.isArray(data.services)) {
            return jsonResponse(
                { error: "Please select at least one service." },
                400
            );
        }

        const services = [
            ...new Set(
                data.services.filter(
                    service =>
                        typeof service === "string" &&
                        allowedServices.has(service)
                )
            )
        ];

        if (services.length === 0) {
            return jsonResponse(
                { error: "Please select at least one valid service." },
                400
            );
        }

        await db.sql`
            INSERT INTO enterprise_leads (
                company,
                industry,
                first_name,
                last_name,
                email,
                role,
                services,
                requirements
            )
            VALUES (
                ${company},
                ${industry},
                ${firstName},
                ${lastName},
                ${email},
                ${role || null},
                ${services},
                ${requirements || null}
            )
        `;

        return jsonResponse({
            success: true,
            message: "Your Enterprise inquiry has been received."
        }, 201);

    } catch (error) {
        console.error("ENTERPRISE LEAD ERROR:", error);

        return jsonResponse(
            { error: "Unable to submit your inquiry right now. Please try again later." },
            500
        );
    }
};

