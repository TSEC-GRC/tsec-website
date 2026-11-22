/**
 * TSEC — Private Product Catalog
 * Backend-only catalog for payment validation,
 * Paddle fulfillment and PayPal fulfillment.
 *
 * IMPORTANT:
 * - Do NOT expose this file to the frontend.
 * - Do NOT store secrets here.
 * - Backend prices are authoritative.
 * - Add products only after their private Blob ZIP is ready.
 */

export const TSEC_PRODUCTS = {

    "soc2-professional-pack": {
        productId: "soc2-professional-pack",
        productName: "SOC 2 Professional Pack\u2122",
        amount: "499.00",
        currency: "USD",

        // Historical Paddle configuration — preserve
        paddleProductId: "pro_01m3meafsc92fb5t6xksw9h0pp",
        paddlePriceId: "pri_01m3mextwkdpbymxpm5b7669sq",

        blobKey: "soc2/SOC2_Professional_Pack.zip",
        downloadFilename: "SOC2_Professional_Pack.zip"
    },

    "iso27001-professional-pack": {
        productId: "iso27001-professional-pack",
        productName: "ISO 27001 Professional Pack\u2122",
        amount: "549.00",
        currency: "USD",
        blobKey: "iso27001/ISO27001_Professional_Pack.zip",
        downloadFilename: "ISO27001_Professional_Pack.zip"
    },

    "nydfs-professional-pack": {
        productId: "nydfs-professional-pack",
        productName: "NYDFS Cybersecurity Professional Pack\u2122",
        amount: "499.00",
        currency: "USD",
        blobKey: "nydfs/NYDFS_Part_500_Professional_Pack.zip",
        downloadFilename: "NYDFS_Part_500_Professional_Pack.zip"
    },

    "nist-csf-professional-pack": {
        productId: "nist-csf-professional-pack",
        productName: "NIST CSF Professional Pack\u2122",
        amount: "449.00",
        currency: "USD",
        blobKey: "nist-csf/NIST_CSF_2.0_Professional_Pack.zip",
        downloadFilename: "NIST_CSF_2.0_Professional_Pack.zip"
    },

    "pci-dss-professional-pack": {
        productId: "pci-dss-professional-pack",
        productName: "PCI DSS Professional Pack\u2122",
        amount: "549.00",
        currency: "USD",
        blobKey: "pci-dss/PCI_DSS_Professional_Pack.zip",
        downloadFilename: "PCI_DSS_Professional_Pack.zip"
    },

    "hipaa-security-professional-pack": {
        productId: "hipaa-security-professional-pack",
        productName: "HIPAA Security Professional Pack\u2122",
        amount: "449.00",
        currency: "USD",
        blobKey: "hipaa/HIPAA_Security_Professional_Pack.zip",
        downloadFilename: "HIPAA_Security_Professional_Pack.zip"
    },

    "hitrust-professional-pack": {
        productId: "hitrust-professional-pack",
        productName: "HITRUST Professional Pack\u2122",
        amount: "599.00",
        currency: "USD",
        blobKey: "hitrust/HITRUST_Professional_Pack.zip",
        downloadFilename: "HITRUST_Professional_Pack.zip"
    },

    "iso42001-professional-pack": {
        productId: "iso42001-professional-pack",
        productName: "ISO 42001 Professional Pack\u2122",
        amount: "549.00",
        currency: "USD",
        blobKey: "iso42001/ISO_42001_Professional_Pack.zip",
        downloadFilename: "ISO_42001_Professional_Pack.zip"
    },

    "iso22301-professional-pack": {
        productId: "iso22301-professional-pack",
        productName: "ISO 22301 Professional Pack\u2122",
        amount: "449.00",
        currency: "USD",
        blobKey: "iso22301/ISO_22301_Professional_Pack.zip",
        downloadFilename: "ISO_22301_Professional_Pack.zip"
    }

};


/**
 * Find a product by Paddle Price ID.
 */
export function getProductByPriceId(priceId) {
    return Object.values(TSEC_PRODUCTS).find(
        product => product.paddlePriceId === priceId
    ) || null;
}


/**
 * Find a product by internal TSEC product ID.
 */
export function getProductById(productId) {
    return TSEC_PRODUCTS[productId] || null;
}
