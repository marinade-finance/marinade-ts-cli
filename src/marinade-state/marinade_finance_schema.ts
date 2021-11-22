import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
export class Fee {
    basis_points: number;

    constructor({ basis_points, }: { basis_points: number, }) {
        this.basis_points = basis_points;
    }
}
export class LiqPool {
    lp_mint: Pubkey;
    lp_mint_authority_bump_seed: number;
    sol_leg_bump_seed: number;
    st_sol_leg_authority_bump_seed: number;
    st_sol_leg: Pubkey;
    lp_liquidity_target: BN;
    lp_max_fee: Fee;
    lp_min_fee: Fee;
    treasury_cut: Fee;
    lp_supply: BN;
    lended_from_sol_leg: BN;
    liquidity_sol_cap: BN;

    constructor({ lp_mint, lp_mint_authority_bump_seed, sol_leg_bump_seed, st_sol_leg_authority_bump_seed, st_sol_leg, lp_liquidity_target, lp_max_fee, lp_min_fee, treasury_cut, lp_supply, lended_from_sol_leg, liquidity_sol_cap, }: { lp_mint: Pubkey, lp_mint_authority_bump_seed: number, sol_leg_bump_seed: number, st_sol_leg_authority_bump_seed: number, st_sol_leg: Pubkey, lp_liquidity_target: BN, lp_max_fee: Fee, lp_min_fee: Fee, treasury_cut: Fee, lp_supply: BN, lended_from_sol_leg: BN, liquidity_sol_cap: BN, }) {
        this.lp_mint = lp_mint;
        this.lp_mint_authority_bump_seed = lp_mint_authority_bump_seed;
        this.sol_leg_bump_seed = sol_leg_bump_seed;
        this.st_sol_leg_authority_bump_seed = st_sol_leg_authority_bump_seed;
        this.st_sol_leg = st_sol_leg;
        this.lp_liquidity_target = lp_liquidity_target;
        this.lp_max_fee = lp_max_fee;
        this.lp_min_fee = lp_min_fee;
        this.treasury_cut = treasury_cut;
        this.lp_supply = lp_supply;
        this.lended_from_sol_leg = lended_from_sol_leg;
        this.liquidity_sol_cap = liquidity_sol_cap;
    }
}
export class List_StakeDiscriminator_StakeRecord_u32_ {
    account: Pubkey;
    item_size: number;
    count: number;
    new_account: Pubkey;
    copied_count: number;

    constructor({ account, item_size, count, new_account, copied_count, }: { account: Pubkey, item_size: number, count: number, new_account: Pubkey, copied_count: number, }) {
        this.account = account;
        this.item_size = item_size;
        this.count = count;
        this.new_account = new_account;
        this.copied_count = copied_count;
    }
}
export class List_ValidatorRecordDiscriminator_ValidatorRecord_u32_ {
    account: Pubkey;
    item_size: number;
    count: number;
    new_account: Pubkey;
    copied_count: number;

    constructor({ account, item_size, count, new_account, copied_count, }: { account: Pubkey, item_size: number, count: number, new_account: Pubkey, copied_count: number, }) {
        this.account = account;
        this.item_size = item_size;
        this.count = count;
        this.new_account = new_account;
        this.copied_count = copied_count;
    }
}
export class Pubkey {
    value: PublicKey

    constructor({ elem0, }: { elem0: Buffer, }) {
        this.value = new PublicKey(elem0)
    }
}
export class StakeSystem {
    stake_list: List_StakeDiscriminator_StakeRecord_u32_;
    total_cooling_down: BN;
    stake_deposit_bump_seed: number;
    stake_withdraw_bump_seed: number;
    slots_for_stake_delta: BN;
    last_stake_delta_epoch: BN;
    min_stake: BN;
    extra_stake_delta_runs: number;

    constructor({ stake_list, total_cooling_down, stake_deposit_bump_seed, stake_withdraw_bump_seed, slots_for_stake_delta, last_stake_delta_epoch, min_stake, extra_stake_delta_runs, }: { stake_list: List_StakeDiscriminator_StakeRecord_u32_, total_cooling_down: BN, stake_deposit_bump_seed: number, stake_withdraw_bump_seed: number, slots_for_stake_delta: BN, last_stake_delta_epoch: BN, min_stake: BN, extra_stake_delta_runs: number, }) {
        this.stake_list = stake_list;
        this.total_cooling_down = total_cooling_down;
        this.stake_deposit_bump_seed = stake_deposit_bump_seed;
        this.stake_withdraw_bump_seed = stake_withdraw_bump_seed;
        this.slots_for_stake_delta = slots_for_stake_delta;
        this.last_stake_delta_epoch = last_stake_delta_epoch;
        this.min_stake = min_stake;
        this.extra_stake_delta_runs = extra_stake_delta_runs;
    }
}
export class State {
    st_sol_mint: Pubkey;
    admin_authority: Pubkey;
    operational_sol_account: Pubkey;
    treasury_msol_account: Pubkey;
    reserve_bump_seed: number;
    st_mint_authority_bump_seed: number;
    rent_exempt_for_token_acc: BN;
    reward_fee: Fee;
    stake_system: StakeSystem;
    validator_system: ValidatorSystem;
    liq_pool: LiqPool;
    available_reserve_balance: BN;
    st_sol_supply: BN;
    st_sol_price: BN;
    circulating_ticket_count: BN;
    circulating_ticket_balance: BN;
    lended_from_reserve: BN;
    min_deposit: BN;
    min_withdraw: BN;
    staking_sol_cap: BN;

    constructor({ st_sol_mint, admin_authority, operational_sol_account, treasury_msol_account, reserve_bump_seed, st_mint_authority_bump_seed, rent_exempt_for_token_acc, reward_fee, stake_system, validator_system, liq_pool, available_reserve_balance, st_sol_supply, st_sol_price, circulating_ticket_count, circulating_ticket_balance, lended_from_reserve, min_deposit, min_withdraw, staking_sol_cap, }: { st_sol_mint: Pubkey, admin_authority: Pubkey, operational_sol_account: Pubkey, treasury_msol_account: Pubkey, reserve_bump_seed: number, st_mint_authority_bump_seed: number, rent_exempt_for_token_acc: BN, reward_fee: Fee, stake_system: StakeSystem, validator_system: ValidatorSystem, liq_pool: LiqPool, available_reserve_balance: BN, st_sol_supply: BN, st_sol_price: BN, circulating_ticket_count: BN, circulating_ticket_balance: BN, lended_from_reserve: BN, min_deposit: BN, min_withdraw: BN, staking_sol_cap: BN, }) {
        this.st_sol_mint = st_sol_mint;
        this.admin_authority = admin_authority;
        this.operational_sol_account = operational_sol_account;
        this.treasury_msol_account = treasury_msol_account;
        this.reserve_bump_seed = reserve_bump_seed;
        this.st_mint_authority_bump_seed = st_mint_authority_bump_seed;
        this.rent_exempt_for_token_acc = rent_exempt_for_token_acc;
        this.reward_fee = reward_fee;
        this.stake_system = stake_system;
        this.validator_system = validator_system;
        this.liq_pool = liq_pool;
        this.available_reserve_balance = available_reserve_balance;
        this.st_sol_supply = st_sol_supply;
        this.st_sol_price = st_sol_price;
        this.circulating_ticket_count = circulating_ticket_count;
        this.circulating_ticket_balance = circulating_ticket_balance;
        this.lended_from_reserve = lended_from_reserve;
        this.min_deposit = min_deposit;
        this.min_withdraw = min_withdraw;
        this.staking_sol_cap = staking_sol_cap;
    }
}
export class TicketAccountData {
    state_address: Pubkey;
    beneficiary: Pubkey;
    lamports_amount: BN;
    created_epoch: BN;

    constructor({ state_address, beneficiary, lamports_amount, created_epoch, }: { state_address: Pubkey, beneficiary: Pubkey, lamports_amount: BN, created_epoch: BN, }) {
        this.state_address = state_address;
        this.beneficiary = beneficiary;
        this.lamports_amount = lamports_amount;
        this.created_epoch = created_epoch;
    }
}
export class ValidatorRecord {
    validator_account: Pubkey;
    active_balance: BN;
    score: number;
    last_stake_delta_epoch: BN;
    duplication_flag_bump_seed: number;

    constructor({ validator_account, active_balance, score, last_stake_delta_epoch, duplication_flag_bump_seed, }: { validator_account: Pubkey, active_balance: BN, score: number, last_stake_delta_epoch: BN, duplication_flag_bump_seed: number, }) {
        this.validator_account = validator_account;
        this.active_balance = active_balance;
        this.score = score;
        this.last_stake_delta_epoch = last_stake_delta_epoch;
        this.duplication_flag_bump_seed = duplication_flag_bump_seed;
    }
}
export class ValidatorSystem {
    validator_list: List_ValidatorRecordDiscriminator_ValidatorRecord_u32_;
    manager_authority: Pubkey;
    total_validator_score: number;
    total_active_balance: BN;
    auto_add_validator_enabled: number;

    constructor({ validator_list, manager_authority, total_validator_score, total_active_balance, auto_add_validator_enabled, }: { validator_list: List_ValidatorRecordDiscriminator_ValidatorRecord_u32_, manager_authority: Pubkey, total_validator_score: number, total_active_balance: BN, auto_add_validator_enabled: number, }) {
        this.validator_list = validator_list;
        this.manager_authority = manager_authority;
        this.total_validator_score = total_validator_score;
        this.total_active_balance = total_active_balance;
        this.auto_add_validator_enabled = auto_add_validator_enabled;
    }
}
export const MARINADE_BORSH_SCHEMA = new Map<Function, any>([
    [Fee, {
        "kind": "struct",
        "fields": [
            ["basis_points", "u32"],
        ]
    }],
    [LiqPool, {
        "kind": "struct",
        "fields": [
            ["lp_mint", Pubkey],
            ["lp_mint_authority_bump_seed", "u8"],
            ["sol_leg_bump_seed", "u8"],
            ["st_sol_leg_authority_bump_seed", "u8"],
            ["st_sol_leg", Pubkey],
            ["lp_liquidity_target", "u64"],
            ["lp_max_fee", Fee],
            ["lp_min_fee", Fee],
            ["treasury_cut", Fee],
            ["lp_supply", "u64"],
            ["lended_from_sol_leg", "u64"],
            ["liquidity_sol_cap", "u64"],
        ]
    }],
    [List_StakeDiscriminator_StakeRecord_u32_, {
        "kind": "struct",
        "fields": [
            ["account", Pubkey],
            ["item_size", "u32"],
            ["count", "u32"],
            ["new_account", Pubkey],
            ["copied_count", "u32"],
        ]
    }],
    [List_ValidatorRecordDiscriminator_ValidatorRecord_u32_, {
        "kind": "struct",
        "fields": [
            ["account", Pubkey],
            ["item_size", "u32"],
            ["count", "u32"],
            ["new_account", Pubkey],
            ["copied_count", "u32"],
        ]
    }],
    [Pubkey, {
        "kind": "struct",
        "fields": [
            ["elem0", [32]],
        ]
    }],
    [StakeSystem, {
        "kind": "struct",
        "fields": [
            ["stake_list", List_StakeDiscriminator_StakeRecord_u32_],
            ["total_cooling_down", "u64"],
            ["stake_deposit_bump_seed", "u8"],
            ["stake_withdraw_bump_seed", "u8"],
            ["slots_for_stake_delta", "u64"],
            ["last_stake_delta_epoch", "u64"],
            ["min_stake", "u64"],
            ["extra_stake_delta_runs", "u32"],
        ]
    }],
    [State, {
        "kind": "struct",
        "fields": [
            ["st_sol_mint", Pubkey],
            ["admin_authority", Pubkey],
            ["operational_sol_account", Pubkey],
            ["treasury_msol_account", Pubkey],
            ["reserve_bump_seed", "u8"],
            ["st_mint_authority_bump_seed", "u8"],
            ["rent_exempt_for_token_acc", "u64"],
            ["reward_fee", Fee],
            ["stake_system", StakeSystem],
            ["validator_system", ValidatorSystem],
            ["liq_pool", LiqPool],
            ["available_reserve_balance", "u64"],
            ["st_sol_supply", "u64"],
            ["st_sol_price", "u64"],
            ["circulating_ticket_count", "u64"],
            ["circulating_ticket_balance", "u64"],
            ["lended_from_reserve", "u64"],
            ["min_deposit", "u64"],
            ["min_withdraw", "u64"],
            ["staking_sol_cap", "u64"],
        ]
    }],
    [TicketAccountData, {
        "kind": "struct",
        "fields": [
            ["state_address", Pubkey],
            ["beneficiary", Pubkey],
            ["lamports_amount", "u64"],
            ["created_epoch", "u64"],
        ]
    }],
    [ValidatorRecord, {
        "kind": "struct",
        "fields": [
            ["validator_account", Pubkey],
            ["active_balance", "u64"],
            ["score", "u32"],
            ["last_stake_delta_epoch", "u64"],
            ["duplication_flag_bump_seed", "u8"],
        ]
    }],
    [ValidatorSystem, {
        "kind": "struct",
        "fields": [
            ["validator_list", List_ValidatorRecordDiscriminator_ValidatorRecord_u32_],
            ["manager_authority", Pubkey],
            ["total_validator_score", "u32"],
            ["total_active_balance", "u64"],
            ["auto_add_validator_enabled", "u8"],
        ]
    }],
]);