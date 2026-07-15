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

    const parts = email.split("@");

    const domain = parts.length > 1
        ? parts[1].toLowerCase()
        : "";

    return !this.config.blockedDomains.includes(domain);

    },

    // ===============================
    // Lead Management
    // ===============================

    saveLead(leadData) {

    console.log("Saving Lead...", leadData);


    let leads = JSON.parse(
        localStorage.getItem("tsecLeads")
    ) || [];


    leads.push(leadData);


    localStorage.setItem(
        "tsecLeads",
        JSON.stringify(leads)
    );


    console.log(
        "Lead saved successfully"
    );

},

submitLead() {


    const lead = {


        firstName:
        document.getElementById("leadFirstName").value,


        lastName:
        document.getElementById("leadLastName").value,


        company:
        document.getElementById("leadCompany").value,


        role:
        document.getElementById("leadRole").value,


        email:
        document.getElementById("leadEmail").value,


        resource:
        this.currentResource.title,


        tier:
        this.currentResource.tier,


        date:
        new Date().toISOString()


    };


    if(!this.validateBusinessEmail(lead.email)){

        alert(
        "Please use a corporate email address."
        );

        return;

    }


    this.saveLead(lead);


    this.closeLeadModal();


    this.processTier();


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

    console.log(
        "Downloading Free Resource:",
        this.currentResource
    );


    const link = document.createElement("a");

    link.href = this.currentResource.downloadPath;

    link.download = "";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

},

    // ===============================
    // PRO
    // ===============================

    checkout() {

    console.log(
        "PRO CHECKOUT REQUEST:",
        this.currentResource
    );

},

    // ===============================
// ENTERPRISE
// ===============================

requestAccess() {

    console.log(
        "ENTERPRISE REQUEST:",
        this.currentResource
    );

}

};   // <-- ESTE CIERRE FALTABA


// ======================================
// Start Engine
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    TSECEngine.init();

});
