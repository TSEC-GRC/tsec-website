// =========================================================
// TSEC CHECKOUT ENGINE
// Version: 2.0
// Purpose:
// - Load selected product from products.json
// - Load customer data from sessionStorage
// - Initialize Paddle Sandbox
// - Open secure Paddle checkout
// - Redirect to success.html after checkout completion
// =========================================================


console.log(
    "✅ TSEC Checkout Engine 2.0 Loaded"
);


// =========================================================
// PADDLE CONFIGURATION
// =========================================================

const PADDLE_CLIENT_TOKEN =
    "test_5b1cc1b840fbce081663e12a9ea";


// =========================================================
// GLOBAL CHECKOUT STATE
// =========================================================

let CHECKOUT_CUSTOMER = null;

let CURRENT_CHECKOUT_PRODUCT = null;


// =========================================================
// LOAD CUSTOMER DATA
// =========================================================

function loadCheckoutCustomer() {

    try {

        const storedCustomer =
            sessionStorage.getItem(
                "tsec_checkout_customer"
            );


        if (!storedCustomer) {

            console.warn(
                "⚠️ No checkout customer data found."
            );

            return false;

        }


        CHECKOUT_CUSTOMER =
            JSON.parse(
                storedCustomer
            );


        if (
            !CHECKOUT_CUSTOMER.email
        ) {

            console.warn(
                "⚠️ Checkout customer email is missing."
            );

            return false;

        }


        console.log(
            "✅ Checkout customer loaded:",
            CHECKOUT_CUSTOMER.email
        );


        return true;

    } catch (error) {

        console.error(
            "❌ Unable to load checkout customer:",
            error
        );


        return false;

    }

}


// =========================================================
// LOAD CHECKOUT PRODUCT
// =========================================================

async function loadCheckoutProduct() {

    try {

        console.log(
            "⏳ Loading checkout product..."
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
                "No product ID specified in checkout URL."
            );

        }


        console.log(
            "🔎 Checkout Product ID:",
            productId
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


        CURRENT_CHECKOUT_PRODUCT =
            product;


        console.log(
            "✅ Checkout product loaded:",
            product
        );


        // =================================================
        // PRODUCT IMAGE
        // =================================================

        const image =
            document.getElementById(
                "checkout-product-image"
            );


        if (image) {

            image.src =
                product.image || "";

            image.alt =
                product.title ||
                "TSEC Professional Pack";

        }


        // =================================================
        // PRODUCT TITLE
        // =================================================

        const title =
            document.getElementById(
                "checkout-product-title"
            );


        if (title) {

            title.textContent =
                product.title || "";

        }


        // =================================================
        // PRODUCT POSITIONING
        // =================================================

        const positioning =
            document.getElementById(
                "checkout-product-positioning"
            );


        if (positioning) {

            positioning.textContent =
                product.positioning || "";

        }


        // =================================================
        // PRODUCT PRICE
        // =================================================

        const price =
            document.getElementById(
                "checkout-product-price"
            );


        if (price) {

            const currency =
                product.currency || "USD";


            const numericPrice =
                Number(product.price);


            if (
                !Number.isNaN(
                    numericPrice
                )
            ) {

                price.textContent =
                    new Intl.NumberFormat(
                        "en-US",
                        {
                            style: "currency",
                            currency: currency
                        }
                    ).format(
                        numericPrice
                    );

            } else {

                price.textContent =
                    product.price || "—";

            }

        }


        console.log(
            `✅ Checkout ready: ${product.title}`
        );


        return true;

    } catch (error) {

        console.error(
            "❌ Checkout loading error:",
            error
        );


        const title =
            document.getElementById(
                "checkout-product-title"
            );


        if (title) {

            title.textContent =
                "Product Unavailable";

        }


        const positioning =
            document.getElementById(
                "checkout-product-positioning"
            );


        if (positioning) {

            positioning.textContent =
                "Unable to load product information.";

        }


        const price =
            document.getElementById(
                "checkout-product-price"
            );


        if (price) {

            price.textContent =
                "—";

        }


        return false;

    }

}


// =========================================================
// INITIALIZE PADDLE
// =========================================================

function initPaddle() {

    if (
        typeof Paddle ===
        "undefined"
    ) {

        console.error(
            "❌ Paddle.js is not loaded."
        );

        return false;

    }


    try {

        // ================================================
        // PADDLE SANDBOX
        // ================================================

        Paddle.Environment.set(
            "sandbox"
        );


        // ================================================
        // INITIALIZE PADDLE
        // ================================================

        Paddle.Initialize({

            token:
                PADDLE_CLIENT_TOKEN,


            eventCallback:
                function (event) {

                    console.log(
                        "Paddle event:",
                        event
                    );


                    // ====================================
                    // CHECKOUT COMPLETED
                    // ====================================

                    if (
                        event.name ===
                        "checkout.completed"
                    ) {

                        const transactionId =
                            event?.data
                                ?.transaction_id;


                        if (!transactionId) {

                            console.error(
                                "❌ Paddle checkout completed but transaction_id is missing."
                            );

                            return;

                        }


                        console.log(
                            "✅ Paddle checkout completed:",
                            transactionId
                        );


                        // =================================
                        // REDIRECT TO SUCCESS PAGE
                        // =================================

                        const successUrl =
                            `success.html?transaction_id=${encodeURIComponent(
                                transactionId
                            )}`;


                        window.location.href =
                            successUrl;

                    }

                }

        });


        console.log(
            "✅ Paddle Sandbox initialized."
        );


        return true;

    } catch (error) {

        console.error(
            "❌ Paddle initialization error:",
            error
        );


        return false;

    }

}


// =========================================================
// OPEN PADDLE CHECKOUT
// =========================================================

function openPaddleCheckout() {

    // =====================================================
    // VALIDATE PADDLE
    // =====================================================

    if (
        typeof Paddle ===
        "undefined"
    ) {

        alert(
            "Secure payment service is unavailable. Please try again."
        );

        return;

    }


    // =====================================================
    // VALIDATE CUSTOMER
    // =====================================================

    if (
        !CHECKOUT_CUSTOMER
        ||
        !CHECKOUT_CUSTOMER.email
    ) {

        alert(
            "Your checkout session has expired. Please return to the product page and try again."
        );

        return;

    }


    // =====================================================
    // VALIDATE PRODUCT
    // =====================================================

    if (
        !CURRENT_CHECKOUT_PRODUCT
    ) {

        alert(
            "Product information is unavailable. Please try again."
        );

        return;

    }


    // =====================================================
    // GET PADDLE PRICE ID
    // =====================================================

    const paddlePriceId =
        CURRENT_CHECKOUT_PRODUCT.paddle_price_id
        ||
        "pri_01m306t66hbgv4rn4zg3n7xqzr";


    console.log(
        "💳 Opening Paddle Checkout:",
        paddlePriceId
    );


    // =====================================================
    // OPEN PADDLE CHECKOUT
    // =====================================================

    try {

        Paddle.Checkout.open({

            items: [

                {

                    priceId:
                        paddlePriceId,

                    quantity:
                        1

                }

            ],


            // =============================================
            // CUSTOMER
            // =============================================

            customer: {

                email:
                    CHECKOUT_CUSTOMER.email

            },


            // =============================================
            // CUSTOM DATA
            // =============================================

            customData: {

                customer_email:
                    CHECKOUT_CUSTOMER.email,

                product_id:
                    CURRENT_CHECKOUT_PRODUCT.id

            }

        });

    } catch (error) {

        console.error(
            "❌ Paddle Checkout error:",
            error
        );


        alert(
            "Unable to open secure payment checkout. Please try again."
        );

    }

}


// =========================================================
// INITIALIZE CHECKOUT BUTTON
// =========================================================

function initCheckoutButton() {

    const button =
        document.querySelector(
            ".checkout-button"
        );


    if (!button) {

        console.warn(
            "⚠️ Checkout button not found."
        );

        return;

    }


    button.addEventListener(
        "click",
        function () {

            openPaddleCheckout();

        }
    );


    console.log(
        "✅ Checkout button initialized."
    );

}


// =========================================================
// UPDATE PAYMENT TEXT
// =========================================================

function updatePaymentText() {

    const paymentText =
        document.querySelector(
            ".payment-box p"
        );


    if (
        paymentText
    ) {

        paymentText.textContent =
            "Secure payment processing powered by Paddle.";

    }

}


// =========================================================
// START CHECKOUT
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "🚀 Starting TSEC Checkout..."
        );


        // ================================================
        // LOAD CUSTOMER
        // ================================================

        loadCheckoutCustomer();


        // ================================================
        // LOAD PRODUCT
        // ================================================

        await loadCheckoutProduct();


        // ================================================
        // UPDATE PAYMENT TEXT
        // ================================================

        updatePaymentText();


        // ================================================
        // INITIALIZE PADDLE
        // ================================================

        initPaddle();


        // ================================================
        // INITIALIZE BUTTON
        // ================================================

        initCheckoutButton();


        console.log(
            "✅ TSEC Checkout initialization complete."
        );

    }
);