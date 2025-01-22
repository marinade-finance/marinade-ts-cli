import { Idl, Program } from '@coral-xyz/anchor'

export function anchorProgramWalletPubkey<IDL extends Idl = Idl>(
  program: Program<IDL>,
) {
  const pubkey = program.provider.publicKey
  if (pubkey === undefined) {
    throw new Error(
      'Cannot get wallet pubkey from Anchor Program ' + program.programId,
    )
  }
  return pubkey
}
