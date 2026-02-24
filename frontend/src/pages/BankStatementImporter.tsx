import BankPicker from "@/components/features/BankReconciliation/BankPicker"
import { selectedBankAccountAtom } from "@/components/features/BankReconciliation/bankRecAtoms"
import CompanySelector from "@/components/features/BankReconciliation/CompanySelector"
import CSVImport from "@/components/features/BankStatementImporter/CSV/CSVImport"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import ErrorBanner from "@/components/ui/error-banner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { H1, H3 } from "@/components/ui/typography"
import { useCurrentCompany } from "@/hooks/useCurrentCompany"
import { formatDate } from "@/lib/date"
import { flt, formatCurrency } from "@/lib/numbers"
import _ from "@/lib/translate"
import { cn } from "@/lib/utils"
import { MintBankStatementImportLog } from "@/types/Mint/MintBankStatementImportLog"
import { useFrappeFileUpload, useFrappeGetDocList } from "frappe-react-sdk"
import { useAtom, useAtomValue } from "jotai"
import { ListIcon, Loader2Icon } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"


const BankStatementImporter = () => {

    const selectedCompany = useCurrentCompany()

    const [selectedBankAccount, setSelectedBankAccount] = useAtom(selectedBankAccountAtom)

    const [files, setFiles] = useState<File[]>([])

    const [uploadedFileURL, setUploadedFileURL] = useState<string | null>(null)

    const { upload, error, loading } = useFrappeFileUpload()

    const onUpload = () => {

        upload(files[0], {
            isPrivate: true,
        }).then((file) => {
            setUploadedFileURL(file.file_url)
        })
    }

    return (
        <div className="flex flex-col">
            <div className="flex gap-1 items-baseline p-4">
                <H1 className="text-base font-medium"><span className="text-4xl font-extrabold text-emerald-500">mint</span>&nbsp;</H1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild className="text-base font-medium tracking-tight text-balance">
                                <Link to="/">
                                    {_("Bank Reconciliation")}
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="text-base font-medium tracking-tight text-balance">{_("Import Bank Statement")}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {uploadedFileURL && selectedBankAccount ? <CSVImport bank={selectedBankAccount} fileURL={uploadedFileURL} /> :

                <div className="flex px-4">
                    <div className="w-[52%]">
                        {error && <ErrorBanner error={error} />}
                        <div className="py-2 flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <Label>{_("Company")}<span className="text-destructive">*</span></Label>
                                <div className="min-w-56 w-fit flex flex-col">
                                    <CompanySelector onChange={() => setSelectedBankAccount(null)} />
                                </div>
                            </div>
                            {selectedCompany && <div className="flex flex-col gap-2">
                                <Label>{_("Bank Account")}<span className="text-destructive">*</span></Label>
                                <div className="">
                                    <BankPicker className="w-full flex-wrap" size="sm" />
                                </div>
                            </div>
                            }
                            {selectedBankAccount && <div className="flex flex-col gap-4 pr-4">
                                <div className="flex flex-col gap-2">
                                    <Label>{_("Bank Statement")}<span className="text-destructive">*</span></Label>
                                    <p
                                        data-slot="form-description"
                                        className={cn("text-muted-foreground text-xs")}
                                    >
                                        {_("Upload your bank statement file to start the import process. We support CSV, and XLSX files.")}
                                    </p>
                                </div>
                                <FileDropzone
                                    setFiles={setFiles}
                                    files={files}
                                    className="p-8"
                                    accept={{
                                        'text/csv': ['.csv'],
                                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                                        'application/vnd.ms-excel': ['.xls'],
                                        // 'application/xml': ['.xml'],
                                    }}
                                    multiple={false}
                                />
                            </div>}
                            <div className="flex justify-end px-4">
                                <Button
                                    onClick={onUpload}
                                    disabled={files.length === 0 || loading || !selectedBankAccount || !selectedCompany}>
                                    {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
                                    {loading ? _("Uploading...") : _("Upload")}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="w-[48%] border-l border-border pl-4">
                        {selectedBankAccount && <StatementImportLog />}
                    </div>

                </div>
            }
        </div >
    )
}

const StatementImportLog = () => {

    const bankAccount = useAtomValue(selectedBankAccountAtom)

    const { data, error } = useFrappeGetDocList<MintBankStatementImportLog>("Mint Bank Statement Import Log", {
        fields: ["name", "file", "number_of_transactions", "start_date", "end_date", "closing_balance", "creation"],
        filters: [["bank_account", "=", bankAccount?.name ?? ""]],
        orderBy: {
            field: "creation",
            order: "desc"
        },
        limit: 10
    }, bankAccount ? undefined : null)

    return (
        <div className="flex flex-col gap-4">
            <H3 className="text-base">{_("Previous Imports")}</H3>

            {error && <ErrorBanner error={error} />}

            {data && data.length > 0 ? (

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{_("Imported On")}</TableHead>
                            <TableHead>{_("Transaction Dates")}</TableHead>
                            <TableHead className="text-right">{_("Number of Transactions")}</TableHead>
                            <TableHead className="text-right">{_("Closing Balance")}</TableHead>
                            <TableHead>{_("File")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.map((item) => (
                            <TableRow key={item.name}>
                                <TableCell>{formatDate(item.creation, 'Do MMM YYYY')}</TableCell>
                                <TableCell>{formatDate(item.start_date, 'Do MMM YYYY')} to {formatDate(item.end_date, 'Do MMM YYYY')}</TableCell>
                                <TableCell className="text-right">{item.number_of_transactions}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(flt(item.closing_balance, 2))}</TableCell>
                                <TableCell><a
                                    href={item.file}
                                    target="_blank" className="underline underline-offset-4">{item.file.split('/').pop()}</a></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>)
                : <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ListIcon />
                        </EmptyMedia>
                        <EmptyTitle>{_("No previous imports found.")}</EmptyTitle>
                    </EmptyHeader>
                </Empty>}
        </div>
    )
}
export default BankStatementImporter