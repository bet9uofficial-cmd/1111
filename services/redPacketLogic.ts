/**
 * Simulates the "Red Packet Algorithm" (Doubly Random)
 * ensuring everyone gets at least 0.01 and the total sums up correctly.
 */
export const generateRedPacketResults = (totalAmount: number, totalShares: number): number[] => {
  let remainAmount = totalAmount;
  let remainShares = totalShares;
  const results: number[] = [];

  for (let i = 0; i < totalShares - 1; i++) {
    // Max safe amount is (remaining money / remaining people) * 2
    // This ensures fair randomness while guaranteeing enough money for others.
    const max = (remainAmount / remainShares) * 2;
    let money = Math.random() * max;
    
    // Ensure minimum 0.01
    money = Math.max(0.01, money);
    money = Math.floor(money * 100) / 100;
    
    results.push(money);
    remainAmount -= money;
    remainShares--;
  }

  // The last person gets the remainder
  results.push(Math.round(remainAmount * 100) / 100);

  return results;
};
