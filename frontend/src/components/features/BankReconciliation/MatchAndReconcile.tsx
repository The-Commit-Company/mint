import { useAtom, useAtomValue } from "jotai"
import { MissingFiltersBanner } from "./MissingFiltersBanner"
import { bankRecSelectedTransactionAtom, selectedBankAccountAtom } from "./bankRecAtoms"
import { H4 } from "@/components/ui/typography"
import { useMemo, useState } from "react"
// import { formatDate } from "@/lib/date"
// import { formatCurrency } from "@/lib/numbers"
import { getCompanyCurrency } from "@/lib/company"
// import { slug } from "@/lib/frappe"
import ErrorBanner from "@/components/ui/error-banner"
import { Separator } from "@/components/ui/separator"
import Fuse from 'fuse.js'
import { UnreconciledTransaction, useGetUnreconciledTransactions } from "./utils"
import { useDebounceValue } from 'usehooks-ts'
import { Input } from "@/components/ui/input"
import { ArrowDownRight, ArrowUpRight, ChevronDown, DollarSign, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import CurrencyInput from 'react-currency-input-field'
import { getCurrencySymbol } from "@/lib/currency"
import { Virtuoso } from 'react-virtuoso'
import { formatDate } from "@/lib/date"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/numbers"

const MatchAndReconcile = ({ contentHeight }: { contentHeight: number }) => {
    const selectedBank = useAtomValue(selectedBankAccountAtom)

    if (!selectedBank) {
        return <MissingFiltersBanner text='Select a bank account to reconcile' />
    }

    return <>
        <div className={`flex items-start space-x-2`} >
            <div className="flex-1">
                <H4 className="text-sm font-medium">Unreconciled Transactions</H4>
                <UnreconciledTransactions contentHeight={contentHeight} />

            </div>
            <Separator orientation="vertical" style={{ minHeight: `${contentHeight}px` }} />
            <div className="flex-1">
                <H4 className="text-sm font-medium">Vouchers</H4>

            </div>

        </div>
    </>
}


const UnreconciledTransactions = ({ contentHeight }: { contentHeight: number }) => {
    const bankAccount = useAtomValue(selectedBankAccountAtom)

    const currencySymbol = getCurrencySymbol(bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? ''))

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

    if (isLoading) {
        return "Loading..."
    }

    return <div className="space-y-2">
        <div className="flex py-2 w-full gap-2">
            <label className="sr-only">Search transactions</label>
            <div className={cn("flex items-center gap-2 w-full rounded-md dark:bg-input/30 border-input border bg-transparent px-2 text-base shadow-xs transition-[color,box-shadow] outline-none",
                "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
            )}>
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input placeholder="Search" type='search' onChange={(e) => setSearch(e.target.value)}
                    className="border-none px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
                <div>
                    <span className="text-sm text-muted-foreground text-nowrap whitespace-nowrap">{results?.length} results</span>
                </div>
            </div>
            <div>
                <label className="sr-only">Filter by amount</label>
                <CurrencyInput
                    groupSeparator=","
                    placeholder={`${currencySymbol}0.00`}
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
                        const isDecimal = v?.endsWith('.') || v?.endsWith('.0')
                        const newValue = isDecimal ? v : values?.float ?? ''
                        setAmountFilter({
                            value: Number(newValue),
                            stringValue: newValue
                        })
                    }}
                    customInput={Input}
                />
            </div>
            <div>
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Button variant="outline" className="min-w-28 h-9 text-left">
                            {typeFilter === 'All' ? <DollarSign className="w-4 h-4 text-muted-foreground" /> : typeFilter === 'Debits' ? <ArrowUpRight className="w-4 h-4 text-destructive" /> : <ArrowDownRight className="w-4 h-4 text-green-500" />}
                            {typeFilter}
                            <ChevronDown className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setTypeFilter('All')}><DollarSign /> All</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTypeFilter('Debits')}><ArrowUpRight className="text-destructive" /> Debits</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTypeFilter('Credits')}><ArrowDownRight className="text-green-500" /> Credits</DropdownMenuItem>
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
            style={{ height: contentHeight - 100 }}
            totalCount={results?.length}
        />

    </div>
}

const UnreconciledTransactionItem = ({ transaction }: { transaction: UnreconciledTransaction }) => {

    const selectedBank = useAtomValue(selectedBankAccountAtom)

    const [selectedTransaction, setSelectedTransaction] = useAtom(bankRecSelectedTransactionAtom(selectedBank?.name || ''))

    const { amount, isWithdrawal } = useMemo(() => {
        const isWithdrawal = transaction.withdrawal && transaction.withdrawal > 0
        const isDeposit = transaction.deposit && transaction.deposit > 0

        return {
            amount: isWithdrawal ? transaction.withdrawal : transaction.deposit,
            isWithdrawal,
            isDeposit
        }
    }, [transaction])

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
            isSelected ? "border-ring outline-ring outline-1 bg-ring/5" : "border-border outline-none bg-card hover:bg-accent/40"
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
                            Ref: {transaction.reference_number}</Badge>}
                    </div>
                    <span className="text-sm">{transaction.description}</span>
                </div>
                <div className="gap-1 flex flex-col items-end min-w-32 h-full text-right">
                    {isWithdrawal ? <ArrowUpRight className="w-6 h-6 text-destructive" /> : <ArrowDownRight className="w-6 h-6 text-green-500" />}
                    {amount && amount > 0 && <span className="font-semibold text-md">{formatCurrency(amount, currency)}</span>}
                    {amount !== transaction.unallocated_amount && <span className="text-xs text-gray-700">{formatCurrency(transaction.unallocated_amount, currency)}<br />Unallocated</span>}
                </div>
            </div>
        </div>
    </div>
}

export default MatchAndReconcile