import { Keypair } from '@solana/web3.js'
import { writeFileSync } from 'fs'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'

export async function createTempFileKeypair(seed?: Keypair): Promise<{
  path: string
  cleanup: () => Promise<void>
  keypair: Keypair
}> {
  const keypair = seed ?? new Keypair()

  const folder = await mkdtemp(tmpdir() + '/marinade-cli-')
  const path = `${folder}/keypair.json`
  writeFileSync(path, JSON.stringify(Array.from(keypair.secretKey)))
  const cleanup = async () => {
    await rm(folder, { recursive: true, force: true })
  }
  return { path, cleanup, keypair }
}
