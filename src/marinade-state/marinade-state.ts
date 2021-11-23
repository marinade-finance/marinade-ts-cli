import { BN, Provider, web3 } from '@project-serum/anchor'
import { Marinade } from '../marinade'
import { MarinadeMint } from '../marinade-mint/marinade-mint'
import * as StateHelper from '../util/state-helpers'
import {
  ProgramDerivedAddressSeed,
  MarinadeStateResponse,
  MarinadeStakeProgramResponse
} from './marinade-state.types'
import {STAKE_PROGRAM_ID} from "../util/anchor";
import Delegation = MarinadeStakeProgramResponse.Delegation;
import AccountList = MarinadeStateResponse.AccountList;
import {Buffer} from "buffer";
import {AccountInfo, ParsedAccountData, PublicKey} from "@solana/web3.js";
import {deserializeUnchecked} from "borsh";
import {
  List_StakeDiscriminator_StakeRecord_u32_,
  List_ValidatorRecordDiscriminator_ValidatorRecord_u32_,
  MARINADE_BORSH_SCHEMA, StakeRecord, ValidatorRecord
} from "./marinade_finance_schema";

export class MarinadeState {
  // @todo rework args
  private constructor (
    private readonly marinade: Marinade,
    private readonly anchorProvider: Provider,
    public readonly state: MarinadeStateResponse,
  ) { }

  static async fetch (marinade: Marinade) { // @todo rework args
    const { marinadeProgram, config } = marinade
    const state = await marinadeProgram.account.state.fetch(config.marinadeStateAddress) as MarinadeStateResponse
    return new MarinadeState(marinade, marinade.anchorProvider, state)
  }

  reserveAddress = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.RESERVE_ACCOUNT)
  epochInfo = async () => this.anchorProvider.connection.getEpochInfo()
  validatorRecordList = async () : Promise<ValidatorRecord[]> => {
    const validatorList = this.state.validatorSystem.validatorList;
    const validatorRecords : AccountInfo<Buffer>[] = await this.anchorProvider.connection.getMultipleAccountsInfo([validatorList.account]) as AccountInfo<Buffer>[];

    const validatorRecordData = validatorRecords[0]?.data;
    const validatorAccountLists = new Array();
    for (let index = 0; index < validatorList.count; index++) {
      const start = 8 + index * validatorList.itemSize;

      const validatorRecord : ValidatorRecord = deserializeUnchecked(MARINADE_BORSH_SCHEMA, ValidatorRecord, validatorRecordData?.slice(start, start + validatorList.itemSize) as Buffer);
      validatorAccountLists.push(validatorRecord);
    }

    return validatorAccountLists;
  }

  stakeRecordList = async () : Promise<StakeRecord[]> => {
    const stakeList = this.state.stakeSystem.stakeList;
    const accountInfos : AccountInfo<Buffer>[] = await this.anchorProvider.connection.getMultipleAccountsInfo([stakeList.account]) as AccountInfo<Buffer>[];

    const stakeRecordList = new Array<StakeRecord>();
    accountInfos.forEach(accountInfo => {
      const stakeRecordData = accountInfo?.data;
      for (let index = 0; index < stakeList.count; index++) {
        const start = 8 + index * stakeList.itemSize;

        const stakeRecord : StakeRecord = deserializeUnchecked(MARINADE_BORSH_SCHEMA, StakeRecord, stakeRecordData?.slice(start, start + stakeList.itemSize) as Buffer);
        stakeRecordList.push(stakeRecord);
      }
    })

    return stakeRecordList;
  }

  stakeDelegationList = async () : Promise<Delegation[]> => {
    const stakeAccountInfos = await this.anchorProvider.connection.getParsedProgramAccounts(STAKE_PROGRAM_ID,
        {
          "filters": [
            {
              "dataSize": 200
            },
            {
              "memcmp": {
                "offset": 44,
                "bytes": "9eG63CdHjsfhHmobHgLtESGC8GabbmRcaSpHAZrtmhco"
              }
            }
          ]
        });
    return stakeAccountInfos
        .map(account => account.account.data as web3.ParsedAccountData)
        .filter(value => value.parsed.info.stake)
        .map(value => value.parsed.info.stake.delegation as Delegation)
  }

  mSolPrice: number = this.state.msolPrice.toNumber() / 0x1_0000_0000

  mSolMintAddress: web3.PublicKey = this.state.msolMint
  mSolMint = MarinadeMint.build(this.anchorProvider, this.mSolMintAddress)
  mSolMintAuthority = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.LIQ_POOL_MSOL_MINT_AUTHORITY)
  mSolLegAuthority = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.LIQ_POOL_MSOL_AUTHORITY)
  mSolLeg = this.state.liqPool.msolLeg

  lpMintAddress: web3.PublicKey = this.state.liqPool.lpMint
  lpMint = MarinadeMint.build(this.anchorProvider, this.lpMintAddress)
  lpMintAuthority = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.LIQ_POOL_MINT_AUTHORITY)

  solLeg = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.LIQ_POOL_SOL_ACCOUNT)

  private async findProgramDerivedAddress (seed: ProgramDerivedAddressSeed): Promise<web3.PublicKey> {
    const seeds = [this.marinade.config.marinadeStateAddress.toBuffer(), Buffer.from(seed)]
    const [result] = await web3.PublicKey.findProgramAddress(seeds, this.marinade.config.marinadeProgramId)
    return result
  }

  async unstakeNowFeeBp (lamportsToObtain: BN): Promise<number> {
    const mSolMintClient = this.mSolMint.mintClient()
    const mSolLegInfo = await mSolMintClient.getAccountInfo(this.mSolLeg)
    const lamportsAvailable = mSolLegInfo.amount

    return StateHelper.unstakeNowFeeBp(
      this.state.liqPool.lpMinFee.basisPoints,
      this.state.liqPool.lpMaxFee.basisPoints,
      this.state.liqPool.lpLiquidityTarget,
      lamportsAvailable,
      lamportsToObtain,
    )
  }

  treasuryMsolAccount: web3.PublicKey = this.state.treasuryMsolAccount

  /**
   * Commission in %
   */
  rewardsCommissionPercent: number = this.state.rewardFee.basisPoints / 100
}
