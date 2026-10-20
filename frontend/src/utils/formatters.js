/**
 * Indian Numbering System Utility Functions (Lakhs and Crores)
 * Provides standard formatting for INR currency and volume counts across the dashboard.
 */

/**
 * Formats a number with Indian comma grouping (en-IN).
 * Example: 718661 -> "7,18,661", 1796297 -> "17,96,297"
 */
export function formatIndianNumberFull(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-IN");
}

/**
 * Formats an amount in Indian Rupees with full grouping.
 * Example: 26948250 -> "₹2,69,48,250"
 */
export function formatIndianCurrencyFull(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/**
 * Formats passenger or transaction counts into Lakhs / Crores.
 * Example:
 *  1796297 -> "17.96 Lakh"
 *  718661  -> "7.19 Lakh"
 *  45000   -> "45,000"
 */
export function formatIndianCount(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const val = Number(num);

  if (val >= 10000000) {
    return `${(val / 10000000).toFixed(decimals)} Cr`;
  } else if (val >= 100000) {
    return `${(val / 100000).toFixed(decimals)} Lakh`;
  }
  return val.toLocaleString("en-IN");
}

/**
 * Formats monetary amounts in INR into Crores or Lakhs.
 * Example:
 *  26948250 -> "₹2.69 Cr"
 *  6758130  -> "₹67.58 Lakh"
 *  1707525  -> "₹17.08 Lakh"
 *  50000    -> "₹50,000"
 */
export function formatIndianCurrency(amount, decimals = 2, preferUnit = null) {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
  const val = Number(amount);

  if (preferUnit === "lakh") {
    return `₹${(val / 100000).toFixed(decimals)} Lakh`;
  }
  if (preferUnit === "crore" || preferUnit === "cr") {
    return `₹${(val / 10000000).toFixed(decimals)} Cr`;
  }

  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(decimals)} Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(decimals)} Lakh`;
  }
  return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Formats Y-axis ticks for Revenue charts in Lakhs / Crores.
 * Example: 6000000 -> "₹60 Lakh", 10000000 -> "₹1 Cr"
 */
export function formatRevenueAxisTick(val) {
  const num = Number(val);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(1)} Cr`;
  } else if (num >= 100000) {
    return `₹${(num / 100000).toFixed(0)} Lakh`;
  }
  return `₹${num.toLocaleString("en-IN")}`;
}

/**
 * Formats Y-axis ticks for Passenger traffic charts.
 * Example: 75000 -> "75k" or "0.75 Lakh", 100000 -> "1 Lakh"
 */
export function formatPassengerAxisTick(val) {
  const num = Number(val);
  if (num >= 100000) {
    return `${(num / 100000).toFixed(1)} Lakh`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}k`;
  }
  return num.toLocaleString("en-IN");
}
