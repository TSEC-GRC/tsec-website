/*
==========================================================
 TSEC Product Engine v2.0
 Universal Professional Pack Product Engine

 Purpose:
 - Load product from products.json
 - Read product ID from URL
 - Populate universal product.html
 - Support product-specific content
 - Preserve lead capture
 - Preserve checkout action
==========================================================
*/

console.log("🚀 TSEC Product Engine v2.0 Loaded");


// =========================================================
// CONFIGURATION
// =========================================================

const LEAD_CAPTURE_URL =
    "https://script.google.com/macros/s/AKfycbwlMxvzxMbGQ9zc0mwuItWrwODcKpfAMHOh1vPsyNcdBkKWSnLZarZIkTqocU6Rs09u/exec";


// =========================================================
// RUNTIME PRODUCT STATE
// =========================================================

let CURRENT_PRODUCT = null;


// =========================================================
// HELPER — SAFE ELEMENT UPDATE
// =========================================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {

        return;

    }

    element.textContent =
        value ?? "";

}


// =========================================================
// HELPER — SAFE HTML UPDATE
// =========================================================

function setHTML(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {

        return;

    }

    element.innerHTML =
        value ?? "";

}


// =========================================================
// LOAD PRODUCT
// =========================================================

async function loadProduct() {

    try {

        console.log(
            "⏳ Loading TSEC product..."
        );


        // =================================================
        // LOAD PRODUCTS DATABASE
        // =================================================

        const response =
            await fetch(
                "data/products.json",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Unable to load products.json: HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        // =================================================
        // SUPPORT ARRAY OR OBJECT STRUCTURE
        // =================================================

        const products =
            Array.isArray(data)
                ? data
                : data.products;


        if (!Array.isArray(products)) {

            throw new Error(
                "products.json does not contain a valid product array."
            );

        }


        console.log(
            `📦 Products loaded: ${products.length}`
        );


        // =================================================
        // GET PRODUCT ID FROM URL
        // =================================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        const productId =
            params.get("id");


        if (!productId) {

            throw new Error(
                "No product ID specified in URL."
            );

        }


        console.log(
            "🔎 Requested Product ID:",
            productId
        );


        // =================================================
        // FIND PRODUCT
        // =================================================

        const product =
            products.find(
                p =>
                    String(p.id).trim() ===
                    String(productId).trim()
            );


        if (!product) {

            throw new Error(
                `Product not found: ${productId}`
            );

        }


        // =================================================
        // STORE CURRENT PRODUCT
        // =================================================

        CURRENT_PRODUCT =
            product;


        console.log(
            "✅ Product loaded:",
            product
        );


        // =================================================
        // BASIC PRODUCT INFORMATION
        // =================================================

        setText(
            "product-title",
            product.title
        );


        setText(
            "product-breadcrumb-title",
            product.title
        );


        setText(
            "product-tier",
            formatTier(product.tier)
        );


        setText(
            "product-type",
            formatProductType(product.type)
        );


        setText(
            "product-description",
            product.description ||
            product.desc ||
            ""
        );


        setText(
            "product-price",
            formatPrice(
                product.price,
                product.currency
            )
        );


        setText(
            "product-payment",
            product.payment ||
            "One-Time Purchase"
        );


        // =================================================
        // PRODUCT POSITIONING
        // =================================================

        const positioning =
            product.positioning?.label ||
            product.positioning ||
            "Build • Govern • Assure";


        setText(
            "product-positioning",
            positioning
        );


        // =================================================
        // PRODUCT IMAGE
        // =================================================

        const productImage =
            document.getElementById(
                "product-image"
            );


        if (
            productImage &&
            product.image
        ) {

            productImage.src =
                product.image;

            productImage.alt =
                product.title ||
                "TSEC Professional Pack™";

        }


        // =================================================
        // PRODUCT FEATURES
        // =================================================

        renderFeatures(
            product.features
        );


        // =================================================
        // PRODUCT STATISTICS
        // =================================================

        renderStatistics(
            product.stats
        );


        // =================================================
        // PRODUCT METADATA
        // =================================================

        renderMetadata(
            product
        );


        // =================================================
        // INCLUDED CONTENT
        // =================================================

        renderIncluded(
            product
        );


        // =================================================
        // FRAMEWORK COVERAGE
        // =================================================

        renderFrameworks(
            product
        );


        // =================================================
        // HERO VALUE PROPOSITIONS
        // =================================================

        renderHeroFeatures(
            product
        );


        // =================================================
        // FINAL PRODUCT LOG
        // =================================================

        console.log(
            `✅ TSEC Product Page ready: ${product.title}`
        );


    } catch (error) {

        console.error(
            "❌ Product loading error:",
            error
        );


        setText(
            "product-title",
            "Product Unavailable"
        );


        setText(
            "product-description",
            "We were unable to load this product. Please return to the TSEC Resources page."
        );

    }

}


// =========================================================
// FORMAT PRICE
// =========================================================

function formatPrice(
    price,
    currency = "USD"
) {

    if (
        price === undefined ||
        price === null ||
        price === ""
    ) {

        return "";

    }


    try {

        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: currency
            }
        ).format(price);

    } catch (error) {

        return `$${price}`;

    }

}


// =========================================================
// FORMAT TIER
// =========================================================

function formatTier(
    tier
) {

    if (!tier) {

        return "Professional Pack™";

    }


    const normalized =
        String(tier).toLowerCase();


    if (
        normalized === "pro"
    ) {

        return "Professional Pack™";

    }


    return tier;

}


// =========================================================
// FORMAT PRODUCT TYPE
// =========================================================

function formatProductType(
    type
) {

    if (!type) {

        return "PROFESSIONAL COMPLIANCE PACK™";

    }


    if (
        String(type).toLowerCase()
            .includes("professional")
    ) {

        return "PROFESSIONAL COMPLIANCE PACK™";

    }


    return type;

}


// =========================================================
// RENDER FEATURES
// =========================================================

function renderFeatures(
    features
) {

    const list =
        document.getElementById(
            "product-features"
        );


    if (!list) {

        return;

    }


    list.innerHTML = "";


    if (
        !Array.isArray(features) ||
        features.length === 0
    ) {

        return;

    }


    features.forEach(
        feature => {

            const li =
                document.createElement(
                    "li"
                );


            const icon =
                document.createElement(
                    "span"
                );


            icon.className =
                "check-green";


            icon.textContent =
                "✓";


            li.appendChild(
                icon
            );


            const text =
                document.createTextNode(
                    ` ${feature}`
                );


            li.appendChild(
                text
            );


            list.appendChild(
                li
            );

        }
    );

}


// =========================================================
// RENDER STATISTICS
// =========================================================

function renderStatistics(
    stats
) {

    if (!stats) {

        console.log(
            "ℹ No product statistics defined."
        );

        return;

    }


    setText(
        "stat-editable-files",
        stats.editableFiles ?? "—"
    );


    setText(
        "stat-word-templates",
        stats.wordTemplates ?? "—"
    );


    setText(
        "stat-excel-workbooks",
        stats.excelWorkbooks ?? "—"
    );


    setText(
        "stat-powerpoint",
        stats.powerPointDecks ??
        stats.powerpointDecks ??
        "—"
    );


    setText(
        "stat-guides",
        stats.guides ?? "—"
    );


    setText(
        "stat-delivery",
        stats.deliveryShort ||
        "Instant"
    );

}


// =========================================================
// RENDER METADATA
// =========================================================

function renderMetadata(
    product
) {

    const metadata =
        product.metadata ||
        {};


    // -----------------------------------------------------
    // Frameworks
    // -----------------------------------------------------

    if (
        Array.isArray(product.topics)
    ) {

        setHTML(
            "product-frameworks",
            product.topics
                .map(
                    topic =>
                        escapeHTML(topic)
                )
                .join("<br>")
        );

    }


    // -----------------------------------------------------
    // Format
    // -----------------------------------------------------

    setText(
        "product-format",
        metadata.format ||
        "Microsoft Word, Excel & PowerPoint"
    );


    // -----------------------------------------------------
    // Delivery
    // -----------------------------------------------------

    setText(
        "product-delivery",
        metadata.delivery ||
        "Instant Digital Download"
    );


    // -----------------------------------------------------
    // License
    // -----------------------------------------------------

    setText(
        "product-license",
        metadata.license ||
        "Single Organization Use"
    );


    // -----------------------------------------------------
    // Updates
    // -----------------------------------------------------

    setText(
        "product-updates",
        metadata.updates ||
        "Minor updates for 12 months"
    );

}


// =========================================================
// RENDER INCLUDED CONTENT
// =========================================================

function renderIncluded(
    product
) {

    const grid =
        document.getElementById(
            "product-included-grid"
        );


    if (!grid) {

        return;

    }


    const included =
        product.included;


    // -----------------------------------------------------
    // If no structured included content exists yet,
    // preserve the universal placeholders.
    // -----------------------------------------------------

    if (
        !Array.isArray(included) ||
        included.length === 0
    ) {

        console.log(
            "ℹ No structured included content defined."
        );

        return;

    }


    grid.innerHTML = "";


    included.forEach(
        item => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "included-card";


            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                item.title ||
                "";


            const description =
                document.createElement(
                    "p"
                );


            description.textContent =
                item.description ||
                "";


            card.appendChild(
                title
            );


            card.appendChild(
                description
            );


            grid.appendChild(
                card
            );

        }
    );


    if (
        product.includedDescription
    ) {

        setText(
            "product-included-description",
            product.includedDescription
        );

    }

}


// =========================================================
// RENDER FRAMEWORKS
// =========================================================

function renderFrameworks(
    product
) {

    const grid =
        document.getElementById(
            "framework-grid"
        );


    if (!grid) {

        return;

    }


    const frameworks =
        product.frameworks;


    // -----------------------------------------------------
    // No structured frameworks yet
    // -----------------------------------------------------

    if (
        !Array.isArray(frameworks) ||
        frameworks.length === 0
    ) {

        console.log(
            "ℹ No structured framework cards defined."
        );

        return;

    }


    grid.innerHTML = "";


    frameworks.forEach(
        framework => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "framework-card";


            // ---------------------------------------------
            // ICON
            // ---------------------------------------------

            const iconWrapper =
                document.createElement(
                    "div"
                );


            iconWrapper.className =
                "framework-icon";


            if (
                framework.icon
            ) {

                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    framework.icon;


                image.alt =
                    framework.name ||
                    "Framework";


                iconWrapper.appendChild(
                    image
                );

            } else {

                iconWrapper.textContent =
                    "✓";

            }


            // ---------------------------------------------
            // NAME
            // ---------------------------------------------

            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                framework.name ||
                "";


            // ---------------------------------------------
            // DESCRIPTION
            // ---------------------------------------------

            const description =
                document.createElement(
                    "p"
                );


            description.textContent =
                framework.description ||
                "";


            // ---------------------------------------------
            // ASSEMBLE
            // ---------------------------------------------

            card.appendChild(
                iconWrapper
            );


            card.appendChild(
                title
            );


            card.appendChild(
                description
            );


            grid.appendChild(
                card
            );

        }
    );


    if (
        product.frameworkDescription
    ) {

        setText(
            "framework-description",
            product.frameworkDescription
        );

    }

}


// =========================================================
// RENDER HERO FEATURES
// =========================================================

function renderHeroFeatures(
    product
) {

    const container =
        document.getElementById(
            "product-hero-features"
        );


    if (!container) {

        return;

    }


    // -----------------------------------------------------
    // Product-specific hero features
    // -----------------------------------------------------

    const heroFeatures =
        product.heroFeatures;


    if (
        !Array.isArray(heroFeatures) ||
        heroFeatures.length === 0
    ) {

        return;

    }


    container.innerHTML = "";


    heroFeatures.forEach(
        item => {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "hero-feature";


            const icon =
                document.createElement(
                    "span"
                );


            icon.className =
                "feature-icon";


            icon.textContent =
                item.icon ||
                "✓";


            const text =
                document.createElement(
                    "span"
                );


            text.textContent =
                item.text ||
                "";


            wrapper.appendChild(
                icon
            );


            wrapper.appendChild(
                text
            );


            container.appendChild(
                wrapper
            );

        }
    );

}


// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHTML(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =========================================================
// TSEC CHECKOUT / LEAD ACTION
// =========================================================

function initProductAction() {

    const button =
        document.getElementById(
            "product-action"
        );


    if (!button) {

        console.warn(
            "⚠ Checkout button not found"
        );

        return;

    }


    button.addEventListener(
        "click",
        function () {

            console.log(
                "✅ Product action clicked"
            );


            // ------------------------------------------------
            // Make sure product is loaded
            // ------------------------------------------------

            if (!CURRENT_PRODUCT) {

                console.warn(
                    "⚠ Product not loaded yet"
                );

                return;

            }


            console.log(
                "🛒 Selected product:",
                CURRENT_PRODUCT
            );


            // ------------------------------------------------
            // Open Lead Modal
            // ------------------------------------------------

            const modal =
                document.getElementById(
                    "lead-modal"
                );


            if (modal) {

                modal.style.display =
                    "flex";


                console.log(
                    "✅ Lead modal opened"
                );

            } else {

                console.warn(
                    "⚠ Lead modal not found"
                );

            }

        }
    );

}


// =========================================================
// TSEC LEAD MODAL
// =========================================================

function initLeadModal() {

    const modal =
        document.getElementById(
            "lead-modal"
        );


    const closeButton =
        document.getElementById(
            "close-modal"
        );


    const form =
        document.getElementById(
            "lead-form"
        );


    if (!modal) {

        console.warn(
            "⚠ Lead modal not found"
        );

        return;

    }


    // =====================================================
    // CLOSE BUTTON
    // =====================================================

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                modal.style.display =
                    "none";

            }
        );

    }


    // =====================================================
    // CLICK OUTSIDE MODAL
    // =====================================================

    window.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                modal.style.display =
                    "none";

            }

        }
    );


    // =====================================================
    // FORM SUBMIT
    // =====================================================

    if (form) {

        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                // --------------------------------------------
                // Make sure product exists
                // --------------------------------------------

                if (!CURRENT_PRODUCT) {

                    alert(
                        "Product information is not available. Please refresh the page and try again."
                    );

                    return;

                }


                // --------------------------------------------
                // Read email
                // --------------------------------------------

                const emailElement =
                    document.getElementById(
                        "email"
                    );


                const email =
                    emailElement
                        ? emailElement.value.trim()
                        : "";


                // --------------------------------------------
                // Corporate Email Validation
                // --------------------------------------------

                if (
                    !isCorporateEmail(
                        email
                    )
                ) {

                    alert(
                        "Please use your corporate email address. Personal email providers are not accepted."
                    );

                    return;

                }


                console.log(
                    "✅ Corporate email accepted:",
                    email
                );


                // =================================================
                // BUILD LEAD DATA
                // =================================================

                const leadData = {

                    firstName:
                        document.getElementById(
                            "first-name"
                        )?.value || "",


                    lastName:
                        document.getElementById(
                            "last-name"
                        )?.value || "",


                    company:
                        document.getElementById(
                            "company"
                        )?.value || "",


                    role:
                        document.getElementById(
                            "role"
                        )?.value || "",


                    email:
                        email,


                    // -----------------------------------------
                    // DYNAMIC PRODUCT DATA
                    // -----------------------------------------

                    productId:
                        CURRENT_PRODUCT.id,


                    productName:
                        CURRENT_PRODUCT.title,


                    tier:
                        CURRENT_PRODUCT.tier,


                    price:
                        CURRENT_PRODUCT.price || "",


                    payment:
                        CURRENT_PRODUCT.payment || "",


                    source:
                        "product.html",


                    date:
                        new Date().toISOString()

                };


                console.log(
                    "📦 Lead data:",
                    leadData
                );


                // =================================================
                // SAVE LEAD
                // =================================================

                const saved =
                    await saveLead(
                        leadData
                    );


                if (saved) {

                    console.log(
                        "✅ Lead saved successfully"
                    );


                    alert(
                        "Thank you! Your access request has been received."
                    );


                    modal.style.display =
                        "none";


                    form.reset();


                } else {

                    alert(
                        "Unable to save your information. Please try again."
                    );

                }

            }
        );

    }

}


// =========================================================
// CORPORATE EMAIL VALIDATION
// =========================================================

function isCorporateEmail(
    email
) {

    if (!email) {

        return false;

    }


    const blockedDomains = [

        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "live.com",
        "icloud.com",
        "aol.com",
        "msn.com",
        "proton.me",
        "protonmail.com",
        "mail.com",
        "gmx.com"

    ];


    const parts =
        email.split("@");


    if (
        parts.length !== 2
    ) {

        return false;

    }


    const domain =
        parts[1]
            .toLowerCase()
            .trim();


    return !blockedDomains.includes(
        domain
    );

}


// =========================================================
// SAVE LEAD
// =========================================================

async function saveLead(
    leadData
) {

    console.log(
        "📤 Sending lead to TSEC:",
        leadData
    );


    // =====================================================
    // LOCAL BACKUP
    // =====================================================

    try {

        const existingLeads =
            JSON.parse(
                localStorage.getItem(
                    "tsecLeads"
                )
            ) || [];


        existingLeads.push(
            leadData
        );


        localStorage.setItem(
            "tsecLeads",
            JSON.stringify(
                existingLeads
            )
        );


        console.log(
            "✅ Lead stored locally"
        );

    } catch (error) {

        console.warn(
            "⚠ Local lead storage failed:",
            error
        );

    }


    // =====================================================
    // GOOGLE APPS SCRIPT
    // =====================================================

    try {

        if (!LEAD_CAPTURE_URL) {

            console.warn(
                "⚠ LEAD_CAPTURE_URL not configured"
            );

            return true;

        }


        await fetch(
            LEAD_CAPTURE_URL,
            {

                method: "POST",

                mode: "no-cors",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(
                        leadData
                    )

            }
        );


        console.log(
            "✅ Lead submitted to Google Apps Script"
        );


        return true;


    } catch (error) {

        console.error(
            "❌ Google Apps Script lead submission failed:",
            error
        );


        // Local copy still exists,
        // so don't block the user.

        return true;

    }

}


// =========================================================
// START TSEC PRODUCT ENGINE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadProduct();

        initProductAction();

        initLeadModal();

    }
);

