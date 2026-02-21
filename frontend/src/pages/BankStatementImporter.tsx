import BankPicker from "@/components/features/BankReconciliation/BankPicker"
import { selectedBankAccountAtom } from "@/components/features/BankReconciliation/bankRecAtoms"
import CompanySelector from "@/components/features/BankReconciliation/CompanySelector"
import CSVImport from "@/components/features/BankStatementImporter/CSV/CSVImport"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import ErrorBanner from "@/components/ui/error-banner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Label } from "@/components/ui/label"
import { H1 } from "@/components/ui/typography"
import { useCurrentCompany } from "@/hooks/useCurrentCompany"
import _ from "@/lib/translate"
import { cn } from "@/lib/utils"
import { useFrappeFileUpload } from "frappe-react-sdk"
import { useAtom } from "jotai"
import { Loader2Icon } from "lucide-react"
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

            {uploadedFileURL ? <CSVImport bank={selectedBankAccount} fileURL={uploadedFileURL} /> :

                <div className="flex gap-4 px-4">
                    <div className="w-[50%]">
                        {error && <ErrorBanner error={error} />}
                        <div className="py-2 flex flex-col gap-4">
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
                            {selectedBankAccount && <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label>{_("Bank Statement")}<span className="text-destructive">*</span></Label>
                                    <p
                                        data-slot="form-description"
                                        className={cn("text-muted-foreground text-xs")}
                                    >
                                        {_("Upload your bank statement file to start the import process. We support CSV, XLSX, and XML files.")}
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
                                        'application/xml': ['.xml'],
                                    }}
                                    multiple={false}
                                />
                            </div>}
                            <div className="flex justify-end">
                                <Button
                                    onClick={onUpload}
                                    disabled={files.length === 0 || loading || !selectedBankAccount || !selectedCompany}>
                                    {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
                                    {loading ? _("Uploading...") : _("Upload")}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="w-[50%] border-l border-border pl-4">

                    </div>

                </div>
            }
        </div >
    )
}
export default BankStatementImporter