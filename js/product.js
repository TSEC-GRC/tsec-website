/*
==========================================================
 TSEC Product Engine v2.1
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
==========================================================
*/

console.log("🚀 TSEC Product Engine v2.1 Loaded");


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

        console.log("⏳ Loading TSEC product...");


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
            product.tier || ""
        );


        setText(
            "product-title",
            product.title || ""
        );


        setText(
            "product-description",
            product.description ||
            product.desc ||
            ""
        );


        setText(
            "product-price",
            product.price || ""
        );


        setText(
            "product-payment",
            product.payment || ""
        );


        setText(
            "product-type",
            product.type || ""
        );


        // =================================================
        // PRODUCT IMAGE
        // =================================================
        //
        // PRODUCT BOX IMAGE:
        //
        // assets/products/
        //
        // Example:
        // assets/products/ai-governance-box.webp
        //
        // IMPORTANT:
        // This is NOT a framework/regulation icon.
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
                "TSEC Professional Pack";

        }


        // =================================================
        // PRODUCT FEATURES
        // =================================================

        const featuresList =
            document.getElementById(
                "product-features"
            );


        if (featuresList) {

            featuresList.innerHTML = "";


            const features =
                Array.isArray(product.features)
                    ? product.features
                    : [];


            features.forEach(
                feature => {

                    const li =
                        document.createElement(
                            "li"
                        );


                    const check =
                        document.createElement(
                            "span"
                        );


                    check.className =
                        "check-green";


                    check.textContent =
                        "✓";


                    li.appendChild(
                        check
                    );


                    const text =
                        document.createTextNode(
                            " " + feature
                        );


                    li.appendChild(
                        text
                    );


                    featuresList.appendChild(
                        li
                    );

                }
            );

        }


        // =================================================
        // PRODUCT STATISTICS
        // =================================================

        const stats =
            product.stats || {};


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


        // IMPORTANT:
        // products.json uses "powerpoint"
        // NOT "powerPoint"

        setText(
            "stat-powerpoint",
            stats.powerpoint ?? "—"
        );


        setText(
            "stat-guides",
            stats.guides ?? "—"
        );


        setText(
            "stat-delivery",
            stats.delivery || "Instant"
        );


        // =================================================
        // PRODUCT METADATA
        // =================================================

        const metadata =
            product.metadata || {};


        // -------------------------------------------------
        // FRAMEWORKS
        // -------------------------------------------------
        //
        // Primary source:
        //
        // product.frameworks
        //
        // Fallback:
        //
        // product.topics
        // -------------------------------------------------

        const frameworkElement =
            document.getElementById(
                "product-frameworks"
            );


        if (frameworkElement) {

            const frameworks =
                Array.isArray(product.frameworks)
                    ? product.frameworks
                    : (
                        Array.isArray(metadata.frameworks)
                            ? metadata.frameworks
                            : (
                                Array.isArray(product.topics)
                                    ? product.topics
                                    : []
                            )
                    );


            frameworkElement.innerHTML =
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
                                framework
                            );

                        }
                    )
                    .filter(Boolean)
                    .join("<br>");

        }


        // -------------------------------------------------
        // FORMAT
        // -------------------------------------------------

        setText(
            "product-format",
            metadata.format ||
            "Microsoft Word, Excel & PowerPoint"
        );


        // -------------------------------------------------
        // DELIVERY
        // -------------------------------------------------

        setText(
            "product-delivery",
            metadata.delivery ||
            "Instant Digital Download"
        );


        // -------------------------------------------------
        // LICENSE
        // -------------------------------------------------

        setText(
            "product-license",
            metadata.license ||
            "Single Organization Use"
        );


        // -------------------------------------------------
        // UPDATES
        // -------------------------------------------------

        setText(
            "product-updates",
            metadata.updates ||
            "Minor updates for 12 months"
        );


        // =================================================
        // WHAT'S INCLUDED
        // =================================================

        setText(
            "product-included-description",
            product.includedDescription ||
            "Professional resources designed to help your organization implement and strengthen its program."
        );


        const includedGrid =
            document.getElementById(
                "product-included-grid"
            );


        if (includedGrid) {

            includedGrid.innerHTML = "";


            const included =
                Array.isArray(product.included)
                    ? product.included
                    : [];


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
                        item.title || "";


                    const description =
                        document.createElement(
                            "p"
                        );


                    description.textContent =
                        item.description || "";


                    card.appendChild(
                        title
                    );


                    card.appendChild(
                        description
                    );


                    includedGrid.appendChild(
                        card
                    );

                }
            );

        }


        // =================================================
        // FRAMEWORK COVERAGE DESCRIPTION
        // =================================================

        setText(
            "framework-description",
            product.frameworkDescription ||
            "Aligned with recognized governance, risk, cybersecurity and compliance frameworks."
        );


        // =================================================
        // FRAMEWORK / REGULATION COVERAGE
        // =================================================
        //
        // IMPORTANT:
        //
        // These are the FRAMEWORK / REGULATION ICONS.
        //
        // They come from:
        //
        // assets/icons/
        //
        // NOT:
        //
        // assets/products/
        //
        // products.json structure:
        //
        // "frameworks": [
        //   {
        //     "name": "...",
        //     "description": "...",
        //     "icon": "assets/icons/..."
        //   }
        // ]
        //
        // =================================================

        const frameworkGrid =
            document.getElementById(
                "framework-grid"
            );


        if (frameworkGrid) {

            frameworkGrid.innerHTML = "";


            // IMPORTANT:
            // products.json uses "frameworks"
            // NOT "frameworkCoverage"

            const frameworkCoverage =
                Array.isArray(product.frameworks)
                    ? product.frameworks
                    : [];


            frameworkCoverage.forEach(
                framework => {

                    // =====================================
                    // FRAMEWORK CARD
                    // =====================================

                    const card =
                        document.createElement(
                            "div"
                        );


                    card.className =
                        "framework-card";


                    // =====================================
                    // FRAMEWORK ICON CONTAINER
                    // =====================================

                    const iconContainer =
                        document.createElement(
                            "div"
                        );


                    iconContainer.className =
                        "framework-icon";


                    // =====================================
                    // FRAMEWORK ICON
                    // =====================================

                    if (
                        framework.icon
                    ) {

                        const icon =
                            document.createElement(
                                "img"
                            );


                        icon.src =
                            framework.icon;


                        icon.alt =
                            framework.name ||
                            "Framework";


                        icon.loading =
                            "lazy";


                        // Preserve the existing
                        // framework icon visual quality.

                        icon.decoding =
                            "async";


                        iconContainer.appendChild(
                            icon
                        );

                    }


                    // =====================================
                    // FRAMEWORK NAME
                    // =====================================

                    const title =
                        document.createElement(
                            "h3"
                        );


                    title.textContent =
                        framework.name || "";


                    // =====================================
                    // FRAMEWORK DESCRIPTION
                    // =====================================

                    const description =
                        document.createElement(
                            "p"
                        );


                    description.textContent =
                        framework.description || "";


                    // =====================================
                    // BUILD CARD
                    // =====================================

                    card.appendChild(
                        iconContainer
                    );


                    card.appendChild(
                        title
                    );


                    card.appendChild(
                        description
                    );


                    frameworkGrid.appendChild(
                        card
                    );

                }
            );

        }


        // =================================================
        // PRODUCT PAGE READY
        // =================================================

        console.log(
            `✅ TSEC Product Page ready: ${product.title}`
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

    }

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
                // READ EMAIL
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

function isCorporateEmail(email) {

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

async function saveLead(leadData) {

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
// START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadProduct();

        initProductAction();

        initLeadModal();

    }
);
