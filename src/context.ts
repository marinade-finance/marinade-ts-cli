import { Commitment, Connection, clusterApiUrl, Cluster } from '@solana/web3.js'
import { Logger } from 'pino'
import { Wallet } from '@coral-xyz/anchor/dist/cjs/provider'
import { MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'

export interface Context {
  connection: Connection
  walletSigner: Wallet
  logger: Logger
  skipPreflight: boolean
  simulate: boolean
  printOnly: boolean
  command: string
  marinadeDefaults: MarinadeConfig
}

const context: {
  connection: Connection | null
  walletSigner: Wallet | null
  logger: Logger | null
  skipPreflight: boolean
  simulate: boolean
  printOnly: boolean
  command: string
  marinadeDefaults: MarinadeConfig
} = {
  connection: null,
  walletSigner: null,
  logger: null,
  skipPreflight: false,
  simulate: false,
  printOnly: false,
  command: '',
  marinadeDefaults: new MarinadeConfig(),
}

function getClusterUrl(url: string): string {
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

function parseCommitment(commitment: string): Commitment {
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

export const setContext = ({
  url,
  walletSigner,
  logger,
  commitment,
  skipPreflight,
  simulate,
  printOnly,
  command,
}: {
  url: string
  walletSigner: Wallet
  simulate: boolean
  printOnly: boolean
  skipPreflight: boolean
  commitment: string
  logger: Logger
  command: string
}) => {
  context.connection = new Connection(
    getClusterUrl(url),
    parseCommitment(commitment)
  )
  context.walletSigner = walletSigner
  context.skipPreflight = skipPreflight
  context.simulate = simulate
  context.logger = logger
  context.printOnly = printOnly
  context.command = command
}

export const getContext = (): Context => {
  return context as Context
}
