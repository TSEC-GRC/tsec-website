
import { getDatabase } from "@netlify/database";
import nodemailer from "nodemailer";

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

function getMailTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass || ![465, 587].includes(port)) {
        throw new Error("SMTP configuration is incomplete or invalid.");
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
}

export default async (request) => {
    try {
        if (request.method !== "POST") {
            return jsonResponse({ error: "Method not allowed" }, 405);
        }

        const contentType = request.headers.get("content-type") || "";

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

        if (!company || !industry || !firstName || !lastName || !email) {
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

        // Save the inquiry first so it is retained even if email fails.
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

        // Send the notification using Zoho SMTP.
        try {
            const transporter = getMailTransport();
            const from = process.env.SMTP_FROM || process.env.SMTP_USER;

            await transporter.sendMail({
                from: {
                    name: "TSEC Risk & Cyber Advisory",
                    address: from
                },
                to: "info@tsecgrc.com",
                replyTo: email,
                subject: `New Enterprise Inquiry — ${company}`,
                text: [
                    "A new Enterprise inquiry has been submitted through tsecgrc.com.",
                    "",
                    `Company: ${company}`,
                    `Industry: ${industry}`,
                    `Contact: ${firstName} ${lastName}`,
                    `Email: ${email}`,
                    `Role: ${role || "Not provided"}`,
                    "",
                    "Services requested:",
                    ...services.map(service => `- ${service}`),
                    "",
                    "Additional requirements:",
                    requirements || "None provided"
                ].join("\n")
            });

            console.info("Enterprise inquiry notification sent.");
        } catch (mailError) {
            // Do not expose SMTP details to the website visitor.
            console.error(
                "ENTERPRISE EMAIL ERROR:",
                mailError?.message || "Unknown mail delivery error"
            );

            // The inquiry is already saved in the database.
            return jsonResponse({
                success: true,
                emailSent: false,
                message:
                    "Your inquiry has been received. Email notification is pending."
            }, 201);
        }

        return jsonResponse({
            success: true,
            emailSent: true,
            message: "Your Enterprise inquiry has been received."
        }, 201);

    } catch (error) {
        console.error("ENTERPRISE LEAD ERROR:", error);

        return jsonResponse(
            {
                error:
                    "Unable to submit your inquiry right now. Please try again later."
            },
            500
        );
    }
};
