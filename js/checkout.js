/* =========================================================
   TSEC PAYPAL CHECKOUT ENGINE
   PayPal + eligible Venmo only.
   Prices and payment authorization remain server-controlled.
========================================================= */

console.log("TSEC PayPal Checkout Engine loaded.");

let CHECKOUT_CUSTOMER = null;
let CURRENT_CHECKOUT_PRODUCT = null;

const PAYPAL_SUPPORTED_PRODUCTS = new Set([
    "soc2-professional-pack",
    "iso27001-professional-pack",
    "nydfs-professional-pack",
    "nist-csf-professional-pack",
    "pci-dss-professional-pack",
    "hipaa-security-professional-pack",
    "hitrust-professional-pack",
    "iso42001-professional-pack",
    "iso22301-professional-pack"
]);

const PAYPAL_AUTH_PREFIX = "tsec_paypal_download_";

function setPaymentStatus(message, isError = false) {
    const element = document.getElementById("payment-status");

    if (!element) return;

    element.textContent = message;
    element.style.display = message ? "block" : "none";
    element.setAttribute("aria-live", "polite");

    element.style.color = isError ? "#b91c1c" : "#475569";
}

function loadCheckoutCustomer() {
    try {
        const stored = sessionStorage.getItem("tsec_checkout_customer");

        if (!stored) {
            setPaymentStatus(
                "Your checkout session has expired. Return to the product page and try again.",
                true
            );
            return false;
        }

        CHECKOUT_CUSTOMER = JSON.parse(stored);

        if (
            !CHECKOUT_CUSTOMER ||
            typeof CHECKOUT_CUSTOMER.email !== "string" ||
            !CHECKOUT_CUSTOMER.email.trim()
        ) {
            setPaymentStatus(
                "Your checkout email is unavailable. Return to the product page and try again.",
                true
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error("Unable to load checkout customer:", error);
        setPaymentStatus("Unable to load your checkout session.", true);
        return false;
    }
}

async function loadCheckoutProduct() {
    try {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get("id");

        if (!productId) {
            throw new Error("No product ID specified.");
        }

        const response = await fetch("data/products.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`Product catalog unavailable: HTTP ${response.status}`);
        }

        const catalog = await response.json();
        const products = Array.isArray(catalog) ? catalog : catalog.products;

        if (!Array.isArray(products)) {
            throw new Error("Invalid product catalog.");
        }

        const product = products.find(
            item => String(item.id) === String(productId)
        );

        if (!product) {
            throw new Error("Product not found.");
        }

        if (!PAYPAL_SUPPORTED_PRODUCTS.has(product.id)) {
            throw new Error(
                "This product is not currently available for online payment. Please contact TSEC."
            );
        }

        CURRENT_CHECKOUT_PRODUCT = product;

        const image = document.getElementById("checkout-product-image");
        if (image) {
            image.src = product.image || "";
            image.alt = product.title || "TSEC Professional Pack";
        }

        const title = document.getElementById("checkout-product-title");
        if (title) title.textContent = product.title || "";

        const positioning = document.getElementById("checkout-product-positioning");
        if (positioning) positioning.textContent = product.positioning || "";

        const price = document.getElementById("checkout-product-price");

        if (price) {
            const currency = product.currency || "USD";
            const numericPrice = Number(product.price);

            price.textContent = Number.isFinite(numericPrice)
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency
                }).format(numericPrice)
                : "—";
        }

        return true;
    } catch (error) {
        console.error("Checkout product error:", error);

        const title = document.getElementById("checkout-product-title");
        if (title) title.textContent = "Product Unavailable";

        const positioning = document.getElementById("checkout-product-positioning");
        if (positioning) positioning.textContent = error.message;

        const price = document.getElementById("checkout-product-price");
        if (price) price.textContent = "—";

        setPaymentStatus(error.message, true);
        return false;
    }
}

async function loadPayPalSdk() {
    const configResponse = await fetch(
        "/.netlify/functions/paypal-public-config",
        { method: "GET", cache: "no-store" }
    );

    const config = await configResponse.json().catch(() => ({}));

    if (
        !configResponse.ok ||
        typeof config.clientId !== "string" ||
        !config.clientId.trim() ||
        !["sandbox", "live"].includes(config.environment)
    ) {
        throw new Error(
            config.error || "PayPal configuration is unavailable."
        );
    }

    const query = new URLSearchParams({
        "client-id": config.clientId,
        currency: "USD",
        intent: "capture",
        components: "buttons",
        "enable-funding": "venmo",
        "disable-funding": "card,credit,paylater"
    });

    await new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = `https://www.paypal.com/sdk/js?${query.toString()}`;
        script.async = true;
        script.dataset.pageType = "checkout";

        script.onload = resolve;
        script.onerror = () => reject(
            new Error("Unable to load the PayPal payment SDK.")
        );

        document.head.appendChild(script);
    });

    if (
        !window.paypal ||
        typeof window.paypal.Buttons !== "function"
    ) {
        throw new Error("PayPal SDK did not initialize correctly.");
    }

    console.log("PayPal SDK loaded. Environment:", config.environment);
}

async function createPayPalOrder() {
    if (!CURRENT_CHECKOUT_PRODUCT) {
        throw new Error("Product information is unavailable.");
    }

    const response = await fetch(
        "/.netlify/functions/paypal-create-order",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productId: CURRENT_CHECKOUT_PRODUCT.id,
                deliveryEmail: CHECKOUT_CUSTOMER.email.trim().toLowerCase()
            })
        }
    );

    const data = await response.json().catch(() => ({}));

    if (
        !response.ok ||
        typeof data.id !== "string" ||
        data.productId !== CURRENT_CHECKOUT_PRODUCT.id ||
        data.currency !== "USD"
    ) {
        throw new Error(
            data.error || "Unable to create the PayPal order."
        );
    }

    return data.id;
}

async function capturePayPalOrder(orderId) {
    const response = await fetch(
        "/.netlify/functions/paypal-capture-order",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ orderId })
        }
    );

    const data = await response.json().catch(() => ({}));

    if (
        (!response.ok && response.status !== 202) ||
        typeof data.transactionId !== "string" ||
        typeof data.downloadAuthorization !== "string"
    ) {
        throw new Error(
            data.error || "Payment capture could not be verified."
        );
    }

    if (
        !/^[a-z0-9]{10,64}$/i.test(data.transactionId)
    ) {
        throw new Error("Invalid payment transaction reference.");
    }

    const storageKey = PAYPAL_AUTH_PREFIX + data.transactionId;

    sessionStorage.setItem(
        storageKey,
        data.downloadAuthorization
    );

    const successUrl = new URL("success.html", window.location.href);

    successUrl.searchParams.set("provider", "paypal");
    successUrl.searchParams.set("transaction_id", data.transactionId);

    window.location.assign(successUrl.toString());
}

function getPayPalButtonCallbacks() {
    return {
        createOrder: async function () {
            setPaymentStatus("Preparing your secure payment...");

            try {
                return await createPayPalOrder();
            } catch (error) {
                console.error("PayPal order creation failed:", error);
                setPaymentStatus(error.message, true);
                throw error;
            }
        },

        onApprove: async function (data) {
            setPaymentStatus("Payment approved. Verifying your transaction...");

            try {
                if (!data || !data.orderID) {
                    throw new Error("PayPal did not return an order reference.");
                }

                await capturePayPalOrder(data.orderID);
            } catch (error) {
                console.error("PayPal capture failed:", error);
                setPaymentStatus(
                    error.message + " If you were charged, contact TSEC support before attempting another payment.",
                    true
                );
            }
        },

        onCancel: function () {
            setPaymentStatus(
                "Payment was cancelled. You have not completed this checkout."
            );
        },

        onError: function (error) {
            console.error("PayPal checkout error:", error);

            setPaymentStatus(
                "PayPal could not complete the checkout. Please try again or contact TSEC support.",
                true
            );
        }
    };
}

async function renderPayPalButtons() {
    const paypalContainer = document.getElementById("paypal-button-container");
    const venmoContainer = document.getElementById("venmo-button-container");

    if (!paypalContainer || !venmoContainer) {
        throw new Error("Payment button containers are missing.");
    }

    const callbacks = getPayPalButtonCallbacks();

    const paypalButtons = window.paypal.Buttons({
        ...callbacks,
        fundingSource: window.paypal.FUNDING.PAYPAL,
        style: {
            layout: "vertical",
            shape: "rect",
            label: "paypal",
            height: 48
        }
    });

    if (paypalButtons.isEligible()) {
        await paypalButtons.render("#paypal-button-container");
    } else {
        throw new Error("PayPal checkout is not available for this session.");
    }

    const venmoButtons = window.paypal.Buttons({
        ...callbacks,
        fundingSource: window.paypal.FUNDING.VENMO,
        style: {
            layout: "vertical",
            shape: "rect",
            label: "pay",
            height: 48
        }
    });

    if (venmoButtons.isEligible()) {
        await venmoButtons.render("#venmo-button-container");
        venmoContainer.style.display = "block";
    } else {
        venmoContainer.style.display = "none";
    }

    setPaymentStatus(
        "Secure one-time payment. Venmo appears when supported by PayPal for your device and account."
    );
}

document.addEventListener("DOMContentLoaded", async function () {
    try {
        const customerReady = loadCheckoutCustomer();
        const productReady = await loadCheckoutProduct();

        if (!customerReady || !productReady) return;

        setPaymentStatus("Loading secure payment options...");

        await loadPayPalSdk();
        await renderPayPalButtons();

        console.log("TSEC PayPal checkout initialized.");
    } catch (error) {
        console.error("PayPal checkout initialization failed:", error);
        setPaymentStatus(
            error.message || "Secure payment service is unavailable.",
            true
        );
    }
});
