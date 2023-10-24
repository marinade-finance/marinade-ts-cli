import {
  Keypair,
  PublicKey,
  Commitment,
  clusterApiUrl,
  Cluster,
} from '@solana/web3.js'
import expandTilde from 'expand-tilde' // eslint-disable-line node/no-extraneous-import
import { readFile } from 'fs/promises'

export async function parsePubkey(pubkeyOrPath: string): Promise<PublicKey> {
  try {
    return new PublicKey(pubkeyOrPath)
  } catch (err) {
    try {
      const keypair = await parseKeypair(pubkeyOrPath)
      return keypair.publicKey
    } catch (err2) {
      return new PublicKey(
        new Uint8Array(JSON.parse(await parseFile(pubkeyOrPath)))
      )
    }
  }
}

export async function parsePubkeyOrKeypair(
  pubkeyOrPath: string
): Promise<PublicKey | Keypair> {
  try {
    return await parseKeypair(pubkeyOrPath)
  } catch (err) {
    return await parsePubkey(pubkeyOrPath)
  }
}

export async function parseKeypair(pathOrPrivKey: string): Promise<Keypair> {
  // try if keypair is unit8array
  try {
    const privateKey = new Uint8Array(JSON.parse(pathOrPrivKey))
    if (privateKey.length !== 64) {
      throw new Error('Invalid private key, expecting 64 bytes')
    }
    return Keypair.fromSecretKey(privateKey)
  } catch (err) {
    return Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await parseFile(pathOrPrivKey)))
    )
  }
}

export async function parseFile(path: string): Promise<string> {
  return await readFile(expandTilde(path), 'utf-8')
}

export function getClusterUrl(url: string): string {
  let clusterUrl =
    url === 'd'
      ? 'devnet'
      : url === 't'
      ? 'testnet'
      : url === 'm' || url === 'mainnet'
      ? 'mainnet-beta'
      : url === 'l' || url === 'localnet' || url === 'localhost'
      ? 'http://localhost:8899'
      : url

  try {
    clusterUrl = clusterApiUrl(clusterUrl as Cluster)
  } catch (e) {
    // ignore
  }
  return clusterUrl
}

export function parseCommitment(commitment: string): Commitment {
  if (commitment === 'processed') {
    return 'processed'
  } else if (commitment === 'confirmed') {
    return 'confirmed'
  } else if (commitment === 'finalized') {
    return 'finalized'
  } else if (commitment === 'recent') {
    return 'recent'
  } else if (commitment === 'single') {
    return 'single'
  } else if (commitment === 'singleGossip') {
    return 'singleGossip'
  } else if (commitment === 'root') {
    return 'root'
  } else if (commitment === 'max') {
    return 'max'
  } else {
    throw new Error(
      'Invalid value of --commitment: ' +
        commitment +
        '. Permitted values: processed, confirmed, finalized, recent, single, singleGossip, root, max'
    )
  }
}
