import { Keypair } from '@solana/web3.js'
import { writeFileSync } from 'fs'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import * as path from 'path'

export async function createTempFileKeypair(
  seed?: Keypair,
  tmpPathPrefix = 'tmp-keypair',
): Promise<{
  path: string
  cleanup: () => Promise<void>
  keypair: Keypair
}> {
  const keypair = seed ?? new Keypair()

  const folderPath = path.join(tmpdir(), tmpPathPrefix)
  const folder = await mkdtemp(folderPath)
  const keypairPath = path.join(folder, 'keypair.json')
  writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)))
  const cleanup = async () => {
    await rm(folder, { recursive: true, force: true })
  }
  return { path: keypairPath, cleanup, keypair }
}
