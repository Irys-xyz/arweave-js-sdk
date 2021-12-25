import { CurrencyConfig, BaseCurrency, Currency } from "../common/types";

// types specific to the node version 

export interface CurrencyConfig extends CurrencyConfig { provider?: string }

export interface BaseCurrency extends BaseCurrency { provider?: string }

