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
// Temporary local data
// Later this can move to products.json
// =========================================================

const TSEC_PRODUCTS = [

    {
        id: "ai-governance-professional",
        category: "ai-governance",
        title: "AI Governance Professional Pack™",
        description:
        "Build, govern, and assure responsible AI systems with practical governance frameworks, assessments, and implementation resources.",
        tier: "pro",
        image:
        "assets/products/ai-governance-box.webp"
    },


    {
        id: "soc2-readiness-pack",
        category: "compliance",
        title: "SOC 2 Readiness Pack™",
        description:
        "Prepare your organization for SOC 2 compliance with readiness assessments, control mapping, evidence collection, and audit preparation resources.",
        tier: "pro",
        image:
        "assets/products/soc2-box.webp"
    },


    {
        id: "iso27001-implementation-pack",
        category: "compliance",
        title: "ISO 27001 Implementation Pack™",
        description:
        "Implement an Information Security Management System with structured templates, controls, policies, and implementation guidance.",
        tier: "pro",
        image:
        "assets/products/iso27001-box.webp"
    },


    {
        id: "nydfs-cybersecurity-pack",
        category: "compliance",
        title: "NYDFS Cybersecurity Regulation Pack™",
        description:
        "Support financial organizations with cybersecurity governance, regulatory readiness, and compliance documentation.",
        tier: "pro",
        image:
        "assets/products/nydfs-box.webp"
    },


    {
        id: "cobit-2019-governance-pack",
        category: "risk-management",
        title: "COBIT 2019 Governance Pack™",
        description:
        "Strengthen enterprise IT governance with governance objectives, assessments, and strategic alignment resources.",
        tier: "pro",
        image:
        "assets/products/cobit-box.webp"
    },


    {
        id: "nist-csf-pack",
        category: "risk-management",
        title: "NIST Cybersecurity Framework Pack™",
        description:
        "Manage cybersecurity risk using the Identify, Protect, Detect, Respond, and Recover lifecycle.",
        tier: "pro",
        image:
        "assets/products/nist-csf-box.webp"
    },


    {
        id: "pci-dss-v4-pack",
        category: "compliance",
        title: "PCI DSS v4.0 Compliance Pack™",
        description:
        "Secure payment environments with compliance guidance, controls, and assessment preparation resources.",
        tier: "pro",
        image:
        "assets/products/pci-dss-box.webp"
    },


    {
        id: "hipaa-security-pack",
        category: "compliance",
        title: "HIPAA Security & Privacy Pack™",
        description:
        "Protect healthcare information with security controls, privacy practices, and compliance resources.",
        tier: "pro",
        image:
        "assets/products/hipaa-box.webp"
    },


    {
        id: "hitrust-csf-pack",
        category: "compliance",
        title: "HITRUST CSF Pack™",
        description:
        "Prepare for healthcare assurance requirements with structured compliance resources.",
        tier: "pro",
        image:
        "assets/products/hitrust-box.webp"
    },


    {
        id: "iso42001-ai-management-pack",
        category: "ai-governance",
        title: "ISO/IEC 42001 AI Management Pack™",
        description:
        "Build an Artificial Intelligence Management System aligned with emerging AI governance standards.",
        tier: "pro",
        image:
        "assets/products/iso42001-box.webp"
    },


    {
        id: "iso22301-business-continuity-pack",
        category: "risk-management",
        title: "ISO 22301 Business Continuity Pack™",
        description:
        "Develop business continuity capabilities with structured planning and resilience resources.",
        tier: "pro",
        image:
        "assets/products/iso22301-box.webp"
    },


    {
        id: "nist-80053-security-controls-pack",
        category: "risk-management",
        title: "NIST SP 800-53 Security Controls Pack™",
        description:
        "Implement security and privacy controls using a comprehensive control framework.",
        tier: "pro",
        image:
        "assets/products/nist80053-box.webp"
    }

];

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
// Render Card
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

