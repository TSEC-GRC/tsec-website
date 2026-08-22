/* =========================================================
   TSEC RESOURCES ENGINE
   Version: 2.0
   Purpose:
   - Load products from data/products.json
   - Render FREE / PRO / ENTERPRISE resources
   - Search and filter resources
   - Connect resources.html → product.html
   ========================================================= */

console.log("✅ TSEC Resources Engine v2.0 Loaded");


// =========================================================
// STATE
// =========================================================

let TSEC_PRODUCTS = [];

let TSEC_FREE_RESOURCES = [];

let activeCategory = "all";

let activeTiers = new Set();

let searchQuery = "";


// =========================================================
// CATEGORY METADATA
// =========================================================

const TSEC_CATEGORIES = {

  compliance: {
    label: "Compliance Frameworks & Standards",
    icon: `
      <svg width="20" height="20"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    `
  },

  "ai-governance": {
    label: "AI Governance & Risk Management",
    icon: `
      <svg width="20" height="20"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    `
  },

  "risk-management": {
    label: "Cybersecurity Risk Management",
    icon: `
      <svg width="20" height="20"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    `
  },

  training: {
    label: "Security Awareness & Professional Training",
    icon: `
      <svg width="20" height="20"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round">
        <path d="M22 10v6"/>
        <path d="M2 10l10-5 10 5-10 5-10-5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    `
  },

  grants: {
    label: "Grants & Funding Opportunities",
    icon: `
      <svg width="20" height="20"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    `
  },

  templates: {
    label: "Policy & Documentation Templates",
    icon: `
      <svg width="20" height="20"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    `
  },

  "enterprise-programs": {
    label: "Enterprise Programs & Advisory",
    icon: `
      <svg width="20" height="20"
           viewBox="0 0 24 24"
           fill="none"
           stroke="#ff6b2c"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round">
        <path d="M3 21h18"/>
        <path d="M5 21V7l7-4 7 4v14"/>
        <path d="M9 9h.01"/>
        <path d="M9 13h.01"/>
        <path d="M9 17h.01"/>
        <path d="M15 9h.01"/>
        <path d="M15 13h.01"/>
        <path d="M15 17h.01"/>
      </svg>
    `
  }

};


// =========================================================
// TIER LABEL
// =========================================================

function tierLabel(tier) {

  const icons = {

    free: `
      <svg width="10" height="10"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    `,

    pro: `
      <svg width="10" height="10"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    `,

    enterprise: `
      <svg width="10" height="10"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2.5">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    `

  };

  const labels = {
    free: "Free",
    pro: "Pro",
    enterprise: "Enterprise"
  };

  return `
    <span class="rc-tier ${tier}">
      ${icons[tier] || ""}
      ${labels[tier] || tier}
    </span>
  `;
}


// =========================================================
// PRODUCT CATEGORY NORMALIZATION
// =========================================================

function normalizeCategory(product) {

  if (product.category) {
    return product.category;
  }

  if (product.categories && Array.isArray(product.categories)) {
    return product.categories[0];
  }

  return "compliance";
}


// =========================================================
// PRODUCT SEARCH TEXT
// =========================================================

function productMatchesSearch(product, query) {

  if (!query) {
    return true;
  }

  const title =
    String(product.title || "").toLowerCase();

  const description =
    String(
      product.description ||
      product.desc ||
      ""
    ).toLowerCase();

  const type =
    String(product.type || "").toLowerCase();

  const category =
    String(product.category || "").toLowerCase();

  const topics =
    Array.isArray(product.topics)
      ? product.topics.join(" ").toLowerCase()
      : "";

  return (
    title.includes(query) ||
    description.includes(query) ||
    type.includes(query) ||
    category.includes(query) ||
    topics.includes(query)
  );
}


// =========================================================
// PRODUCT ACTION
// =========================================================

function renderAction(item) {

  // -------------------------------------------------------
  // FREE
  // -------------------------------------------------------

if (item.tier === "free") {

  return `
    <a
      href="#"
      class="rc-download"
      data-resource-id="${item.id || ""}"
      onclick="return TSECEngine.handleFreeDownload('${String(item.id || "").replace(/'/g, "\\'")}');"
    >

      <svg width="14" height="14"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round">

        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>

      </svg>

      Download

    </a>
  `;
}


  // -------------------------------------------------------
  // PRO
  // -------------------------------------------------------

  if (item.tier === "pro") {

    return `
      <a
        href="product.html?id=${encodeURIComponent(item.id)}"
        class="rc-download"
      >

        <svg width="14" height="14"
             viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round">

          <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/>

        </svg>

        Purchase

      </a>
    `;
  }


  // -------------------------------------------------------
  // ENTERPRISE
  // -------------------------------------------------------

  if (item.tier === "enterprise") {

    return `
      <a
        href="enterprise.html"
        class="rc-download"
      >

        <svg width="14" height="14"
             viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round">

          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18"/>
          <path d="M15 3v18"/>

        </svg>

        Request Enterprise Assessment

      </a>
    `;
  }


  return "";
}


// =========================================================
// RENDER CARD
// =========================================================

function renderCard(item) {

  const category =
    normalizeCategory(item);

  const updatedDate =
    item.updated
      ? new Date(item.updated)
      : null;

  const formattedDate =
    updatedDate && !isNaN(updatedDate)
      ? updatedDate.toLocaleDateString(
          "en-US",
          {
            month: "short",
            year: "numeric"
          }
        )
      : "";


  const topics =
    Array.isArray(item.topics)
      ? item.topics
      : [];


  return `
    <article
      class="resource-card ${item.tier}"
      data-tier="${item.tier}"
      data-category="${category}"
    >

      <div class="rc-header">

        <span class="rc-type">
          ${item.type || "Resource"}
        </span>

        ${tierLabel(item.tier)}

      </div>


      <h3 class="rc-title">
        ${item.title || "Untitled Resource"}
      </h3>


      <p class="rc-desc">
        ${item.description || item.desc || ""}
      </p>


      <div class="rc-topics">

        ${topics
          .map(
            topic =>
              `<span class="rc-topic">${topic}</span>`
          )
          .join("")
        }

      </div>


      <div class="rc-footer">

        <span class="rc-date">
          ${formattedDate ? `Updated ${formattedDate}` : ""}
        </span>

        ${renderAction(item)}

      </div>

    </article>
  `;
}


// =========================================================
// RENDER SECTION
// =========================================================

function renderSection(
  categoryKey,
  categoryLabel,
  items
) {

  if (!items.length) {
    return "";
  }


  const metadata =
    TSEC_CATEGORIES[categoryKey] || {

      label:
        categoryLabel ||
        "Resources",

      icon: ""

    };


  return `
    <section
      class="resource-section"
      id="resources-section-${categoryKey}"
      data-category="${categoryKey}"
    >

      <div class="section-heading">

        ${metadata.icon}

        <h2>
          ${metadata.label}
        </h2>

        <span class="count-badge">
          ${items.length}
          resource${items.length !== 1 ? "s" : ""}
        </span>

      </div>


      <hr class="section-divider">


      <div class="resource-grid">

        ${items
          .map(renderCard)
          .join("")
        }

      </div>

    </section>
  `;
}


// =========================================================
// GET FILTERED PRODUCTS
// =========================================================

function getFilteredProducts() {

  const query =
    searchQuery
      .toLowerCase()
      .trim();


  return TSEC_PRODUCTS.filter(product => {

    // -----------------------------------------------------
    // Tier
    // -----------------------------------------------------

    if (
      activeTiers.size > 0 &&
      !activeTiers.has(product.tier)
    ) {

      return false;

    }


    // -----------------------------------------------------
    // Category
    // -----------------------------------------------------

    if (activeCategory !== "all") {

      const category =
        normalizeCategory(product);

      if (category !== activeCategory) {

        return false;

      }

    }


    // -----------------------------------------------------
    // Search
    // -----------------------------------------------------

    if (
      !productMatchesSearch(
        product,
        query
      )
    ) {

      return false;

    }


    return true;

  });

}


// =========================================================
// APPLY FILTERS
// =========================================================

function applyFilters() {

  const container =
    document.getElementById(
      "resourcesContainer"
    );

  const noResults =
    document.getElementById(
      "noResults"
    );


  if (!container) {

    console.error(
      "❌ TSEC Resources Engine: #resourcesContainer not found."
    );

    return;

  }


  const products =
    getFilteredProducts();


  let html = "";


  // -------------------------------------------------------
  // Group products by category
  // -------------------------------------------------------

  const grouped = {};


  products.forEach(product => {

    const category =
      normalizeCategory(product);

    if (!grouped[category]) {

      grouped[category] = [];

    }

    grouped[category].push(product);

  });


  // -------------------------------------------------------
  // Preserve preferred category order
  // -------------------------------------------------------

  const categoryOrder = [

    "compliance",

    "ai-governance",

    "risk-management",

    "training",

    "grants",

    "templates",

    "enterprise-programs"

  ];


  categoryOrder.forEach(category => {

    if (
      grouped[category] &&
      grouped[category].length
    ) {

      html += renderSection(
        category,
        TSEC_CATEGORIES[category]?.label,
        grouped[category]
      );

    }

  });


  // -------------------------------------------------------
  // Render unknown categories
  // -------------------------------------------------------

  Object.keys(grouped).forEach(category => {

    if (
      !categoryOrder.includes(category)
    ) {

      html += renderSection(
        category,
        category,
        grouped[category]
      );

    }

  });


  // -------------------------------------------------------
  // Update DOM
  // -------------------------------------------------------

  container.innerHTML =
    html;


  // -------------------------------------------------------
  // No results
  // -------------------------------------------------------

  if (noResults) {

    noResults.style.display =
      products.length === 0
        ? "block"
        : "none";

  }


  console.log(
    `✅ TSEC Resources rendered: ${products.length} products`
  );

}


// =========================================================
// SEARCH EVENT
// =========================================================

function initializeSearch() {

  const searchInput =
    document.getElementById(
      "searchInput"
    );


  if (!searchInput) {

    console.warn(
      "⚠️ #searchInput not found."
    );

    return;

  }


  searchInput.addEventListener(
    "input",
    event => {

      searchQuery =
        event.target.value;

      applyFilters();

    }
  );

}


// =========================================================
// CATEGORY FILTER EVENT
// =========================================================

function initializeCategoryFilters() {

  const categoryFilters =
    document.getElementById(
      "categoryFilters"
    );


  if (!categoryFilters) {

    console.warn(
      "⚠️ #categoryFilters not found."
    );

    return;

  }


  categoryFilters.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          ".filter-btn"
        );


      if (!button) {

        return;

      }


      document
        .querySelectorAll(
          "#categoryFilters .filter-btn"
        )
        .forEach(btn => {

          btn.classList.remove(
            "active"
          );

        });


      button.classList.add(
        "active"
      );


      activeCategory =
        button.dataset.category ||
        "all";


      applyFilters();

    }
  );

}


// =========================================================
// TIER FILTER EVENT
// =========================================================

function initializeTierFilters() {

  const tierFilters =
    document.getElementById(
      "tierFilters"
    );


  if (!tierFilters) {

    console.warn(
      "⚠️ #tierFilters not found."
    );

    return;

  }


  tierFilters.addEventListener(
    "click",
    event => {

      const pill =
        event.target.closest(
          ".tier-pill"
        );


      if (!pill) {

        return;

      }


      const tier =
        pill.dataset.tier;


      // ---------------------------------------------------
      // Enterprise button
      // ---------------------------------------------------

      if (tier === "enterprise") {

        return;

      }


      // ---------------------------------------------------
      // Toggle FREE / PRO
      // ---------------------------------------------------

      if (
        activeTiers.has(tier)
      ) {

        activeTiers.delete(
          tier
        );

        pill.classList.remove(
          "active"
        );

      } else {

        activeTiers.add(
          tier
        );

        pill.classList.add(
          "active"
        );

      }


      applyFilters();

    }
  );

}


// =========================================================
// LOAD PRODUCTS + FREE RESOURCES
// =========================================================

async function loadProducts() {

  try {

    console.log(
      "⏳ Loading TSEC resources..."
    );


    // =====================================================
    // LOAD PRO PRODUCTS
    // =====================================================

    const productsResponse = await fetch(
      "data/products.json",
      {
        cache: "no-store"
      }
    );


    if (!productsResponse.ok) {

      throw new Error(
        `products.json HTTP ${productsResponse.status}`
      );

    }


    const productsData =
      await productsResponse.json();


    if (Array.isArray(productsData)) {

      TSEC_PRODUCTS = productsData;

    } else if (
      productsData &&
      Array.isArray(productsData.products)
    ) {

      TSEC_PRODUCTS =
        productsData.products;

    } else {

      throw new Error(
        "products.json does not contain a valid product array."
      );

    }


    console.log(
      `✅ TSEC PRO products loaded: ${TSEC_PRODUCTS.length}`
    );


    // =====================================================
    // LOAD FREE RESOURCES
    // =====================================================

    const freeResponse = await fetch(
      "data/free-resources.json",
      {
        cache: "no-store"
      }
    );


    if (!freeResponse.ok) {

      throw new Error(
        `free-resources.json HTTP ${freeResponse.status}`
      );

    }


    const freeData =
      await freeResponse.json();


    if (!Array.isArray(freeData)) {

      throw new Error(
        "free-resources.json does not contain a valid array."
      );

    }


    TSEC_FREE_RESOURCES =
      freeData;


    console.log(
      `✅ TSEC FREE resources loaded: ${TSEC_FREE_RESOURCES.length}`
    );


    // =====================================================
    // COMBINE FREE + PRO
    // =====================================================

    TSEC_PRODUCTS = [
      ...TSEC_FREE_RESOURCES,
      ...TSEC_PRODUCTS
    ];


    // =====================================================
    // VALIDATE TIERS
    // =====================================================

    const tierCounts = {

      free: 0,

      pro: 0,

      enterprise: 0

    };


    TSEC_PRODUCTS.forEach(product => {

      if (
        tierCounts[product.tier] !== undefined
      ) {

        tierCounts[product.tier]++;

      }

    });


    console.log(
      "📊 TSEC Product tiers:",
      tierCounts
    );


    // =====================================================
    // INITIALIZE
    // =====================================================

    initializeSearch();

    initializeCategoryFilters();

    initializeTierFilters();

    applyFilters();


  } catch (error) {

    console.error(
      "❌ TSEC Resources Engine failed to load resources:",
      error
    );


    const container =
      document.getElementById(
        "resourcesContainer"
      );


    if (container) {

      container.innerHTML = `
        <div style="
          padding:40px;
          text-align:center;
          color:#a0aec0;
        ">

          <h3 style="
            color:#fff;
            margin-bottom:10px;
          ">
            Resources temporarily unavailable
          </h3>

          <p>
            We were unable to load the TSEC resource catalog.
            Please refresh the page and try again.
          </p>

        </div>
      `;

    }

  }

}

// =========================================================
// INITIALIZE
// =========================================================

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    loadProducts
  );

} else {

  loadProducts();

}
