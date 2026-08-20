/* =========================================================
   TSEC Resources Engine
   Version: 1.0

   Purpose:
   - Load Professional Packs from data/products.json
   - Provide TSEC_PRODUCTS to resources.html
   - Trigger the existing applyFilters() renderer
   ========================================================= */

console.log("✅ TSEC Resources Engine Loaded");


// =========================================================
// PRODUCT DATABASE
// Loaded from data/products.json
// =========================================================

let TSEC_PRODUCTS = [];


fetch("data/products.json")

  .then(response => {

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status} while loading products.json`
      );

    }

    return response.json();

  })

  .then(data => {

    if (!Array.isArray(data)) {

      throw new Error(
        "products.json must contain an array of products."
      );

    }


    TSEC_PRODUCTS = data;


    console.log(
      "✅ Products loaded:",
      TSEC_PRODUCTS
    );


    // Re-render resources after products.json loads.
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
