export const getCurrencySymbol = (currency: string) => {
    // @ts-expect-error - Locals is synced
    return locals[':Currency']?.[currency]?.['symbol']
}