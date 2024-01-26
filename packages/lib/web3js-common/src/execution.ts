import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
} from '@solana/web3.js'
import { executeTxSimple, transaction } from './tx'
import { Wallet } from './wallet'
import Provider, { walletProviderOrConnection } from './provider'
import BN from 'bn.js'
import { toBigint } from './math'

export async function createUserAndFund({
  provider,
  user = Keypair.generate(),
  lamports = 5 * LAMPORTS_PER_SOL,
  from,
}: {
  provider: Connection | Provider
  user?: Signer | Wallet | Keypair | PublicKey
  lamports?: number | BN | bigint
  from?: Signer | Wallet | Keypair
}): Promise<Signer | Wallet | Keypair | PublicKey> {
  const [connection, payer] = walletProviderOrConnection(provider, from)
  const ix = SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: user instanceof PublicKey ? user : user.publicKey,
    lamports: toBigint(lamports),
  })
  const tx = (await transaction(provider)).add(ix)
  await executeTxSimple(connection, tx, [payer])
  return user
}
