// =========================================================
// TSEC CHECKOUT ENGINE
// Version: 1.0
// Purpose:
// - Load selected product from products.json
// - Populate checkout order summary
// =========================================================


console.log("✅ TSEC Checkout Engine Loaded");


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


        // =================================================
        // SUPPORT:
        //
        // [...]
        //
        // OR:
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


        // =================================================
        // CHECKOUT PAGE READY
        // =================================================

        console.log(
            `✅ Checkout ready: ${product.title}`
        );


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

    }

}


// =========================================================
// START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadCheckoutProduct();

    }
);
