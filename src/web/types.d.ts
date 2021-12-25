import { Currency as Cur } from "../common/types"
// import { BaseCurrency as base } from "../common/currency"


export interface CurrencyConfig { name: string, ticker: string, minConfirm: number, wallet, provider?: any, providerUrl: string }

export interface Currency extends Cur {
    getPublicKey(): Promise<string | Buffer>
    ready(): Promise<void>
}

