/** Whole rupees in Indian grouping: 112100 -> "₹1,12,100". */
export const inr = (rupees: number): string => `₹${new Intl.NumberFormat('en-IN').format(rupees)}`;
