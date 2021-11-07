import { BN } from "@project-serum/anchor";

const SOL_DECIMALS = 9
const LAMPORTS_PER_SOL = 10 ** SOL_DECIMALS

export const withDecimalPoint = (bn: BN, decimals: number): string => {
  const s = bn.toString().padStart(decimals + 1, '0')
  const l = s.length
  return s.slice(0, l - decimals) + "." + s.slice(-decimals)
}

export const tokenBalanceToNumber = (bn: BN, decimals: number): number =>
  Number(withDecimalPoint(bn, decimals))

export const lamportsToSolNumber = (bn: BN): number =>
  tokenBalanceToNumber(bn, SOL_DECIMALS)

export const solToLamportsBN = (amountSol: number): BN =>
  new BN(LAMPORTS_PER_SOL).muln(amountSol)
