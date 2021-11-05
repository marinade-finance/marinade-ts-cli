import { Config } from "./modules/config"
import { Idl, Program, Provider, web3 } from "@project-serum/anchor"
import * as marinadeIdl from "./marinade-idl.json"
import { MarinadeState } from './marinade-state/marinade-state'

export class Marinade {
  constructor (public readonly config: Config = new Config()) {}

  readonly anchorProvider = Provider.local(this.config.anchorProviderUrl)

  get marinadeProgram (): Program {
    return new Program(
      marinadeIdl as Idl,
      this.config.marinadeProgramId,
      this.anchorProvider,
    )
  }

  async getMarinadeState (): Promise<MarinadeState> {
    return MarinadeState.fetch(this)
  }
}