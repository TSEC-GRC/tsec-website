/*
==========================================================
 TSEC Product Engine v2.2
 Universal Professional Pack Product Engine

 Purpose:
 - Load product from products.json
 - Read product ID from URL
 - Populate universal product.html
 - Support product-specific content
 - Display product image dynamically
 - Display product statistics dynamically
 - Display product metadata dynamically
 - Display What's Included dynamically
 - Display Framework / Regulation Coverage dynamically
 - Preserve lead capture
 - Preserve checkout action
 - Format product pricing correctly
 - Display human-readable product tier
==========================================================
*/

console.log("🚀 TSEC Product Engine v2.2 Loaded");


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
// HELPER — FORMAT PRICE
// =========================================================

function formatPrice(
    price,
    currency = "USD"
) {

    const numericPrice =
        Number(price);

    if (!Number.isFinite(numericPrice)) {
        return "—";
    }

    try {

        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: currency
            }
        ).format(numericPrice);

    } catch (error) {

        console.warn(
            "⚠ Unable to format currency:",
            error
        );

        return `$${numericPrice}`;
    }
}


// =========================================================
// HELPER — PRODUCT TIER LABEL
// =========================================================

function getTierLabel(tier) {

    const tierLabels = {

        free:
            "Free Resource",

        pro:
            "Professional Pack™",

        enterprise:
            "Enterprise"

    };

    return (
        tierLabels[String(tier).toLowerCase()]
        ||
        tier
        ||
        ""
    );
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
        // SUPPORT BOTH:
        //
        // [...]
        //
        // OR
        //
        // { products: [...] }
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
                    String(p.id) ===
                    String(productId)
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
            "product-tier",
            getTierLabel(product.tier)
        );


        setText(
            "product-title",
            product.title || ""
        );


        setText(
            "product-positioning",
            product.positioning || ""
        );


        setText(
            "product-description",
            product.description || ""
        );


        setText(
            "product-type",
            product.type || ""
        );


        setText(
            "product-payment",
            product.payment || "One-time payment"
        );


        // =================================================
        // BREADCRUMB
        // =================================================

        setText(
            "product-breadcrumb-title",
            product.title || ""
        );


        // =================================================
        // PRICE
        // =================================================

        setText(
            "product-price",
            formatPrice(
                product.price,
                product.currency || "USD"
            )
        );


        // =================================================
        // PRODUCT IMAGE
        // =================================================

        const image =
            document.getElementById(
                "product-image"
            );


        if (image) {

            if (product.image) {

                image.src =
                    product.image;

                image.alt =
                    product.title ||
                    "TSEC Professional Pack™";

                image.loading =
                    "eager";

                image.decoding =
                    "async";

            } else {

                image.removeAttribute(
                    "src"
                );

                image.alt =
                    product.title ||
                    "TSEC Professional Pack™";

            }

        }


        // =================================================
        // PRODUCT FEATURES
        // =================================================

        renderFeatures(
            product.features
        );


        // =================================================
        // PRODUCT STATS
        // =================================================

        renderStats(
            product.stats
        );


        // =================================================
        // FRAMEWORK COVERAGE
        // =================================================

        renderFrameworks(
            product.frameworks
        );


        // =================================================
        // WHAT'S INCLUDED
        // =================================================

        renderIncluded(
            product.included
        );


        // =================================================
        // PRODUCT METADATA
        // =================================================

        renderMetadata(
            product
        );


        console.log(
            "✅ Product rendering completed."
        );


    } catch (error) {

        console.error(
            "❌ Product loading error:",
            error
        );


        // =================================================
        // DISPLAY PRODUCT ERROR
        // =================================================

        setText(
            "product-title",
            "Product Unavailable"
        );


        setText(
            "product-description",
            "We were unable to load this product. Please return to the TSEC Resources page."
        );


        setText(
            "product-price",
            "—"
        );

    }

}


// =========================================================
// RENDER FEATURES
// =========================================================

function renderFeatures(features) {

    const container =
        document.getElementById(
            "product-features"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !Array.isArray(features)
        ||
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


            const text =
                document.createElement(
                    "span"
                );

            text.textContent =
                typeof feature === "string"
                    ? feature
                    : feature.name || "";


            li.appendChild(
                icon
            );

            li.appendChild(
                text
            );


            container.appendChild(
                li
            );

        }
    );

}


// =========================================================
// RENDER PRODUCT STATS
// =========================================================

function renderStats(stats) {

    if (!stats) return;

    // -----------------------------------------------------
    // TOP PRODUCT STATS
    // -----------------------------------------------------

    const statMap = {
        editableFiles: "stat-editable-files",
        wordTemplates: "stat-word-templates",
        excelWorkbooks: "stat-excel-workbooks",
        powerpoint: "stat-powerpoint",
        guides: "stat-guides",
        delivery: "stat-delivery"
    };

    Object.entries(statMap).forEach(([key, id]) => {

        if (Object.prototype.hasOwnProperty.call(stats, key)) {

            setText(
                id,
                stats[key]
            );

        }

    });


    // -----------------------------------------------------
    // PACK CONTENT SUMMARY
    // -----------------------------------------------------

    setText(
        "summary-word",
        stats.wordTemplates ?? 0
    );

    setText(
        "summary-excel",
        stats.excelWorkbooks ?? 0
    );

    setText(
        "summary-powerpoint",
        stats.powerpoint ?? 0
    );

    setText(
        "summary-guides",
        stats.guides ?? 0
    );


    // -----------------------------------------------------
    // QUICK START GUIDE
    // -----------------------------------------------------
    // Only display a value if the product actually defines
    // quickStart in its stats object.
    // Otherwise keep the field neutral.

    if (
        Object.prototype.hasOwnProperty.call(
            stats,
            "quickStart"
        )
    ) {

        setText(
            "summary-quickstart",
            stats.quickStart
        );

    } else {

        setText(
            "summary-quickstart",
            "—"
        );

    }


    // -----------------------------------------------------
    // TOTAL EDITABLE FILES
    // -----------------------------------------------------

    setText(
        "summary-total",
        `${stats.editableFiles ?? 0} Files`
    );

}

// =========================================================
// RENDER FRAMEWORKS
// =========================================================

function renderFrameworks(frameworks) {

    const container =
        document.getElementById(
            "framework-grid"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !Array.isArray(frameworks)
        ||
        frameworks.length === 0
    ) {
        return;
    }


    frameworks.forEach(
        framework => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "framework-card";


            const icon =
                document.createElement(
                    "div"
                );

            icon.className =
                "framework-icon";


            if (
                framework.icon
            ) {

                const img =
                    document.createElement(
                        "img"
                    );

                img.src =
                    framework.icon;

                img.alt =
                    framework.name ||
                    "Framework";

                icon.appendChild(
                    img
                );

            }


            const name =
                document.createElement(
                    "h3"
                );

            name.textContent =
                framework.name ||
                "";


            const description =
                document.createElement(
                    "p"
                );

            description.textContent =
                framework.description ||
                "";


            card.appendChild(
                icon
            );

            card.appendChild(
                name
            );

            card.appendChild(
                description
            );


            container.appendChild(
                card
            );

        }
    );

}


// =========================================================
// RENDER PACK INCLUDED CONTENT
// =========================================================

function renderIncluded(included) {

    const container = document.getElementById(
        "pack-documents-grid"
    );

    if (!container) return;


    // Clear existing content
    container.innerHTML = "";


    // No included content
    if (
        !Array.isArray(included) ||
        included.length === 0
    ) {

        container.innerHTML = `
            <div class="pack-document-empty">
                <p>
                    Product documentation details will be displayed here.
                </p>
            </div>
        `;

        return;
    }


    // Render each content category
    included.forEach(item => {

        const card = document.createElement("article");

        card.className = "pack-document-card";


        // Document label
        const type = document.createElement("div");

        type.className = "pack-document-type";

        type.textContent = "DOCUMENT";


        // Title
        const title = document.createElement("h3");

        title.className = "pack-document-title";

        title.textContent =
            item.title ||
            item.name ||
            "";


        // Description
        const description = document.createElement("p");

        description.className = "pack-document-description";

        description.textContent =
            item.description ||
            "";


        // Assemble card
        card.appendChild(type);

        card.appendChild(title);

        if (item.description) {

            card.appendChild(description);

        }


        container.appendChild(card);

    });

}

    // ---------------------------------------------------------
    // UPDATE PACK SUMMARY
    // ---------------------------------------------------------

    renderIncludedSummary(
        included
    );

}


// =========================================================
// RENDER INCLUDED SUMMARY
// =========================================================

function renderIncludedSummary(
    included
) {

    if (
        !Array.isArray(included)
    ) {
        return;
    }


    let word =
        0;

    let excel =
        0;

    let powerpoint =
        0;

    let guides =
        0;

    let quickstart =
        0;


    // ---------------------------------------------------------
    // COUNT INCLUDED FILES
    // ---------------------------------------------------------

    included.forEach(
        item => {

            const type =
                String(
                    item.type ||
                    item.format ||
                    item.category ||
                    ""
                ).toLowerCase();


            const title =
                String(
                    item.name ||
                    item.title ||
                    ""
                ).toLowerCase();


            // -----------------------------------------------
            // WORD
            // -----------------------------------------------

            if (
                type.includes("word")
                ||
                type.includes("docx")
                ||
                title.includes("policy")
                ||
                title.includes("procedure")
                ||
                title.includes("methodology")
                ||
                title.includes("plan")
            ) {

                word++;

            }


            // -----------------------------------------------
            // EXCEL
            // -----------------------------------------------

            if (
                type.includes("excel")
                ||
                type.includes("xlsx")
                ||
                title.includes("register")
                ||
                title.includes("assessment")
                ||
                title.includes("tracker")
                ||
                title.includes("dashboard")
            ) {

                excel++;

            }


            // -----------------------------------------------
            // POWERPOINT
            // -----------------------------------------------

            if (
                type.includes("powerpoint")
                ||
                type.includes("pptx")
                ||
                type.includes("presentation")
                ||
                title.includes("training")
                ||
                title.includes("presentation")
            ) {

                powerpoint++;

            }


            // -----------------------------------------------
            // GUIDES
            // -----------------------------------------------

            if (
                title.includes("guide")
                ||
                title.includes("implementation")
                ||
                title.includes("roadmap")
            ) {

                guides++;

            }


            // -----------------------------------------------
            // QUICK START
            // -----------------------------------------------

            if (
                title.includes("quick start")
                ||
                title.includes("quickstart")
            ) {

                quickstart++;

            }

        }
    );


    // ---------------------------------------------------------
    // UPDATE SUMMARY VALUES
    // ---------------------------------------------------------

    setText(
        "summary-word",
        word
    );


    setText(
        "summary-excel",
        excel
    );


    setText(
        "summary-powerpoint",
        powerpoint
    );


    setText(
        "summary-guides",
        guides
    );


    setText(
        "summary-quickstart",
        quickstart
    );


    // ---------------------------------------------------------
    // TOTAL
    // ---------------------------------------------------------

    setText(
        "summary-total",
        `${included.length} Files`
    );

}


// =========================================================
// RENDER PRODUCT METADATA
// =========================================================

function renderMetadata(product) {

    // -------------------------------------------------
    // BASIC PRODUCT INFORMATION
    // -------------------------------------------------

    setText(
        "product-id",
        product.id || ""
    );


    setText(
        "product-category",
        product.category || ""
    );


    setText(
        "product-currency",
        product.currency || "USD"
    );


    setText(
        "product-status",
        product.status || ""
    );


    // -------------------------------------------------
    // PRODUCT METADATA
    // -------------------------------------------------

    const metadata =
        product.metadata || {};


    // -------------------------------------------------
    // FRAMEWORK
    // -------------------------------------------------

    const frameworkElement =
        document.getElementById(
            "product-frameworks"
        );


    if (frameworkElement) {

        const frameworks =
            Array.isArray(product.frameworks)
                ? product.frameworks
                : [];


        const frameworkNames =
            frameworks
                .map(
                    framework => {

                        if (
                            typeof framework === "object" &&
                            framework !== null
                        ) {

                            return String(
                                framework.name || ""
                            );

                        }

                        return String(
                            framework || ""
                        );

                    }
                )
                .filter(Boolean);


        frameworkElement.innerHTML =
            frameworkNames.length > 0
                ? frameworkNames.join("<br>")
                : "—";

    }


    // -------------------------------------------------
    // FORMAT
    // -------------------------------------------------

    setText(
        "product-format",
        metadata.format ||
        product.format ||
        "Microsoft Word, Excel & PowerPoint"
    );


    // -------------------------------------------------
    // DELIVERY
    // -------------------------------------------------

    setText(
        "product-delivery",
        metadata.delivery ||
        product.delivery ||
        "Instant Digital Download"
    );


    // -------------------------------------------------
    // LICENSE
    // -------------------------------------------------

    setText(
        "product-license",
        metadata.license ||
        product.license ||
        "Single Organization Use"
    );


    // -------------------------------------------------
    // UPDATES
    // -------------------------------------------------

    setText(
        "product-updates",
        metadata.updates ||
        product.updates ||
        "Minor updates for 12 months"
    );

}


// =========================================================
// TSEC CHECKOUT ACTION
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
            // MAKE SURE PRODUCT IS LOADED
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
            // OPEN LEAD MODAL
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
                // MAKE SURE PRODUCT EXISTS
                // --------------------------------------------

                if (!CURRENT_PRODUCT) {

                    alert(
                        "Product information is not available. Please refresh the page and try again."
                    );

                    return;

                }


                // --------------------------------------------
                // READ FORM DATA
                // --------------------------------------------

                const firstNameElement =
                    document.getElementById(
                        "first-name"
                    );


                const lastNameElement =
                    document.getElementById(
                        "last-name"
                    );


                const companyElement =
                    document.getElementById(
                        "company"
                    );


                const roleElement =
                    document.getElementById(
                        "role"
                    );


                const emailElement =
                    document.getElementById(
                        "email"
                    );


                const firstName =
                    firstNameElement
                        ? firstNameElement.value.trim()
                        : "";


                const lastName =
                    lastNameElement
                        ? lastNameElement.value.trim()
                        : "";


                const company =
                    companyElement
                        ? companyElement.value.trim()
                        : "";


                const role =
                    roleElement
                        ? roleElement.value.trim()
                        : "";


                const email =
                    emailElement
                        ? emailElement.value.trim()
                        : "";


                // --------------------------------------------
                // CORPORATE EMAIL VALIDATION
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


                // --------------------------------------------
                // BUILD LEAD DATA
                // --------------------------------------------

                const leadData = {

                    firstName:
                        firstName,

                    lastName:
                        lastName,

                    company:
                        company,

                    role:
                        role,

                    email:
                        email,

                    productId:
                        CURRENT_PRODUCT.id,

                    product:
                        CURRENT_PRODUCT.title,

                    tier:
                        CURRENT_PRODUCT.tier,

                    price:
                        CURRENT_PRODUCT.price,

                    currency:
                        CURRENT_PRODUCT.currency ||
                        "USD",

                    formattedPrice:
                        formatPrice(
                            CURRENT_PRODUCT.price,
                            CURRENT_PRODUCT.currency ||
                            "USD"
                        ),

                    payment:
                        CURRENT_PRODUCT.payment ||
                        "One-time payment",

                    timestamp:
                        new Date().toISOString()

                };


                console.log(
                    "📦 Lead data:",
                    leadData
                );


                // --------------------------------------------
                // SUBMIT LEAD
                // --------------------------------------------

                try {

                    await fetch(
                        LEAD_CAPTURE_URL,
                        {
                            method:
                                "POST",

                            mode:
                                "no-cors",

                            headers:
                                {
                                    "Content-Type":
                                        "text/plain;charset=utf-8"
                                },

                            body:
                                JSON.stringify(
                                    leadData
                                )
                        }
                    );


                    console.log(
                        "✅ Lead submitted"
                    );


                } catch (error) {

                    console.warn(
                        "⚠ Lead submission warning:",
                        error
                    );

                }


                // --------------------------------------------
                // CLOSE MODAL
                // --------------------------------------------

                modal.style.display =
                    "none";


                // --------------------------------------------
                // REDIRECT TO CHECKOUT
                // --------------------------------------------

                const checkoutUrl =
                    `checkout.html?id=${encodeURIComponent(
                        CURRENT_PRODUCT.id
                    )}`;


                console.log(
                    "➡ Redirecting to:",
                    checkoutUrl
                );


                window.location.href =
                    checkoutUrl;

            }
        );

    }

}


// =========================================================
// CORPORATE EMAIL VALIDATION
// =========================================================

function isCorporateEmail(email) {

    if (!email) {
        return false;
    }


    const personalProviders = [

        "gmail.com",
        "googlemail.com",
        "yahoo.com",
        "yahoo.co.uk",
        "hotmail.com",
        "hotmail.co.uk",
        "outlook.com",
        "live.com",
        "msn.com",
        "icloud.com",
        "me.com",
        "aol.com",
        "protonmail.com",
        "proton.me",
        "mail.com",
        "gmx.com",
        "gmx.net",
        "yandex.com",
        "zoho.com"

    ];


    const parts =
        email
            .toLowerCase()
            .split("@");


    if (
        parts.length !== 2
    ) {
        return false;
    }


    const domain =
        parts[1].trim();


    return (
        domain.length > 0
        &&
        !personalProviders.includes(
            domain
        )
    );

}


// =========================================================
// INITIALIZE PRODUCT PAGE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "🚀 Initializing TSEC Product Page..."
        );


        loadProduct();


        initProductAction();


        initLeadModal();

    }
);
