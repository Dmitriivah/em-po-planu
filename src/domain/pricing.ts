export type PackagePrice = {
  amount: number;
  priceKopecks: number;
  unit: "g" | "ml" | "pcs";
};

export type CostEstimate = {
  packagesToBuy: number;
  amountToBuy: number;
  usedCostKopecks: number;
  purchaseCostKopecks: number;
  coverage: "estimated";
};

export function calculatePackageCost(
  requiredAmount: number,
  availableAmount: number,
  pack: PackagePrice,
): CostEstimate {
  if (!Number.isFinite(requiredAmount) || requiredAmount < 0) throw new Error("Необходимое количество должно быть неотрицательным.");
  if (!Number.isFinite(availableAmount) || availableAmount < 0) throw new Error("Домашний запас должен быть неотрицательным.");
  if (!Number.isFinite(pack.amount) || pack.amount <= 0) throw new Error("Размер упаковки должен быть больше нуля.");
  if (!Number.isSafeInteger(pack.priceKopecks) || pack.priceKopecks < 0) throw new Error("Цена должна быть задана целым числом копеек.");
  const amountToBuy = Math.max(0, requiredAmount - availableAmount);
  const packagesToBuy = Math.ceil(amountToBuy / pack.amount);
  return {
    packagesToBuy,
    amountToBuy: packagesToBuy * pack.amount,
    usedCostKopecks: Math.round((requiredAmount / pack.amount) * pack.priceKopecks),
    purchaseCostKopecks: packagesToBuy * pack.priceKopecks,
    coverage: "estimated",
  };
}
