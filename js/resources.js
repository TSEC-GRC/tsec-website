/* =========================================================
   TSEC Resources Engine
   Version: 1.0
   Purpose:
   - Render product/resource cards
   - Connect resources.html → product.html
   ========================================================= */


console.log("✅ TSEC Resources Engine Loaded");


// =========================================================
// Product Database
// Loaded from data/products.json
// =========================================================

let TSEC_PRODUCTS = [];

fetch("data/products.json")

.then(response => response.json())

.then(data => {

    TSEC_PRODUCTS = data;

    console.log(
        "✅ Products loaded:",
        TSEC_PRODUCTS
    );

    if (typeof applyFilters === "function") {
        applyFilters();
    }

})
.catch(error => {

    console.error(
        "❌ Error loading products.json:",
        error
    );

});

// =========================================================
// Category Label
// Converts internal category IDs into display names
// =========================================================

function categoryLabel(category) {

    const labels = {

        "compliance": "Compliance",

        "ai-governance": "AI Governance",

        "risk-management": "Risk Management",

        "training": "Training",

        "grants": "Grants",

        "templates": "Templates",

        "enterprise-programs": "Enterprise Programs"

    };


    return labels[category] || category;

}

// =========================================================
// Tier Label
// =========================================================

function tierLabel(tier) {

    const icons = {

        free: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>`,

        pro: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>`,

        enterprise: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>`

    };


    const labels = {

        free: "Free",

        pro: "Pro",

        enterprise: "Enterprise"

    };


    return `
        <span class="rc-tier ${tier}">
            ${icons[tier]} ${labels[tier]}
        </span>
    `;

}

// =========================================================
// Render Products
// =========================================================

function renderProducts(products) {

    const container = document.getElementById("resources-container");


    if (!container) {

        console.error(
            "❌ Resources container not found"
        );

        return;

    }


    container.innerHTML = products
        .map(product => renderCard(product))
        .join("");

}



// =========================================================
// Render Product Card
// =========================================================

function renderCard(product) {


    return `

    <article class="resource-card">


        <div class="resource-image">

            <img 
            src="${product.image}"
            alt="${product.title}">

        </div>


        <div class="resource-content">


            <span class="resource-category">
                ${categoryLabel(product.category)}
            </span>
            
            ${tierLabel(product.tier)}

            <h3>
                ${product.title}
            </h3>


            <p>
                ${product.description}
            </p>


            <a 
            href="product.html?id=${product.id}"
            class="btn-primary">

                View Details

            </a>


        </div>


    </article>

    `;

}



// =========================================================
// Load Resources
// =========================================================

function loadResources(){


    const container =
    document.getElementById("resourcesContainer");


    if(!container){

        console.warn(
        "Resources container not found"
        );

        return;

    }



    container.innerHTML =
    TSEC_PRODUCTS
    .map(product => renderCard(product))
    .join("");


}



// =========================================================
// Initialize
// =========================================================

document.addEventListener(
"DOMContentLoaded",
()=>{

    loadResources();

});

q