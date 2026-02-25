/**
 * Subscription Plans — Single Source of Truth
 * If you change the price, change it HERE only.
 */

export const PLANS = {
    trial: {
        name: "Launch Trial",
        durationDays: 7,
        price: 0,
        features: [
            "Inbound & Outbound call monitoring",
            "AI Agent Control Panel",
            "AI Agent Campaigns",
            "Personalised Calls",
            "Booking System",
            "CRM with Lead Funnel",
        ],
    },
    growth: {
        name: "Growth Plan",
        price: 3499,           // INR display price
        priceInPaise: 349900,  // Razorpay uses paise (multiply by 100)
        features: [
            "Inbound & Outbound call monitoring",
            "AI Agent Control Panel",
            "AI Agent Campaigns",
            "Personalised Calls",
            "Call Recordings",
            "Unlimited CRM",
            "Lead Pipeline Management",
            "Booking System",
        ],
    },
};
