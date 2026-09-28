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
            "pro_01m2zw8nsgkxj3kzx2jptkmr3p",

        paddlePriceId:
            "pri_01m306t66hbgv4rn4zg3n7xqzr",

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
