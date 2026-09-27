// =========================================================
// TSEC CHECKOUT ENGINE
// Version: 2.0
//
// Purpose:
// - Load selected product from products.json
// - Populate checkout order summary
// - Load customer information from sessionStorage
// - Initialize Paddle Sandbox
// - Open Paddle Checkout
// - Capture checkout.completed
// - Redirect customer to secure confirmation page
// =========================================================


console.log(
    "TSEC Checkout Engine v2.0 Loaded"
);


// =========================================================
// PADDLE CONFIGURATION
// =========================================================

const PADDLE_CLIENT_TOKEN =
    "test_5b1cc1b840fbce081663e12a9ea";


// =========================================================
// CURRENT CHECKOUT STATE
// =========================================================

let CURRENT_CHECKOUT_PRODUCT = null;

let CHECKOUT_CUSTOMER = null;


// =========================================================
// GET PRODUCT ID
// =========================================================

function getCheckoutProductId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return params.get("id");

}


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
                "No TSEC checkout customer data found."
            );

            return null;

        }


        const customer =
            JSON.parse(
                storedCustomer
            );


        if (
            !customer.email
        ) {

            console.warn(
                "Checkout customer email is missing."
            );

            return null;

        }


        CHECKOUT_CUSTOMER =
            customer;


        console.log(
            "Checkout customer loaded."
        );


        return customer;


    } catch (error) {

        console.error(
            "Unable to load checkout customer:",
            error
        );


        return null;

    }

}


// =========================================================
// LOAD CHECKOUT PRODUCT
// =========================================================

async function loadCheckoutProduct() {

    try {

        console.log(
            "Loading checkout product..."
        );


        // =================================================
        // GET PRODUCT ID FROM URL
        // =================================================

        const productId =
            getCheckoutProductId();


        if (!productId) {

            throw new Error(
                "No product ID specified in checkout URL."
            );

        }


        console.log(
            "Checkout Product ID:",
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


        // =================================================
        // SUPPORT BOTH PRODUCT STRUCTURES
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
            "Checkout product loaded:",
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
                Number.isFinite(
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
            `Checkout ready: ${product.title}`
        );


        return product;


    } catch (error) {

        console.error(
            "Checkout loading error:",
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


        return null;

    }

}


// =========================================================
// INITIALIZE PADDLE
// =========================================================

function initPaddle() {

    if (
        typeof Paddle === "undefined"
    ) {

        console.error(
            "Paddle.js was not loaded."
        );

        return false;

    }


    try {

        // -------------------------------------------------
        // SANDBOX
        // -------------------------------------------------

        Paddle.Environment.set(
            "sandbox"
        );


        // -------------------------------------------------
        // INITIALIZE
        // -------------------------------------------------

        Paddle.Initialize({

            token:
                PADDLE_CLIENT_TOKEN,


            // =============================================
            // PADDLE EVENT CALLBACK
            // =============================================

            eventCallback:
                function (event) {

                    console.log(
                        "Paddle event:",
                        event
                    );


                    // -----------------------------------------
                    // CHECKOUT COMPLETED
                    // -----------------------------------------

                    if (
                        event
                        &&
                        event.name ===
                            "checkout.completed"
                    ) {

                        const transactionId =
                            event
                                ?.data
                                ?.transaction_id;


                        if (
                            !transactionId
                        ) {

                            console.error(
                                "checkout.completed received without transaction_id."
                            );


                            return;

                        }


                        console.log(
                            "Paddle checkout completed:",
                            transactionId
                        );


                        // -------------------------------------
                        // REDIRECT TO SUCCESS PAGE
                        // -------------------------------------

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
            "Paddle Sandbox initialized."
        );


        return true;


    } catch (error) {

        console.error(
            "Paddle initialization failed:",
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
    // VALIDATE PRODUCT
    // =====================================================

    if (
        !CURRENT_CHECKOUT_PRODUCT
    ) {

        alert(
            "Product information is not available. Please refresh the page."
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
            "Customer information is missing. Please return to the product page and try again."
        );


        return;

    }


    // =====================================================
    // INITIALIZE PADDLE
    // =====================================================

    if (
        !initPaddle()
    ) {

        alert(
            "Secure checkout is temporarily unavailable. Please try again shortly."
        );


        return;

    }


    // =====================================================
    // PRODUCT / PRICE
    // =====================================================

    const paddlePriceId =
        CURRENT_CHECKOUT_PRODUCT.paddle_price_id
        ||
        "pri_01m306t66hbgv4rn4zg3n7xqzr";


    console.log(
        "Opening Paddle Checkout..."
    );


    console.log(
        "Paddle Price ID:",
        paddlePriceId
    );


    // =====================================================
    // OPEN PADDLE
    // =====================================================

    Paddle.Checkout.open({

        items: [

            {
                priceId:
                    paddlePriceId,

                quantity:
                    1

            }

        ],


        // -------------------------------------------------
        // CUSTOMER
        // -------------------------------------------------

        customer: {

            email:
                CHECKOUT_CUSTOMER.email

        },


        // -------------------------------------------------
        // CUSTOM DATA
        //
        // This is later read by paddle-webhook.js
        // -------------------------------------------------

        customData: {

            customer_email:
                CHECKOUT_CUSTOMER.email,

            product_id:
                CURRENT_CHECKOUT_PRODUCT.id

        }

    });

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
            "Checkout button not found."
        );


        return;

    }


    button.addEventListener(
        "click",
        function () {

            openPaddleCheckout();

        }
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


    if (!paymentText) {

        return;

    }


    paymentText.textContent =
        "Secure payment processing powered by Paddle.";


}


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "Initializing TSEC Checkout Page..."
        );


        loadCheckoutCustomer();


        await loadCheckoutProduct();


        updatePaymentText();


        initCheckoutButton();


    }
);
