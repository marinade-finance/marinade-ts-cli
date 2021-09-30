"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.show = void 0;
const anchor_1 = require("@project-serum/anchor");
const spl_token_1 = require("@solana/spl-token");
const marinadeIdl = __importStar(require("../marinade-idl.json"));
const conversion_1 = require("../util/conversion");
async function show() {
    const marinadeProgramId = new anchor_1.web3.PublicKey("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD");
    process.env.ANCHOR_PROVIDER_URL = "http://api.mainnet-beta.solana.com";
    const anchorProvider = anchor_1.Provider.env();
    //new Provider(connection, wallet, Provider.defaultOptions());
    const program = new anchor_1.Program(marinadeIdl, marinadeProgramId, anchorProvider);
    const marinadeStateAddress = new anchor_1.web3.PublicKey("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC");
    let state = await program.account.state.fetch(marinadeStateAddress);
    console.log(state);
    console.log("Marinade.Finance ProgramId", marinadeProgramId.toBase58());
    console.log("Marinade.Finance state", marinadeStateAddress.toBase58());
    console.log();
    console.log("mSOL mint", state.msolMint.toBase58());
    const mSolMintClient = new spl_token_1.Token(anchorProvider.connection, state.msolMint, spl_token_1.TOKEN_PROGRAM_ID, anchor_1.web3.Keypair.generate());
    const mSolMintInfo = await mSolMintClient.getMintInfo();
    console.log("mSOL supply", (0, conversion_1.tokenBalanceToNumber)(mSolMintInfo.supply, mSolMintInfo.decimals));
    console.log();
    console.log("Treasury mSOL account", state.treasuryMsolAccount.toBase58());
    console.log("Rewards commission", state.rewardFee.basisPoints / 100, "%");
    console.log("Stake Account Count", state.stakeSystem.stakeList.count);
    console.log("Min Stake Amounts", (0, conversion_1.lamportsToSolBN)(state.stakeSystem.minStake));
    console.log();
    const msolPrice = state.msolPrice.toNumber() / 4294967296;
    console.log("mSol Price", msolPrice);
    console.log();
    console.log("--- mSOL-SOL swap pool");
    console.log("LP Mint", state.liqPool.lpMint.toBase58());
    const lpMintClient = new spl_token_1.Token(anchorProvider.connection, state.liqPool.lpMint, spl_token_1.TOKEN_PROGRAM_ID, anchor_1.web3.Keypair.generate());
    const lpMintInfo = await lpMintClient.getMintInfo();
    console.log("  LP supply: ", (0, conversion_1.tokenBalanceToNumber)(lpMintInfo.supply, lpMintInfo.decimals));
    const [solLeg, solLegBump] = await anchor_1.web3.PublicKey.findProgramAddress([marinadeStateAddress.toBuffer(), Buffer.from("liq_sol")], marinadeProgramId);
    console.log("  SOL leg", solLeg.toBase58());
    const solLegBalance = new anchor_1.BN(await anchorProvider.connection.getBalance(solLeg)).sub(state.rentExemptForTokenAcc);
    console.log("  SOL leg Balance", (0, conversion_1.lamportsToSolBN)(solLegBalance));
    console.log("  mSOL leg", state.liqPool.msolLeg.toBase58());
    const mSolLegInfo = await mSolMintClient.getAccountInfo(state.liqPool.msolLeg);
    const mSolLegBalance = mSolLegInfo.amount;
    console.log("  mSOL leg Balance", (0, conversion_1.lamportsToSolBN)(mSolLegBalance));
    const totalLiqPoolValue = solLegBalance.add(mSolLegBalance.muln(msolPrice));
    console.log("  Total Liq pool value (SOL) ", (0, conversion_1.lamportsToSolBN)(totalLiqPoolValue));
    const LPPrice = totalLiqPoolValue.mul(new anchor_1.BN(10 ** lpMintInfo.decimals)).div(lpMintInfo.supply);
    console.log("  mSOL-SOL-LP price (SOL)", (0, conversion_1.lamportsToSolBN)(LPPrice));
}
exports.show = show;
//# sourceMappingURL=show.js.map