import { useAtomValue, useSetAtom } from "jotai"
import { MissingFiltersBanner } from "./MissingFiltersBanner"
import { bankRecDateAtom, bankRecUnreconcileModalAtom, selectedBankAccountAtom } from "./bankRecAtoms"
import { Paragraph } from "@/components/ui/typography"
import { formatDate } from "@/lib/date"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/numbers"
import { getCompanyCurrency } from "@/lib/company"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, DollarSign, ExternalLink, Undo2, XCircle } from "lucide-react"
import ErrorBanner from "@/components/ui/error-banner"
import { Badge } from "@/components/ui/badge"
import { useGetBankTransactions } from "./utils"
import { BankTransaction } from "@/types/Accounts/BankTransaction"
import { Button } from "@/components/ui/button"

const BankTransactions = () => {
    const selectedBank = useAtomValue(selectedBankAccountAtom)
    const dates = useAtomValue(bankRecDateAtom)

    if (!selectedBank || !dates) {
        return <MissingFiltersBanner text='Please select a bank and set the date range' />
    }

    return <>
        <BankTransactionListView />
        {/* <BankTransactionUnreconcileModal /> */}
    </>
}

const BankTransactionListView = () => {

    const { data, error } = useGetBankTransactions()

    const bankAccount = useAtomValue(selectedBankAccountAtom)
    const dates = useAtomValue(bankRecDateAtom)

    const formattedFromDate = formatDate(dates.fromDate)
    const formattedToDate = formatDate(dates.toDate)

    const setBankRecUnreconcileModalAtom = useSetAtom(bankRecUnreconcileModalAtom)

    const onUndo = (transaction: BankTransaction) => {
        setBankRecUnreconcileModalAtom(transaction.name)
    }

    return <div className="space-y-4 py-2">

        <div>
            <Paragraph className="text-sm">
                Below is a list of all bank transactions imported in the system for the bank account <strong>{bankAccount?.account_name}</strong> between <strong>{formattedFromDate}</strong> and <strong>{formattedToDate}</strong>.
            </Paragraph>
        </div>

        {error && <ErrorBanner error={error} />}

        {data && data.message.length > 0 &&
            <Table>
                <TableCaption>Bank Transactions between {formattedFromDate} and {formattedToDate}</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference #</TableHead>
                        <TableHead className="text-right">Withdrawal</TableHead>
                        <TableHead className="text-right">Deposit</TableHead>
                        <TableHead className="text-right">Unallocated</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.message.map((row: BankTransaction) => (
                        <TableRow key={row.name}>
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap"><span title={row.description}>{row.description}</span></TableCell>
                            <TableCell>{row.reference_number}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.withdrawal, bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? ''))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.deposit, bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? ''))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.unallocated_amount, bankAccount?.account_currency ?? getCompanyCurrency(bankAccount?.company ?? ''))}</TableCell>
                            <TableCell><Badge variant={'outline'}>{row.transaction_type}</Badge></TableCell>
                            <TableCell>
                                {row.status === 'Unreconciled' ?
                                    <Badge variant="destructive" className="bg-destructive/10 text-destructive">
                                        <XCircle className="-mt-0.5 text-destructive" />
                                        Not Reconciled</Badge> :
                                    <Badge variant="outline" className="text-foreground px-1.5">
                                        <CheckCircle2 width={16} height={16} className="text-green-600 dark:text-green-500" />
                                        Unreconciled</Badge>}
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <div>
                                        <Button variant='link' size='sm' asChild>
                                            <a
                                                href={`/app/bank-transaction/${row.name}`}
                                                target="_blank"
                                                className="underline underline-offset-4"
                                            >View <ExternalLink />
                                            </a>
                                        </Button>
                                    </div>
                                    {row.status === 'Reconciled' && <Button
                                        variant='link'
                                        onClick={() => onUndo(row)}
                                        size='sm'
                                        className="text-destructive px-0">
                                        <Undo2 />
                                        Undo
                                    </Button>}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>}

        {data && data.message.length === 0 &&
            <Alert variant='default'>
                <DollarSign />
                <AlertTitle>No transactions found</AlertTitle>
                <AlertDescription>
                    There are no transactions in the system for the selected bank account and dates.
                </AlertDescription>
            </Alert>
        }


    </div>
}

export default BankTransactions
