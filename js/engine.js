/*
==========================================================
 TSEC Engine v1.0
 Business & Lead Management Engine
==========================================================
*/

const TSECEngine = {

    // ===============================
    // Configuration
    // ===============================

    config: {

        blockedDomains: [
            "gmail.com",
            "hotmail.com",
            "outlook.com",
            "live.com",
            "icloud.com",
            "yahoo.com",
            "aol.com",
            "msn.com",
            "mail.com",
            "gmx.com",
            "proton.me",
            "protonmail.com"
        ]

    },

    // ===============================
    // Runtime
    // ===============================

    currentResource: null,

    // ===============================
    // Initialization
    // ===============================

    init() {

        console.log("✅ TSEC Engine Loaded");

    },

    // ===============================
    // Entry Point
    // ===============================

    download(resource) {

        this.currentResource = resource;

        console.log("Selected Resource:", resource);

        this.openLeadModal();

    },

    // ===============================
    // Lead Modal
    // ===============================

   openLeadModal() {

    const modal = document.getElementById("tsecLeadModal");

    if (!modal) {
        console.error("TSEC Lead Modal not found");
        return;
    }

    modal.style.display = "flex";

},

    closeLeadModal() {

    const modal = document.getElementById("tsecLeadModal");

    if(modal){
        modal.style.display="none";
    }

},

    // ===============================
    // Email Validation
    // ===============================

    validateBusinessEmail(email) {

        const domain = email.split("@")[1]?.toLowerCase();

        return !this.config.blockedDomains.includes(domain);

    },

    // ===============================
    // Lead Management
    // ===============================

    saveLead(leadData) {

        console.log("Saving Lead...", leadData);

    },

    // ===============================
    // Tier Controller
    // ===============================

    processTier() {

        if (!this.currentResource) return;

        switch (this.currentResource.tier) {

            case "free":
                this.downloadFree();
                break;

            case "pro":
                this.checkout();
                break;

            case "enterprise":
                this.requestAccess();
                break;

            default:
                console.warn("Unknown tier.");

        }

    },

    // ===============================
    // FREE
    // ===============================

    downloadFree() {

        console.log("Downloading Free Resource");

    },

    // ===============================
    // PRO
    // ===============================

    checkout() {

        console.log("Redirecting to Checkout");

    },

    // ===============================
    // ENTERPRISE
    // ===============================

    requestAccess() {

        console.log("Opening Enterprise Request");

    }

};

// ======================================
// Start Engine
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    TSECEngine.init();

});
