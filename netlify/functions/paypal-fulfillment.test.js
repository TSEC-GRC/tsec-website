import test from "node:test";
import assert from "node:assert/strict";

import {
    validateCompletedCapture,
    getBuyerEmail
} from "../lib/paypal-fulfillment.js";

const PRODUCT = {
    currency: "USD",
    amount: "499.00"
};

const VALID_CAPTURE = {
    id: "CAPTURE123456",
    status: "COMPLETED",
    amount: {
        currency_code: "USD",
        value: "499.00"
    }
};

// validateCompletedCapture

test("accepts a valid completed capture", () => {
    assert.equal(
        validateCompletedCapture(VALID_CAPTURE, PRODUCT),
        true
    );
});

test("rejects a null capture", () => {
    assert.equal(validateCompletedCapture(null, PRODUCT), false);
});

test("rejects a missing product", () => {
    assert.equal(validateCompletedCapture(VALID_CAPTURE, null), false);
});

test("rejects a missing capture ID", () => {
    const capture = { ...VALID_CAPTURE, id: undefined };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

test("rejects a capture ID shorter than 10 characters", () => {
    const capture = { ...VALID_CAPTURE, id: "SHORT123" };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

test("rejects a capture ID longer than 64 characters", () => {
    const capture = { ...VALID_CAPTURE, id: "A".repeat(65) };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

test("rejects a capture ID containing invalid characters", () => {
    const capture = { ...VALID_CAPTURE, id: "CAPTURE-12345" };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

test("accepts an alphanumeric capture ID regardless of letter case", () => {
    const capture = { ...VALID_CAPTURE, id: "capture123456" };
    assert.equal(validateCompletedCapture(capture, PRODUCT), true);
});

test("rejects a capture whose status is not COMPLETED", () => {
    const capture = { ...VALID_CAPTURE, status: "PENDING" };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

test("rejects a capture with a different currency", () => {
    const capture = {
        ...VALID_CAPTURE,
        amount: { ...VALID_CAPTURE.amount, currency_code: "EUR" }
    };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

test("rejects a capture with a different amount", () => {
    const capture = {
        ...VALID_CAPTURE,
        amount: { ...VALID_CAPTURE.amount, value: "499.01" }
    };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

test("rejects a numeric amount when the catalog amount is a string", () => {
    const capture = {
        ...VALID_CAPTURE,
        amount: { ...VALID_CAPTURE.amount, value: 499 }
    };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

test("rejects a capture with a missing amount object", () => {
    const capture = { ...VALID_CAPTURE, amount: undefined };
    assert.equal(validateCompletedCapture(capture, PRODUCT), false);
});

// getBuyerEmail

test("extracts and normalizes the payer email", () => {
    assert.equal(
        getBuyerEmail({
            payer: { email_address: "  BUYER@EXAMPLE.COM  " }
        }),
        "buyer@example.com"
    );
});

test("extracts the PayPal payment source email", () => {
    assert.equal(
        getBuyerEmail({
            payment_source: {
                paypal: { email_address: "PAYPAL@EXAMPLE.COM" }
            }
        }),
        "paypal@example.com"
    );
});

test("extracts the Venmo payment source email", () => {
    assert.equal(
        getBuyerEmail({
            payment_source: {
                venmo: { email_address: "VENMO@EXAMPLE.COM" }
            }
        }),
        "venmo@example.com"
    );
});

test("prioritizes payer email over PayPal and Venmo emails", () => {
    assert.equal(
        getBuyerEmail({
            payer: { email_address: "payer@example.com" },
            payment_source: {
                paypal: { email_address: "paypal@example.com" },
                venmo: { email_address: "venmo@example.com" }
            }
        }),
        "payer@example.com"
    );
});

test("falls back to PayPal when payer email is invalid", () => {
    assert.equal(
        getBuyerEmail({
            payer: { email_address: "invalid-email" },
            payment_source: {
                paypal: { email_address: "paypal@example.com" },
                venmo: { email_address: "venmo@example.com" }
            }
        }),
        "paypal@example.com"
    );
});

test("falls back to Venmo when payer and PayPal emails are invalid", () => {
    assert.equal(
        getBuyerEmail({
            payer: { email_address: "invalid" },
            payment_source: {
                paypal: { email_address: "also-invalid" },
                venmo: { email_address: "venmo@example.com" }
            }
        }),
        "venmo@example.com"
    );
});

test("returns null when all candidate emails are invalid", () => {
    assert.equal(
        getBuyerEmail({
            payer: { email_address: "invalid" },
            payment_source: {
                paypal: { email_address: "invalid" },
                venmo: { email_address: "invalid" }
            }
        }),
        null
    );
});

test("returns null when the order is null", () => {
    assert.equal(getBuyerEmail(null), null);
});

test("returns null when the order has no email information", () => {
    assert.equal(getBuyerEmail({}), null);
});

test("ignores non-string email candidates", () => {
    assert.equal(
        getBuyerEmail({
            payer: { email_address: 123 },
            payment_source: {
                paypal: { email_address: false },
                venmo: { email_address: "valid@example.com" }
            }
        }),
        "valid@example.com"
    );
});
