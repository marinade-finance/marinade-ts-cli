import { sleep } from '@marinade.finance/ts-common'
import { Provider, instanceOfProvider } from './provider'
import { Connection } from '@solana/web3.js'

export async function waitForEpoch(
  connection: Connection | Provider,
  targetEpoch: number,
  timeoutSeconds: number
) {
  connection = instanceOfProvider(connection)
    ? connection.connection
    : connection
  const startTime = Date.now()
  let currentEpoch = (await connection.getEpochInfo()).epoch
  if (currentEpoch < targetEpoch) {
    console.debug(
      `Waiting for the epoch ${targetEpoch}, current epoch is ${currentEpoch}`
    )
  }
  while (currentEpoch < targetEpoch) {
    if (Date.now() - startTime > timeoutSeconds * 1000) {
      throw new Error(
        `Timeout ${timeoutSeconds} elapsed when waiting for epoch ${targetEpoch} (current epoch: ${currentEpoch})`
      )
    }
    await sleep(1000)
    currentEpoch = (await connection.getEpochInfo()).epoch
  }
}

export async function waitForNextEpoch(
  connection: Connection | Provider,
  timeoutSeconds: number
) {
  connection = instanceOfProvider(connection)
    ? connection.connection
    : connection
  const currentEpoch = (await connection.getEpochInfo()).epoch
  await waitForEpoch(connection, currentEpoch + 1, timeoutSeconds)
}
