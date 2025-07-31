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
import _ from "@/lib/translate"

const BankTransactions = () => {
    const selectedBank = useAtomValue(selectedBankAccountAtom)
    const dates = useAtomValue(bankRecDateAtom)

    if (!selectedBank || !dates) {
        return <MissingFiltersBanner text={_("Please select a bank and set the date range")} />
    }

    return <>
        <BankTransactionListView />
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
                <TableCaption>{_("Bank Transactions between {0} and {1}", [formattedFromDate, formattedToDate])}</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>{_("Date")}</TableHead>
                        <TableHead>{_("Description")}</TableHead>
                        <TableHead>{_("Reference #")}</TableHead>
                        <TableHead className="text-right">{_("Withdrawal")}</TableHead>
                        <TableHead className="text-right">{_("Deposit")}</TableHead>
                        <TableHead className="text-right">{_("Unallocated")}</TableHead>
                        <TableHead>{_("Type")}</TableHead>
                        <TableHead>{_("Status")}</TableHead>
                        <TableHead>{_("Actions")}</TableHead>
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
                                {(!row.allocated_amount || (row.allocated_amount && row.allocated_amount === 0)) ?
                                    <div className="bg-transparent border border-border flex items-center justify-center gap-1.5 px-2 py-1 text-xs w-fit rounded-md">
                                        <XCircle className="-mt-[1px] text-destructive" size={14} />
                                        {_("Not Reconciled")}</div> :
                                    (row.allocated_amount && row.allocated_amount > 0 && row.unallocated_amount !== 0) ?
                                        <div className="bg-transparent border border-border flex items-center gap-1.5 px-2 py-1 text-xs w-fit rounded-md">
                                            <CheckCircle2 size={14} className="-mt-[1px] text-yellow-500 dark:text-yellow-400" />
                                            {_("Partially Reconciled")}</div> :
                                        <div className="bg-transparent border border-border flex items-center gap-1.5 px-2 py-1 text-xs w-fit rounded-md">
                                            <CheckCircle2 size={14} className="-mt-[1px] text-green-600 dark:text-green-500" />
                                            {_("Reconciled")}</div>}
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <div>
                                        <Button variant='link' size='sm' asChild>
                                            <a
                                                href={`/app/bank-transaction/${row.name}`}
                                                target="_blank"
                                                className="underline underline-offset-4"
                                            >{_("View")} <ExternalLink />
                                            </a>
                                        </Button>
                                    </div>
                                    {(row.allocated_amount && row.allocated_amount > 0) ? <Button
                                        variant='link'
                                        onClick={() => onUndo(row)}
                                        size='sm'
                                        className="text-destructive px-0">
                                        <Undo2 />
                                        {_("Undo")}
                                    </Button> : null}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>}

        {data && data.message.length === 0 &&
            <Alert variant='default'>
                <DollarSign />
                <AlertTitle>{_("No transactions found")}</AlertTitle>
                <AlertDescription>
                    {_("There are no transactions in the system for the selected bank account and dates.")}
                </AlertDescription>
            </Alert>
        }


    </div>
}

export default BankTransactions
