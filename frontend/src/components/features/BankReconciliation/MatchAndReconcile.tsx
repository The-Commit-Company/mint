import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { MissingFiltersBanner } from "./MissingFiltersBanner"
import { bankRecRecordJournalEntryModalAtom, bankRecRecordPaymentModalAtom, bankRecSelectedTransactionAtom, bankRecTransferModalAtom, selectedBankAccountAtom } from "./bankRecAtoms"
import { H4 } from "@/components/ui/typography"
import { useMemo, useState } from "react"
import { getCompanyCurrency } from "@/lib/company"
import ErrorBanner from "@/components/ui/error-banner"
import { Separator } from "@/components/ui/separator"
import Fuse from 'fuse.js'
import { LinkedPayment, UnreconciledTransaction, useGetRuleForTransaction, useGetUnreconciledTransactions, useGetVouchersForTransaction, useIsTransactionWithdrawal, useReconcileTransaction } from "./utils"
import { useDebounceValue } from 'usehooks-ts'
import { Input } from "@/components/ui/input"
import { ArrowDownRight, ArrowRightLeft, ArrowUpRight, BadgeCheck, ChevronDown, DollarSign, Landmark, Loader2, Receipt, Search, User, XCircle, ZapIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import CurrencyInput from 'react-currency-input-field'
import { getCurrencySymbol } from "@/lib/currency"
import { Virtuoso } from 'react-virtuoso'
import { formatDate } from "@/lib/date"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, getCurrencyFormatInfo } from "@/lib/numbers"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { slug } from "@/lib/frappe"
import _ from "@/lib/translate"
import TransferModal from "./TransferModal"
import BankEntryModal from "./BankEntryModal"
import RecordPaymentModal from "./RecordPaymentModal"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SelectedTransactionsTable from "./SelectedTransactionsTable"
import MatchFilters from "./MatchFilters"

const MatchAndReconcile = ({ contentHeight }: { contentHeight: number }) => {
    const selectedBank = useAtomValue(selectedBankAccountAtom)

    if (!selectedBank) {
        return <MissingFiltersBanner text={_("Select a bank account to reconcile")} />
    }

    return <>
        <div className={`flex items-start space-x-2`} >
            <div className="flex-1">
                <H4 className="text-sm font-medium">{_("Unreconciled Transactions")}</H4>
                <UnreconciledTransactions contentHeight={contentHeight} />
            </div>
            <Separator orientation="vertical" style={{ minHeight: `${contentHeight}px` }} />
            <div className="flex-1 px-1">
                <H4 className="text-sm font-medium">{_("Match or Create")}</H4>
                <VouchersSection contentHeight={contentHeight} />
            </div>
        </div>
        <TransferModal />
        <BankEntryModal />
        <RecordPaymentModal />
    </>
}


const UnreconciledTransactions = ({ contentHeight }: { contentHeight: number }) => {
    const bankAccount = useAtomValue(selectedBankAccountAtom)

    const currency = bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? '')
    const currencySymbol = getCurrencySymbol(currency)
    
    const formatInfo = getCurrencyFormatInfo(currency)
    const groupSeparator = formatInfo.group_sep || ","
    const decimalSeparator = formatInfo.decimal_str || "."

    const { data: unreconciledTransactions, isLoading, error } = useGetUnreconciledTransactions()

    const [typeFilter, setTypeFilter] = useState('All')
    const [amountFilter, setAmountFilter] = useState<{ value: number, stringValue?: string | number }>({
        value: 0,
        stringValue: '0.00'
    })

    const [search, setSearch] = useDebounceValue('', 500)

    const searchIndex = useMemo(() => {

        if (!unreconciledTransactions) {
            return null
        }

        return new Fuse(unreconciledTransactions.message, {
            keys: ['description', 'reference_number'],
            threshold: 0.5,
            includeScore: true
        })
    }, [unreconciledTransactions])

    const results = useMemo(() => {

        let r = []
        if (!searchIndex || !search) {
            r = unreconciledTransactions?.message ?? []
        } else {
            r = searchIndex.search(search).map((result) => result.item)
        }

        if (typeFilter !== 'All') {
            r = r.filter((transaction) => {
                if (typeFilter === 'Debits') {
                    return transaction.withdrawal && transaction.withdrawal > 0
                }
                if (typeFilter === 'Credits') {
                    return transaction.deposit && transaction.deposit > 0
                }
            })
        }

        if (amountFilter.value > 0) {
            r = r.filter((transaction) => {
                if (transaction.withdrawal && transaction.withdrawal > 0) {
                    return transaction.withdrawal === amountFilter.value
                }
                if (transaction.deposit && transaction.deposit > 0) {
                    return transaction.deposit === amountFilter.value
                }
                return false
            })
        }

        return r

    }, [searchIndex, search, typeFilter, amountFilter.value, unreconciledTransactions?.message])

    const setSelectedTransaction = useSetAtom(bankRecSelectedTransactionAtom(bankAccount?.name || ''))

    const onFilterChange = () => {
        setSelectedTransaction([])
    }

    const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        onFilterChange()
    }

    const onTypeFilterChange = (type: string) => {
        setTypeFilter(type)
        onFilterChange()
    }

    if (isLoading) {
        return <div className="text-sm text-center p-4 text-muted-foreground">{_("Loading")}...</div>
    }

    return <div className="space-y-1">
        <div className="flex py-2 w-full gap-2">
            <label className="sr-only">{_("Search transactions")}</label>
            <div className={cn("flex items-center gap-2 w-full rounded-md dark:bg-input/30 border-input border bg-transparent px-2 text-base shadow-xs transition-[color,box-shadow] outline-none",
                "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
            )}>
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input placeholder={_("Search")} type='search' onChange={onSearchChange}
                    className="border-none px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
                <div>
                    <span className="text-sm text-muted-foreground text-nowrap whitespace-nowrap">{results?.length} {_(results?.length === 1 ? "result" : "results")}</span>
                </div>
            </div>
            <div>
                <label className="sr-only">{_("Filter by amount")}</label>
                <CurrencyInput
                    groupSeparator={groupSeparator}
                    decimalSeparator={decimalSeparator}
                    placeholder={`${currencySymbol}0${decimalSeparator}00`}
                    decimalsLimit={2}
                    // value={amountFilter.stringValue}
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
                        setAmountFilter({
                            value: Number(newValue),
                            stringValue: newValue
                        })
                        onFilterChange()
                    }}
                    customInput={Input}
                />
            </div>
            <div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="min-w-32 h-9 text-left">
                            {typeFilter === 'All' ? <DollarSign className="w-4 h-4 text-muted-foreground" /> : typeFilter === 'Debits' ? <ArrowUpRight className="w-4 h-4 text-destructive" /> : <ArrowDownRight className="w-4 h-4 text-green-500" />}
                            {_(typeFilter)}
                            <ChevronDown className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onTypeFilterChange('All')}><DollarSign /> {_("All")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTypeFilterChange('Debits')}><ArrowUpRight className="text-destructive" /> {_("Debits")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTypeFilterChange('Credits')}><ArrowDownRight className="text-green-500" /> {_("Credits")}</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {error && <ErrorBanner error={error} />}

        <Virtuoso
            data={results}
            itemContent={(_index, transaction) => (
                <UnreconciledTransactionItem transaction={transaction} />
            )}
            style={{ minHeight: Math.max(contentHeight - 80, 400) }}
            totalCount={results?.length}
        />

    </div>
}

const UnreconciledTransactionItem = ({ transaction }: { transaction: UnreconciledTransaction }) => {

    const selectedBank = useAtomValue(selectedBankAccountAtom)

    const [selectedTransaction, setSelectedTransaction] = useAtom(bankRecSelectedTransactionAtom(selectedBank?.name || ''))

    const { amount, isWithdrawal } = useIsTransactionWithdrawal(transaction)

    const isSelected = selectedTransaction?.some((t) => t.name === transaction.name)

    const currency = transaction.currency ?? selectedBank?.account_currency ?? getCompanyCurrency(selectedBank?.company ?? '')

    const handleSelectTransaction = (event: React.MouseEvent<HTMLDivElement>) => {
        // If the user is pressing the shift key, add/remove the transaction from the selected transactions
        if (event.shiftKey) {
            setSelectedTransaction(isSelected ? selectedTransaction.filter((t) => t.name !== transaction.name) : [...selectedTransaction, transaction])
        } else {
            setSelectedTransaction([transaction])
        }
    }

    return <div className="py-0.5">
        <div className={cn("border rounded-md m-1 p-2 cursor-pointer transition-[color,box-shadow, bg]",
            isSelected ? "border-primary bg-primary-foreground outline-ring outline-1" : "border-border outline-none bg-card hover:bg-accent/40"
        )}
            role='button'
            tabIndex={0}
            onClick={handleSelectTransaction}>
            <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">{formatDate(transaction.date)}</span>
                        {transaction.transaction_type &&
                            <Badge variant='secondary' className="text-xs py-0.5 px-1 rounded-sm bg-secondary">{transaction.transaction_type}</Badge>}
                        {transaction.reference_number && <Badge
                            title={transaction.reference_number}
                            className="inline-block max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap bg-primary-foreground rounded-sm text-primary"
                        >
                            {_("Ref")}: {transaction.reference_number}</Badge>}

                        {transaction.matched_rule && <Badge
                            variant='secondary'
                            title={_("Matched by rule")}
                            className="text-xs py-0.5 px-1 rounded-sm bg-primary-foreground text-primary">
                            <ZapIcon className="w-4 h-4" /> {transaction.matched_rule}</Badge>}
                    </div>
                    <span className="text-sm">{transaction.description}</span>
                </div>
                <div className="gap-1 flex flex-col items-end min-w-36 h-full text-right">
                    {isWithdrawal ? <ArrowUpRight className="w-6 h-6 text-destructive" /> : <ArrowDownRight className="w-6 h-6 text-green-500" />}
                    {amount && amount > 0 && <span className="font-semibold font-mono text-md">{formatCurrency(amount, currency)}</span>}
                    {amount !== transaction.unallocated_amount && <span className="text-xs text-gray-700">{formatCurrency(transaction.unallocated_amount, currency)}<br />{_("Unallocated")}</span>}
                </div>
            </div>
        </div>
    </div>
}


const VouchersSection = ({ contentHeight }: { contentHeight: number }) => {

    const selectedBank = useAtomValue(selectedBankAccountAtom)
    const selectedTransactions = useAtomValue(bankRecSelectedTransactionAtom(selectedBank?.name || ''))


    if (selectedTransactions.length === 0) {
        return <MissingFiltersBanner text={_("Select a transaction to match and reconcile with vouchers")} />
    }

    if (selectedTransactions.length > 1) {
        return <OptionsForMultipleTransactions transactions={selectedTransactions} />
    }

    return <div style={{ minHeight: contentHeight }} className="mt-2">
        <OptionsForSingleTransaction transaction={selectedTransactions[0]} contentHeight={contentHeight} />
    </div>
}

const OptionsForMultipleTransactions = ({ transactions }: { transactions: UnreconciledTransaction[] }) => {

    const setTransferModalOpen = useSetAtom(bankRecTransferModalAtom)
    const setRecordPaymentModalOpen = useSetAtom(bankRecRecordPaymentModalAtom)
    const setRecordJournalEntryModalOpen = useSetAtom(bankRecRecordJournalEntryModalAtom)

    return <div className="flex flex-col py-4">
        <Card className="gap-2">
            <CardHeader>
                <CardTitle>
                    <div className="flex items-center justify-between">
                        <span className="text-lg">{transactions.length} {_(transactions.length === 1 ? _("transaction selected") : _("transactions selected"))}</span>
                        <span className="text-lg font-semibold font-mono">
                            {formatCurrency(transactions.reduce((acc, transaction) => acc + (transaction.unallocated_amount ?? 0), 0), transactions[0].currency ?? '')}
                        </span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>

                <SelectedTransactionsTable />

                <CardAction className="mt-4">
                    <div className="flex gap-3 justify-center">

                        <TooltipProvider>
                            <div className="flex gap-4 justify-center">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size='lg'
                                            aria-label={_("Record a bank journal entry for expenses, income or split transactions")}
                                            onClick={() => setRecordJournalEntryModalOpen(true)}>
                                            <Landmark /> {_("Bank Entry")}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {_("Record a journal entry for expenses, income or split transactions")}
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant='outline'
                                            size='lg'
                                            aria-label={_("Record a payment entry against a customer or supplier")}
                                            onClick={() => setRecordPaymentModalOpen(true)}>
                                            <Receipt /> {_("Record Payment")}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {_("Record a payment entry against a customer or supplier")}
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip >
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant='outline'
                                            size='lg'
                                            aria-label={_("Record an internal transfer to another bank/credit card/cash account")}
                                            onClick={() => setTransferModalOpen(true)}>
                                            <ArrowRightLeft /> {_("Transfer")}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {_("Record an internal transfer to another bank/credit card/cash account")}
                                    </TooltipContent>
                                </Tooltip>

                            </div>
                        </TooltipProvider>
                    </div>
                </CardAction>
            </CardContent>
        </Card>

    </div>
}


const OptionsForSingleTransaction = ({ transaction, contentHeight }: { transaction: UnreconciledTransaction, contentHeight: number }) => {

    const setTransferModalOpen = useSetAtom(bankRecTransferModalAtom)
    const setRecordPaymentModalOpen = useSetAtom(bankRecRecordPaymentModalAtom)
    const setRecordJournalEntryModalOpen = useSetAtom(bankRecRecordJournalEntryModalAtom)

    return <div className="flex flex-col gap-3">
        <TooltipProvider>
            <div className="flex items-center justify-between pt-2">
                <div className="flex gap-4 justify-center">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='outline'
                                aria-label={_("Record a payment entry against a customer or supplier")}
                                onClick={() => setRecordPaymentModalOpen(true)}>
                                <Receipt /> {_("Record Payment")}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {_("Record a payment entry against a customer or supplier")}
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='outline'
                                aria-label={_("Record a bank journal entry for expenses, income or split transactions")}
                                onClick={() => setRecordJournalEntryModalOpen(true)}>
                                <Landmark /> {_("Bank Entry")}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {_("Record a journal entry for expenses, income or split transactions")}
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip >
                        <TooltipTrigger asChild>
                            <Button
                                variant='outline'
                                aria-label={_("Record an internal transfer to another bank/credit card/cash account")}
                                onClick={() => setTransferModalOpen(true)}>
                                <ArrowRightLeft /> {_("Transfer")}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {_("Record an internal transfer to another bank/credit card/cash account")}
                        </TooltipContent>
                    </Tooltip>
                </div>
                <MatchFilters />
            </div>
        </TooltipProvider>
        {transaction.matched_rule && <RuleAction transaction={transaction} />}
        <VouchersForTransaction transaction={transaction} contentHeight={contentHeight} />
    </div>
}

const RuleAction = ({ transaction }: { transaction: UnreconciledTransaction }) => {

    const { data: rule } = useGetRuleForTransaction(transaction)
    const setTransferModalOpen = useSetAtom(bankRecTransferModalAtom)
    const setRecordPaymentModalOpen = useSetAtom(bankRecRecordPaymentModalAtom)
    const setRecordJournalEntryModalOpen = useSetAtom(bankRecRecordJournalEntryModalAtom)

    if (!rule) {
        return null
    }

    const getActionIcon = () => {
        switch (rule.classify_as) {
            case "Bank Entry":
                return <Landmark className="w-6 h-6" />
            case "Payment Entry":
                return <Receipt className="w-6 h-6" />
            case "Transfer":
                return <ArrowRightLeft className="w-6 h-6" />
            default:
                return <ZapIcon className="w-6 h-6" />
        }
    }

    const getActionStyles = () => {
        switch (rule.classify_as) {
            case "Bank Entry":
                return {
                    border: "border-blue-200",
                    bg: "bg-blue-50/30",
                    text: "text-blue-700",
                    button: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                }
            case "Payment Entry":
                return {
                    border: "border-green-200",
                    bg: "bg-green-50/30",
                    text: "text-green-700",
                    button: "bg-green-600 hover:bg-green-700 text-white border-green-600"
                }
            case "Transfer":
                return {
                    border: "border-purple-200",
                    bg: "bg-purple-50/30",
                    text: "text-purple-700",
                    button: "bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                }
            default:
                return {
                    border: "border-amber-200",
                    bg: "bg-amber-50/30",
                    text: "text-amber-700",
                    button: "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                }
        }
    }

    const handleActionClick = () => {
        switch (rule.classify_as) {
            case "Bank Entry":
                setRecordJournalEntryModalOpen(true)
                break
            case "Payment Entry":
                setRecordPaymentModalOpen(true)
                break
            case "Transfer":
                setTransferModalOpen(true)
                break
        }
    }

    const getActionDescription = () => {
        switch (rule.classify_as) {
            case "Bank Entry":
                return _("Create a journal entry for expenses, income or split transactions")
            case "Payment Entry":
                return _("Record a payment entry against a customer or supplier")
            case "Transfer":
                return _("Record an internal transfer to another bank/credit card/cash account")
            default:
                return _("Create a new entry based on the rule")
        }
    }

    const styles = getActionStyles()

    return (
        <Card className={`border ${styles.border} ${styles.bg} shadow-sm hover:shadow-md transition-all duration-200`}>
            <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${styles.bg} ${styles.text}`}>
                        {getActionIcon()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-lg">{rule.rule_name}</span>
                        <span className="text-sm text-muted-foreground font-normal">
                            {rule.rule_description || _("Rule matched based on transaction description and other criteria.")}
                        </span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-background/60 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-foreground">{_("Recommended Action")}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-medium">
                        {_("Priority")} {rule.priority}
                    </Badge>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-0.5">
                        <span className="text-sm font-medium text-foreground">{_("Action Type")}:</span>
                        <Badge variant="secondary" className={`text-sm font-medium ${styles.text} bg-opacity-10`}>
                            {rule.classify_as}
                        </Badge>
                    </div>

                    {rule.account && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{_("Account")}:</span>
                            <span className="text-sm">{rule.account}</span>
                        </div>
                    )}

                    {rule.party_type && rule.party && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{_("Party")}:</span>
                            <span className="text-sm">{rule.party} ({_(rule.party_type)})</span>
                        </div>
                    )}
                </div>

                <div className="pt-1">
                    <Button
                        onClick={handleActionClick}
                        className={`w-full ${styles.button} hover:scale-[1.01] transition-all duration-200 font-medium`}
                        size="lg"
                    >
                        <div className="flex items-center gap-2">
                            {getActionIcon()}
                            <span>{_("Create")} {rule.classify_as}</span>
                        </div>
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed">
                        {getActionDescription()}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

const VouchersForTransaction = ({ transaction, contentHeight }: { transaction: UnreconciledTransaction, contentHeight: number }) => {

    const { data: vouchers, isLoading, error } = useGetVouchersForTransaction(transaction)

    if (error) {
        return <ErrorBanner error={error} />
    }

    if (isLoading) {
        return <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Separator className="flex-1" />
                <span>or</span>
                <Separator className="flex-1" />
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
    }

    return <div className="relative space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Separator className="flex-1" />
            <span>or</span>
            <Separator className="flex-1" />
        </div>
        {vouchers?.message.length === 0 && <MissingFiltersBanner text={_("No vouchers found for this transaction")} className="min-h-[10vh]" />}
        <Virtuoso
            data={vouchers?.message}
            itemContent={(index, voucher) => (
                <VoucherItem voucher={voucher} index={index} />
            )}
            style={{ height: contentHeight }}
            totalCount={vouchers?.message.length}
        />
    </div >
}

const VoucherItem = ({ voucher, index }: { voucher: LinkedPayment, index: number }) => {

    const selectedBank = useAtomValue(selectedBankAccountAtom)
    const selectedTransaction = useAtomValue(bankRecSelectedTransactionAtom(selectedBank?.name || ''))

    const { amountMatches, postingDateMatches, referenceDateMatches, referenceMatchesFull, referenceMatchesPartial, isSuggested } = useMemo(() => {

        const transaction = selectedTransaction?.[0]

        // We need to check if the following details match:
        // Amount
        // Date
        // Reference/Description: Full or partial
        // Whether this is suggested or not - depends on the above scores

        const amountMatches = voucher.paid_amount === transaction?.unallocated_amount
        const postingDateMatches = voucher.posting_date === transaction?.date
        const referenceDateMatches = voucher.reference_date === transaction?.date
        const referenceMatchesFull = voucher.reference_no === transaction?.reference_number || voucher.reference_no === transaction?.description

        const referenceMatchesPartial = transaction?.reference_number?.includes(voucher.reference_no) || transaction?.description?.includes(voucher.reference_no)


        const isSuggested = amountMatches && (postingDateMatches || referenceDateMatches || referenceMatchesPartial) && index === 0

        return { isSelected: false, amountMatches, postingDateMatches, referenceDateMatches, referenceMatchesFull, referenceMatchesPartial, isSuggested: isSuggested }

    }, [voucher, selectedTransaction, index])

    const { reconcileTransaction, loading } = useReconcileTransaction()

    const onClick = () => {
        if (!selectedTransaction) {
            return
        }
        reconcileTransaction(selectedTransaction[0], [voucher])
    }

    return <div className="py-1 px-1">
        <div
            className={cn("border outline overflow-hidden relative rounded-md p-2",
                isSuggested ? "border-amber-500 bg-amber-50/50 outline-amber-500" : "border-border bg-card outline-transparent"
            )}
        >

            <div className="flex justify-between items-end gap-2">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Badge variant='secondary' className={cn("text-sm rounded-sm", isSuggested ? "bg-amber-100 text-amber-700" : "bg-secondary")}>{_(voucher.doctype)}</Badge>
                        <a target="_blank"
                            href={`/app/${slug(voucher.doctype)}/${voucher.name}`}
                            className="underline underline-offset-2 font-medium"
                        >{voucher.name}</a>
                    </div>
                    {voucher.party && voucher.party_type && <div className="flex items-center gap-2">
                        <User size='18px' />
                        <span>{_(voucher.party_type)}</span>
                        <a target="_blank"
                            href={`/app/${slug(voucher.party_type)}/${voucher.party}`}
                            className="underline underline-offset-2 font-medium"
                        >{voucher.party}</a>
                    </div>}
                    <TooltipProvider>
                        <div className="flex items-center gap-1">
                            <span>{_("Amount")}: <span className="font-bold font-mono">{formatCurrency(voucher.paid_amount, voucher.currency)}</span></span>
                            {amountMatches ?
                                <MatchBadge matchType="full" label="Amount matches the selected transaction" />
                                :
                                <MatchBadge matchType="none" label="Amount does not match the selected transaction" />
                            }
                        </div>
                        <div className="flex gap-2 h-6">

                            <div className="flex items-center gap-1">
                                <span>{_("Posted On")}: <span className="font-bold">{formatDate(voucher.posting_date)}</span></span>
                                <MatchBadge
                                    matchType={postingDateMatches ? "full" : "none"}
                                    label={postingDateMatches ? "Posting Date matches the transaction date" : "Posting Date does not match the transaction date"}
                                />
                            </div>
                            {voucher.reference_date && <Separator orientation="vertical" className="h-4" />}
                            {voucher.reference_date && <div className="flex items-center gap-1">
                                <span>{_("Reference Date")}: <span className="font-bold">{formatDate(voucher.reference_date)}</span></span>
                                <MatchBadge
                                    matchType={referenceDateMatches ? "full" : "none"}
                                    label={referenceDateMatches ? `${_("Reference Date matches the transaction date")}` : `${_("Reference Date does not match the transaction date")}`}
                                />
                            </div>}
                        </div>
                        <div className="flex items-start gap-1">
                            <span className="font-medium">
                                {voucher.reference_no}
                                &nbsp;&nbsp;
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Badge className={cn("text-xs rounded-sm", referenceMatchesFull ? "bg-green-600 text-white" : referenceMatchesPartial ? "bg-amber-400 text-white" : "bg-red-500 text-white")}>
                                            {referenceMatchesFull ? `${_("Complete Match")}` : referenceMatchesPartial ? `${_("Partial Match")}` : `${_("No Match")}`}</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        {referenceMatchesFull ? `${_("Reference matches the selected transaction")}` : referenceMatchesPartial ? `${_("Reference matches the selected transaction partially")}` : `${_("Reference does not match the selected transaction")}`}
                                    </TooltipContent>
                                </Tooltip>
                            </span>
                        </div>
                    </TooltipProvider>
                </div>
                <div>
                    <Button variant='outline' className={
                        cn(isSuggested || amountMatches ? "bg-green-600 hover:bg-green-700 active:bg-green-600 text-white hover:text-white active:text-white" : "")
                    } onClick={onClick} disabled={loading}>{loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {_("Reconciling")}...</> : `${_("Reconcile")}`}</Button>
                </div>
            </div>

            <div className="absolute top-0 right-0 flex items-center gap-1 justify-center">
                {isSuggested && <span
                    className="bg-amber-500 uppercase font-medium text-white px-3 py-1 rounded-bl-md text-xs rounded-tr-sm">{_("Suggested")}</span>}
            </div>

        </div>
    </div>
}


const MatchBadge = ({ matchType, label }: { matchType: 'full' | 'partial' | 'none', label: string }) => {
    return <Tooltip>
        <TooltipTrigger>
            {matchType === 'full' ? <BadgeCheck className="text-white fill-green-600" /> : matchType === 'partial' ?
                <Badge className="text-white bg-amber-400 rounded-sm">{_("Partial Match")}</Badge> :
                <XCircle className="text-white fill-red-500" />}
        </TooltipTrigger>
        <TooltipContent>
            {label}
        </TooltipContent>
    </Tooltip>
}

export default MatchAndReconcile