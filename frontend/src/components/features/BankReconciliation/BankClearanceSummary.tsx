import { useAtomValue } from "jotai"
import { MissingFiltersBanner } from "./MissingFiltersBanner"
import { bankRecDateAtom, selectedBankAccountAtom } from "./bankRecAtoms"
import { useCurrentCompany } from "@/hooks/useCurrentCompany"
import { Paragraph } from "@/components/ui/typography"
import { useMemo } from "react"
import { useFrappeGetCall } from "frappe-react-sdk"
import { QueryReportReturnType } from "@/types/custom/Reports"
import { formatDate } from "@/lib/date"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/numbers"
import { getCompanyCurrency } from "@/lib/company"
import { slug } from "@/lib/frappe"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import ErrorBanner from "@/components/ui/error-banner"
import { Badge } from "@/components/ui/badge"
import _ from "@/lib/translate"
import { useCopyToClipboard } from "usehooks-ts"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"

const BankClearanceSummary = () => {
    const bankAccount = useAtomValue(selectedBankAccountAtom)
    const dates = useAtomValue(bankRecDateAtom)

    if (!bankAccount) {
        return <MissingFiltersBanner text={_("Please select a bank account to view the bank clearance summary.")} />
    }

    if (!dates) {
        return <MissingFiltersBanner text={_("Please select dates to view the bank clearance summary.")} />
    }

    return <BankClearanceSummaryView />
}
interface BankClearanceSummaryEntry {
    payment_document_type: string
    payment_entry: string
    posting_date: string,
    cheque_no: string,
    amount: number,
    against: string,
    clearance_date: string,
}

const BankClearanceSummaryView = () => {

    const companyID = useCurrentCompany()
    const bankAccount = useAtomValue(selectedBankAccountAtom)
    const dates = useAtomValue(bankRecDateAtom)

    const filters = useMemo(() => {
        return JSON.stringify({
            account: bankAccount?.account,
            from_date: dates.fromDate,
            to_date: dates.toDate
        })
    }, [bankAccount, dates])

    const { data, error } = useFrappeGetCall<{ message: QueryReportReturnType<BankClearanceSummaryEntry> }>('frappe.desk.query_report.run', {
        report_name: 'Bank Clearance Summary',
        filters,
        ignore_prepared_report: 1,
        are_default_filters: false,
    }, `Report-Bank Clearance Summary-${filters}`, { keepPreviousData: true, revalidateOnFocus: false }, 'POST')

    const formattedFromDate = formatDate(dates.fromDate)
    const formattedToDate = formatDate(dates.toDate)

    const [, copyToClipboard] = useCopyToClipboard()

    const onCopy = (text: string) => {
        copyToClipboard(text)
            .then(() => {
                toast.success(_("Copied to clipboard"))
            })
    }

    return <div className="space-y-4 py-2">

        <div>
            <Paragraph className="text-sm">
                Below is a list of all accounting entries posted against the bank account <strong>{bankAccount?.account}</strong> between <strong>{formattedFromDate}</strong> and <strong>{formattedToDate}</strong>.
            </Paragraph>
        </div>

        {error && <ErrorBanner error={error} />}

        {data && data.message.result.length > 0 &&
            <Table>
                <TableCaption>{_("Bank Clearance Summary")}</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>{_("Document Type")}</TableHead>
                        <TableHead>{_("Payment Document")}</TableHead>
                        <TableHead>{_("Posting Date")}</TableHead>
                        <TableHead>{_("Cheque/Reference Number")}</TableHead>
                        <TableHead>{_("Clearance Date")}</TableHead>
                        <TableHead>{_("Against Account")}</TableHead>
                        <TableHead className="text-right">{_("Amount")}</TableHead>
                        <TableHead>{_("Status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.message.result.map((row: BankClearanceSummaryEntry) => (
                        <TableRow key={row.payment_entry}>
                            <TableCell>{_(row.payment_document_type)}</TableCell>
                            <TableCell><a target="_blank" className="underline underline-offset-4" href={`/app/${slug(row.payment_document_type)}/${row.payment_entry}`}>{row.payment_entry}</a></TableCell>
                            <TableCell>{formatDate(row.posting_date)}</TableCell>
                            <TableCell title={row.cheque_no}>
                                <Tooltip delayDuration={500}>
                                    <TooltipTrigger onClick={() => onCopy(row.cheque_no)}>
                                        {row.cheque_no.slice(0, 40)}{row.cheque_no.length > 40 ? "..." : ""}
                                    </TooltipTrigger>
                                    <TooltipContent align='start'>
                                        {_("Copy to clipboard")}
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                            <TableCell>{formatDate(row.clearance_date)}</TableCell>
                            <TableCell><a target="_blank" className="underline underline-offset-4" href={`/app/account/${row.against}`}>{row.against}</a></TableCell>
                            <TableCell className="text-right">{formatCurrency(row.amount, bankAccount?.account_currency ?? getCompanyCurrency(companyID))}</TableCell>
                            <TableCell>
                                {row.clearance_date ? <Badge variant="outline" className="text-foreground px-1.5">
                                    <CheckCircle2 width={16} height={16} className="text-green-600 dark:text-green-500" />
                                    {_("Cleared")}</Badge> : <Badge variant="destructive" className="bg-destructive/10 text-destructive">
                                    <XCircle className="-mt-0.5 text-destructive" />
                                    {_("Not Cleared")}</Badge>}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>}

        {data && data.message.result.length === 0 &&
            <Alert variant='default'>
                <AlertCircle />
                <AlertTitle>No entries found</AlertTitle>
                <AlertDescription>
                    There are no accounting entries in the system for the selected account and dates.
                </AlertDescription>
            </Alert>
        }


    </div>
}

export default BankClearanceSummary
