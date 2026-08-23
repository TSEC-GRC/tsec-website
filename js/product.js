/*
==========================================================
 TSEC Product Engine v1.1
 Dynamic Product Loading + Lead Capture + Checkout Action
==========================================================
*/

console.log("TSEC Product Page Loaded");


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
// LOAD PRODUCT
// =========================================================

async function loadProduct() {

    try {

        console.log("⏳ Loading TSEC product...");


        // -------------------------------------------------
        // Load products database
        // -------------------------------------------------

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


        // -------------------------------------------------
        // Support both:
        //
        // [...]
        //
        // OR
        //
        // { products: [...] }
        // -------------------------------------------------

        const products =
            Array.isArray(data)
                ? data
                : data.products;


        if (!Array.isArray(products)) {

            throw new Error(
                "products.json does not contain a valid product array."
            );

        }


        // -------------------------------------------------
        // Get product ID from URL
        // -------------------------------------------------

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


        // -------------------------------------------------
        // Find product
        // -------------------------------------------------

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


        // -------------------------------------------------
        // Store current product globally
        // -------------------------------------------------

        CURRENT_PRODUCT =
            product;


        console.log(
            "✅ Product loaded:",
            product
        );


        // =================================================
        // BASIC PRODUCT INFORMATION
        // =================================================

        const tierElement =
            document.getElementById(
                "product-tier"
            );


        const titleElement =
            document.getElementById(
                "product-title"
            );


        const descriptionElement =
            document.getElementById(
                "product-description"
            );


        const priceElement =
            document.getElementById(
                "product-price"
            );


        const paymentElement =
            document.getElementById(
                "product-payment"
            );


        if (tierElement) {

            tierElement.textContent =
                product.tier || "";

        }


        if (titleElement) {

            titleElement.textContent =
                product.title || "";

        }


        if (descriptionElement) {

            descriptionElement.textContent =
                product.description ||
                product.desc ||
                "";

        }


        if (priceElement) {

            priceElement.textContent =
                product.price || "";

        }


        if (paymentElement) {

            paymentElement.textContent =
                product.payment || "";

        }


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
                product.title || "TSEC Product";

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


                    li.textContent =
                        "✔ " + feature;


                    featuresList.appendChild(
                        li
                    );

                }
            );

        }


        // =================================================
        // OPTIONAL PRODUCT METADATA
        // =================================================

        const productType =
            document.getElementById(
                "product-type"
            );


        if (
            productType &&
            product.type
        ) {

            productType.textContent =
                product.type;

        }


        console.log(
            `✅ TSEC Product Page ready: ${product.title}`
        );


    } catch (error) {

        console.error(
            "❌ Product loading error:",
            error
        );


        // -------------------------------------------------
        // Display product error
        // -------------------------------------------------

        const titleElement =
            document.getElementById(
                "product-title"
            );


        if (titleElement) {

            titleElement.textContent =
                "Product Unavailable";

        }


        const descriptionElement =
            document.getElementById(
                "product-description"
            );


        if (descriptionElement) {

            descriptionElement.textContent =
                "We were unable to load this product. Please return to the TSEC Resources page.";

        }

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
