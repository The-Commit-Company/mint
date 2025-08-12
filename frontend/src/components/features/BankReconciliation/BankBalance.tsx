import { useAtom, useAtomValue } from "jotai"
import { bankRecClosingBalanceAtom, bankRecDateAtom, selectedBankAccountAtom } from "./bankRecAtoms"
import { useFrappeGetDocCount } from "frappe-react-sdk"
import { BankTransaction } from "@/types/Accounts/BankTransaction"
import { Progress } from "@/components/ui/progress"
import { useGetAccountClosingBalance, useGetAccountOpeningBalance, useGetUnreconciledTransactions } from "./utils"
import { flt, formatCurrency, getCurrencyFormatInfo } from "@/lib/numbers"
import { Skeleton } from "@/components/ui/skeleton"
import { StatContainer, StatLabel, StatValue } from "@/components/ui/stats"
import { Info } from "lucide-react"
import { H4, Paragraph } from "@/components/ui/typography"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import CurrencyInput from 'react-currency-input-field'
import { getCompanyCurrency } from "@/lib/company"
import { getCurrencySymbol } from "@/lib/currency"
import _ from "@/lib/translate"

const BankBalance = () => {

    const bankAccount = useAtomValue(selectedBankAccountAtom)

    if (!bankAccount) {
        return null
    }
    return (
        <div className="flex justify-between">
            <div className="w-[80%] flex justify-between gap-2 pr-8 border-r-border border-r">
                <OpeningBalance />
                <ClosingBalance />
                <ClosingBalanceAsPerStatement />
                <Difference />
            </div>

            <ReconcileProgress />
        </div>
    )
}

const OpeningBalance = () => {
    const bankAccount = useAtomValue(selectedBankAccountAtom)
    const { data, isLoading } = useGetAccountOpeningBalance()

    return <StatContainer className="min-w-48">
        <StatLabel>{_("Opening Balance")}</StatLabel>
        {isLoading ? <Skeleton className="w-[150px] h-9" /> : <StatValue className="font-mono">{formatCurrency(flt(data?.message, 2), bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? ''))}</StatValue>}
    </StatContainer>
}

const ClosingBalance = () => {
    const bankAccount = useAtomValue(selectedBankAccountAtom)
    const { data, isLoading } = useGetAccountClosingBalance()

    return (
        <StatContainer className="min-w-48">
            <div className="flex items-start gap-1">
                <StatLabel>
                    {_("Closing Balance as per system")}
                </StatLabel>
                <HoverCard openDelay={100}>
                    <HoverCardTrigger>
                        <Info size='14px' className="text-secondary-foreground/80" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-96" align="start" side="right">
                        <H4 className="text-base">{_("Closing balance as per system")}</H4>
                        <Paragraph className="mt-2 text-sm">
                            {_("This is what the system expects the closing balance to be in your bank statement.")}
                            <br />
                            {_("It takes into account all the transactions that have been posted and subtracts the transactions that have not cleared yet.")}
                            <br />
                            {_("If your bank statement shows a different closing balance, it is because all transactions have not reconciled yet.")}
                            <br /><br />
                            For more information, click on the <strong>Bank Reconciliation Statement</strong> tab below.
                        </Paragraph>
                    </HoverCardContent>
                </HoverCard>

            </div>
            {isLoading ? <Skeleton className="w-[150px] h-9" /> : <StatValue className="font-mono">{formatCurrency(flt(data?.message, 2), bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? ''))}</StatValue>}
        </StatContainer>
    )
}

const ClosingBalanceAsPerStatement = () => {

    const bankAccount = useAtomValue(selectedBankAccountAtom)

    const currency = bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? '')
    const currencySymbol = getCurrencySymbol(currency)
    
    const formatInfo = getCurrencyFormatInfo(currency)
    const groupSeparator = formatInfo.group_sep || ","
    const decimalSeparator = formatInfo.decimal_str || "."

    const [value, setValue] = useAtom(bankRecClosingBalanceAtom(bankAccount?.name ?? ''))

    return <StatContainer>
        <StatLabel className="mb-1">{_("Enter Closing Balance as per statement")}</StatLabel>
        <CurrencyInput
            groupSeparator={groupSeparator}
            decimalSeparator={decimalSeparator}
            placeholder={`${currencySymbol}0${decimalSeparator}00`}
            decimalsLimit={2}
            value={value.stringValue}
            maxLength={12}
            decimalScale={2}
            prefix={currencySymbol}
            onValueChange={(v, _n, values) => {
                // If the input ends with a decimal or a decimal with trailing zeroes, store the string since we need the user to be able to type the decimals.
                // When the user eventually types the decimals or blurs out, the value is formatted anyway.
                // Otherwise store the float value
                // Check if the value ends with a decimal or a decimal with trailing zeroes
                const isDecimal = v?.endsWith(decimalSeparator) || v?.endsWith(decimalSeparator + '0')
                const newValue = isDecimal ? v : values?.float ?? ''
                setValue({
                    value: Number(newValue),
                    stringValue: newValue
                })
            }}
            customInput={Input}
        />
    </StatContainer>
}

const Difference = () => {
    const bankAccount = useAtomValue(selectedBankAccountAtom)

    const { data, isLoading } = useGetAccountClosingBalance()

    const value = useAtomValue(bankRecClosingBalanceAtom(bankAccount?.name ?? ''))

    const difference = flt(value.value - (data?.message ?? 0))

    const isError = difference !== 0

    return <StatContainer className="w-fit text-right sm:min-w-56">
        <StatLabel className="text-right">{_("Difference")}</StatLabel>
        {isLoading ? <Skeleton className="w-[150px] h-9" /> : <StatValue className={isError ? 'text-destructive font-mono' : 'font-mono'}>
            {formatCurrency(difference,
                bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? ''))
            }</StatValue>}
    </StatContainer>
}

const ReconcileProgress = () => {

    const bankAccount = useAtomValue(selectedBankAccountAtom)

    const dates = useAtomValue(bankRecDateAtom)

    const { data: totalCount } = useFrappeGetDocCount<BankTransaction>('Bank Transaction', [
        ["bank_account", "=", bankAccount?.name ?? ''],
        ['docstatus', '=', 1],
        ['date', '<=', dates?.toDate],
        ['date', '>=', dates?.fromDate]
    ], false, false, undefined, {
        revalidateOnFocus: false
    })

    const { data: unreconciledTransactions, } = useGetUnreconciledTransactions()

    const reconciledCount = (totalCount ?? 0) - (unreconciledTransactions?.message?.length ?? 0)

    const progress = (totalCount ? reconciledCount / totalCount : 0) * 100

    return <div className="w-[18%] flex flex-col gap-1 items-end">
        <div>
            <span className="text-right font-medium text-sm">{_("Your Progress")}: {reconciledCount} / {totalCount} {_("reconciled")}</span>
        </div>
        <div className="w-full">
            <Progress value={progress} max={100} />
        </div>
    </div>
}

export default BankBalance