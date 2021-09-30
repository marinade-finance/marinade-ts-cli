"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lamportsToSolBN = exports.tokenBalanceToNumber = exports.withDecimalPoint = void 0;
const LAMPORTS_PER_SOL = 1e9;
function withDecimalPoint(bn, decimals) {
    const s = bn.toString().padStart(decimals + 1, '0');
    const l = s.length;
    return s.slice(0, l - decimals) + "." + s.slice(-decimals);
}
exports.withDecimalPoint = withDecimalPoint;
function tokenBalanceToNumber(bn, decimals) {
    return Number(withDecimalPoint(bn, decimals));
}
exports.tokenBalanceToNumber = tokenBalanceToNumber;
function lamportsToSolBN(bn) {
    return tokenBalanceToNumber(bn, 9);
}
exports.lamportsToSolBN = lamportsToSolBN;
//# sourceMappingURL=conversion.js.map