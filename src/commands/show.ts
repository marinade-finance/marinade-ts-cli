import { web3, Provider, Program, Idl, BN } from "@project-serum/anchor";
import { Token, TOKEN_PROGRAM_ID, MintInfo, AccountInfo as TokenAccountInfo } from "@solana/spl-token";
import * as marinadeIdl from "../marinade-idl.json";
import { lamportsToSolBN, solToLamports, tokenBalanceToNumber } from "../util/conversion";
import { mSolPrice, unstake_now_fee_bp } from "../util/stateFunctions";

export async function show(): Promise<void> {

  const marinadeProgramId = new web3.PublicKey("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD")

  process.env.ANCHOR_PROVIDER_URL = "http://api.mainnet-beta.solana.com"
  const anchorProvider = Provider.env()
  //new Provider(connection, wallet, Provider.defaultOptions());

  const program = new Program(
    marinadeIdl as Idl,
    marinadeProgramId,
    anchorProvider,
  );

  const marinadeStateAddress = new web3.PublicKey("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC")

  let state: any = await program.account.state.fetch(marinadeStateAddress)
  console.log(state)

  console.log("Marinade.Finance ProgramId", marinadeProgramId.toBase58())
  console.log("Marinade.Finance state", marinadeStateAddress.toBase58())
  console.log()

  console.log("mSOL mint", state.msolMint.toBase58())
  const mSolMintClient = new Token(anchorProvider.connection, state.msolMint, TOKEN_PROGRAM_ID, web3.Keypair.generate());
  const mSolMintInfo = await mSolMintClient.getMintInfo();
  console.log("mSOL supply", tokenBalanceToNumber(mSolMintInfo.supply, mSolMintInfo.decimals))
  console.log()

  console.log("Treasury mSOL account", state.treasuryMsolAccount.toBase58())
  console.log("Rewards commission", state.rewardFee.basisPoints / 100, "%")
  console.log("Stake Account Count", state.stakeSystem.stakeList.count)
  console.log("Min Stake Amounts", lamportsToSolBN(state.stakeSystem.minStake))
  console.log()

  const msolPrice = mSolPrice(state);
  console.log("mSol Price", msolPrice)
  console.log()

  console.log("--- mSOL-SOL swap pool")
  console.log("LP Mint", state.liqPool.lpMint.toBase58())
  const lpMintClient = new Token(anchorProvider.connection, state.liqPool.lpMint, TOKEN_PROGRAM_ID, web3.Keypair.generate());
  const lpMintInfo = await lpMintClient.getMintInfo();
  console.log("  LP supply: ", tokenBalanceToNumber(lpMintInfo.supply, lpMintInfo.decimals))

  const [solLeg, solLegBump] = await web3.PublicKey.findProgramAddress([marinadeStateAddress.toBuffer(), Buffer.from("liq_sol")], marinadeProgramId)
  console.log("  SOL leg", solLeg.toBase58())
  const solLegBalance = new BN(await anchorProvider.connection.getBalance(solLeg)).sub(state.rentExemptForTokenAcc)
  console.log("  SOL leg Balance", lamportsToSolBN(solLegBalance))

  console.log("  mSOL leg", state.liqPool.msolLeg.toBase58())
  const mSolLegInfo = await mSolMintClient.getAccountInfo(state.liqPool.msolLeg);
  const mSolLegBalance = mSolLegInfo.amount
  console.log("  mSOL leg Balance", lamportsToSolBN(mSolLegBalance))
  const totalLiqPoolValue = solLegBalance.add(mSolLegBalance.muln(msolPrice))

  console.log("  Total Liq pool value (SOL) ", lamportsToSolBN(totalLiqPoolValue))
  // LPPrice = total_value_in_the_liq_pool / lp_supply
  const LPPrice = totalLiqPoolValue.mul(new BN(10 ** lpMintInfo.decimals)).div(lpMintInfo.supply)
  console.log("  mSOL-SOL-LP price (SOL)", lamportsToSolBN(LPPrice))

  console.log("  Liquidity Target: ", lamportsToSolBN(state.liqPool.lpLiquidityTarget))
  // compute the fee to unstake-now! and get 1 SOL
  console.log(`  Current-fee: ${unstake_now_fee_bp(state, mSolLegBalance, solToLamports(1)) / 100}%`)
  console.log(`  Min-Max-Fee: ${state.liqPool.lpMinFee.basisPoints / 100}% to ${state.liqPool.lpMaxFee.basisPoints / 100}%`)
  const testAmount = 1000
  console.log(`  fee to unstake-now! ${testAmount} SOL: ${unstake_now_fee_bp(state, mSolLegBalance, solToLamports(testAmount)) / 100}%`)
  console.log()

  console.log("--- TVL")
  const tvlStaked = Math.round(tokenBalanceToNumber(mSolMintInfo.supply, mSolMintInfo.decimals) * msolPrice)
  console.log("  Total Staked Value (SOL) ", tvlStaked.toLocaleString())
  const tvlLiquidity = Math.round(lamportsToSolBN(totalLiqPoolValue))
  console.log("  Total Liquidity-Pool (SOL) ", tvlLiquidity.toLocaleString())
  console.log("  TVL (SOL) ", (tvlStaked + tvlLiquidity).toLocaleString())

}