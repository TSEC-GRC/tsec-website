console.log("TSEC Product Page Loaded");

async function loadProduct() {
    try {
        const response = await fetch("data/products.json");

        if (!response.ok) {
            throw new Error("Unable to load products.json");
        }

        const products = await response.json();

        // Por ahora cargamos el primer producto
        const product = products[0];

        document.getElementById("product-tier").textContent = product.tier;
        document.getElementById("product-title").textContent = product.title;
        document.getElementById("product-description").textContent = product.description;
        document.getElementById("product-price").textContent = product.price;
        document.getElementById("product-payment").textContent = product.payment;

        const featuresList = document.getElementById("product-features");
        featuresList.innerHTML = "";

        product.features.forEach(feature => {
            const li = document.createElement("li");
            li.textContent = "✔ " + feature;
            featuresList.appendChild(li);
        });

        console.log("✅ Product loaded:", product.title);

    } catch (error) {
        console.error("❌ Product loading error:", error);
    }
}

// ===============================
// TSEC Checkout Action v1
// ===============================

function initProductAction() {

    const button = document.getElementById("product-action");

    if (!button) {
        console.warn("⚠ Checkout button not found");
        return;
    }

    button.addEventListener("click", function () {

        console.log("✅ Checkout button clicked");

        alert("TSEC Secure Checkout Flow Started");

    });

}


// ===============================
// START
// ===============================

document.addEventListener("DOMContentLoaded", function () {

    loadProduct();

    initProductAction();

});






document.addEventListener("DOMContentLoaded", loadProduct);
