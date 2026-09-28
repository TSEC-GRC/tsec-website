/**
 * TSEC — Private Product Catalog
 * Backend-only catalog for Paddle fulfillment and secure downloads.
 *
 * IMPORTANT:
 * - Do NOT expose this file to the frontend.
 * - Do NOT store secrets here.
 * - Add new products only after their Paddle product/price
 *   and private Blob ZIP are ready.
 */

export const TSEC_PRODUCTS = {
    "soc2-professional-pack": {
        productId: "soc2-professional-pack",

        productName: "SOC 2 Professional Pack™",

        paddleProductId:
       "pro_01m3meafsc92fb5t6xksw9h0pp",

       paddlePriceId:
       "pri_01m3mextwkdpbymxpm5b7669sq",

        blobKey:
            "soc2/SOC2_Professional_Pack.zip",

        downloadFilename:
            "SOC2_Professional_Pack.zip"
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
