import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { bankRecRecordJournalEntryModalAtom, bankRecSelectedTransactionAtom, bankRecUnreconcileModalAtom, selectedBankAccountAtom } from "./bankRecAtoms"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogClose } from "@/components/ui/dialog"
import _ from "@/lib/translate"
import { UnreconciledTransaction, useRefreshUnreconciledTransactions } from "./utils"
import { useForm } from "react-hook-form"
import { JournalEntry } from "@/types/Accounts/JournalEntry"
import { getCompanyCostCenter } from "@/lib/company"
import { useFrappePostCall } from "frappe-react-sdk"
import { toast } from "sonner"
import ErrorBanner from "@/components/ui/error-banner"
import { Button } from "@/components/ui/button"
import SelectedTransactionDetails from "./SelectedTransactionDetails"
import { DataField, DateField, SmallTextField } from "@/components/ui/form-elements"
import { Form } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"

const BankEntryModal = () => {

    const [isOpen, setIsOpen] = useAtom(bankRecRecordJournalEntryModalAtom)

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className='min-w-7xl'>
                <DialogHeader>
                    <DialogTitle>{_("Bank Entry")}</DialogTitle>
                    <DialogDescription>
                        {_("Record a journal entry for expenses, income or split transactions.")}
                    </DialogDescription>
                </DialogHeader>
                <RecordBankEntryModalContent />
            </DialogContent>
        </Dialog>
    )
}

const RecordBankEntryModalContent = () => {

    const selectedBankAccount = useAtomValue(selectedBankAccountAtom)

    const selectedTransaction = useAtomValue(bankRecSelectedTransactionAtom(selectedBankAccount?.name ?? ''))

    if (!selectedTransaction || !selectedBankAccount) {
        return <div className='p-4'>
            <span className='text-center'>No transaction selected</span>
        </div>
    }

    return <BankEntryForm
        selectedTransaction={selectedTransaction[0]} />

}


interface BankEntryFormData extends Pick<JournalEntry, 'voucher_type' | 'cheque_date' | 'posting_date' | 'cheque_no' | 'user_remark'> {
    entries: {
        account: string,
        party_type: string,
        party: string,
        amount: number,
        cost_center?: string,
        user_remark?: string,
    }[]
}


const BankEntryForm = ({ selectedTransaction }: { selectedTransaction: UnreconciledTransaction }) => {

    const setIsOpen = useSetAtom(bankRecRecordJournalEntryModalAtom)

    const onClose = () => {
        setIsOpen(false)
    }

    const isWithdrawal = (selectedTransaction.withdrawal && selectedTransaction.withdrawal > 0) ? true : false

    const form = useForm<BankEntryFormData>({
        defaultValues: {
            voucher_type: 'Bank Entry',
            cheque_date: selectedTransaction.date,
            posting_date: selectedTransaction.date,
            cheque_no: (selectedTransaction.reference_number || selectedTransaction.description || '').slice(0, 140),
            user_remark: selectedTransaction.description,
            entries: [
                {
                    account: '',
                    amount: selectedTransaction.unallocated_amount,
                    party_type: isWithdrawal ? 'Supplier' : 'Customer',
                    cost_center: getCompanyCostCenter(selectedTransaction.company ?? '') ?? ''
                }
            ],
        }
    })

    const onReconcile = useRefreshUnreconciledTransactions()

    const { call: createBankEntry, loading, error } = useFrappePostCall('mint.apis.bank_reconciliation.create_bank_entry_and_reconcile')

    const setBankRecUnreconcileModalAtom = useSetAtom(bankRecUnreconcileModalAtom)

    const onSubmit = (data: BankEntryFormData) => {

        createBankEntry({
            bank_transaction_name: selectedTransaction.name,
            ...data
        }).then(() => {
            toast.success(_("Bank Entry Created"), {
                duration: 4000,
                closeButton: true,
                action: {
                    label: _("Undo"),
                    onClick: () => setBankRecUnreconcileModalAtom(selectedTransaction.name)
                },
                actionButtonStyle: {
                    backgroundColor: "rgb(0, 138, 46)"
                }
            })
            onReconcile(selectedTransaction)
            onClose()
        })
    }
    return <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className='flex flex-col gap-4'>
                {error && <ErrorBanner error={error} />}
                <div className='grid grid-cols-2 gap-4'>
                    <SelectedTransactionDetails transaction={selectedTransaction} />

                    <div className='flex flex-col gap-4'>
                        <div className='grid grid-cols-2 gap-4'>
                            <DateField
                                name='posting_date'
                                label={"Posting Date"}
                                isRequired
                                inputProps={{ autoFocus: false }}
                            />
                            <DateField
                                name='cheque_date'
                                label={"Reference Date"}
                                isRequired
                                inputProps={{ autoFocus: false }}
                            />
                        </div>
                        <DataField name='cheque_no' label={"Reference No"} isRequired inputProps={{ autoFocus: false }} />
                    </div>
                </div>

                <div>

                </div>

                <Separator />
                <div className='flex flex-col gap-2'>
                    <div className='grid grid-cols-2 gap-4'>
                        <SmallTextField
                            name='user_remark'
                            label={"Remarks"}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={'outline'} disabled={loading}>{_("Cancel")}</Button>
                    </DialogClose>
                    <Button type='submit' disabled={loading}>{_("Submit")}</Button>
                </DialogFooter>
            </div>
        </form>
    </Form>

}


export default BankEntryModal
