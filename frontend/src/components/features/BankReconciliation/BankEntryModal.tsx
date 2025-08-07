import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { bankRecRecordJournalEntryModalAtom, bankRecSelectedTransactionAtom, bankRecUnreconcileModalAtom, selectedBankAccountAtom } from "./bankRecAtoms"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogClose } from "@/components/ui/dialog"
import _ from "@/lib/translate"
import { UnreconciledTransaction, useGetRuleForTransaction, useRefreshUnreconciledTransactions } from "./utils"
import { useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form"
import { JournalEntry } from "@/types/Accounts/JournalEntry"
import { getCompanyCostCenter, getCompanyCurrency } from "@/lib/company"
import { FrappeConfig, FrappeContext, useFrappePostCall } from "frappe-react-sdk"
import { toast } from "sonner"
import ErrorBanner from "@/components/ui/error-banner"
import { Button } from "@/components/ui/button"
import SelectedTransactionDetails from "./SelectedTransactionDetails"
import { AccountFormField, CurrencyFormField, DataField, DateField, LinkFormField, PartyTypeFormField, SmallTextField } from "@/components/ui/form-elements"
import { Form } from "@/components/ui/form"
import { useCallback, useContext, useMemo, useRef, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/numbers"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import SelectedTransactionsTable from "./SelectedTransactionsTable"

const BankEntryModal = () => {

    const [isOpen, setIsOpen] = useAtom(bankRecRecordJournalEntryModalAtom)

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className='min-w-[95vw]'>
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

    if (selectedTransaction.length === 1) {
        return <BankEntryForm
            selectedTransaction={selectedTransaction[0]} />
    }

    return <BulkBankEntryForm
        selectedTransactions={selectedTransaction}
    />

}

const BulkBankEntryForm = ({ selectedTransactions }: { selectedTransactions: UnreconciledTransaction[] }) => {

    const form = useForm<{
        account: string
    }>({
        defaultValues: {
            account: ''
        }
    })

    const { call, loading, error } = useFrappePostCall('mint.apis.bank_reconciliation.create_bulk_bank_entry_and_reconcile')

    const onReconcile = useRefreshUnreconciledTransactions()

    const setIsOpen = useSetAtom(bankRecRecordJournalEntryModalAtom)

    const onSubmit = (data: { account: string }) => {

        call({
            bank_transactions: selectedTransactions.map(transaction => transaction.name),
            account: data.account
        }).then(() => {

            toast.success(_("Bank Entries Created"), {
                duration: 4000,
            })

            // Set this to the last selected transaction
            onReconcile(selectedTransactions[selectedTransactions.length - 1])
            setIsOpen(false)
        })
    }

    return <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4">
                {error && <ErrorBanner error={error} />}
                <SelectedTransactionsTable />

                <div className="grid grid-cols-3 gap-4">
                    <AccountFormField
                        name='account'
                        filterFunction={(acc) => {
                            // Do not allow payable and receivable accounts
                            return acc.account_type !== 'Payable' && acc.account_type !== 'Receivable'
                        }}
                        label='Account'
                        isRequired
                    />
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

    const selectedBankAccount = useAtomValue(selectedBankAccountAtom)

    const { data: rule } = useGetRuleForTransaction(selectedTransaction)

    const setIsOpen = useSetAtom(bankRecRecordJournalEntryModalAtom)

    const onClose = () => {
        setIsOpen(false)
    }

    const isWithdrawal = (selectedTransaction.withdrawal && selectedTransaction.withdrawal > 0) ? true : false

    const form = useForm<BankEntryFormData>({
        defaultValues: {
            voucher_type: selectedBankAccount?.is_credit_card ? 'Credit Card Entry' : 'Bank Entry',
            cheque_date: selectedTransaction.date,
            posting_date: selectedTransaction.date,
            cheque_no: (selectedTransaction.reference_number || selectedTransaction.description || '').slice(0, 140),
            user_remark: selectedTransaction.description,
            entries: [
                {
                    account: rule?.account ?? '',
                    amount: selectedTransaction.unallocated_amount,
                    party_type: '',
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
                                rules={{
                                    required: _("Reference Date is required"),
                                }}
                            />
                        </div>
                        <DataField name='cheque_no' label={"Reference No"} isRequired inputProps={{ autoFocus: false }}
                            rules={{
                                required: _("Reference No is required"),
                            }} />
                    </div>
                </div>

                <div>
                    <Entries company={selectedTransaction.company ?? ''} isWithdrawal={isWithdrawal} amount={selectedTransaction.unallocated_amount} currency={selectedTransaction.currency ?? getCompanyCurrency(selectedTransaction.company ?? '')} />
                </div>
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

const Entries = ({ company, isWithdrawal, amount, currency }: { company: string, isWithdrawal: boolean, amount?: number, currency: string }) => {

    const { getValues, setValue, control } = useFormContext<BankEntryFormData>()

    const { call } = useContext(FrappeContext) as FrappeConfig

    const costCenterMapRef = useRef<Record<string, string>>({})

    const partyMapRef = useRef<Record<string, string>>({})

    const onPartyChange = (value: string, index: number) => {
        // Get the account for the party type
        if (value) {
            if (partyMapRef.current[value]) {
                setValue(`entries.${index}.account`, partyMapRef.current[value])
            } else {
                call.get('erpnext.accounts.party.get_party_account', {
                    party: value,
                    party_type: getValues(`entries.${index}.party_type`),
                    company: company
                }).then((result: { message: string }) => {
                    setValue(`entries.${index}.account`, result.message)
                    partyMapRef.current[value] = result.message
                })
            }
        } else {
            setValue(`entries.${index}.account`, '')
        }
    }

    const onAccountChange = (value: string, index: number) => {
        // If it's an income or expense account, get the default cost center
        if (value) {
            if (costCenterMapRef.current[value]) {
                setValue(`entries.${index}.cost_center`, costCenterMapRef.current[value])
            } else {
                call.get('mint.apis.bank_reconciliation.get_account_defaults', {
                    account: value
                }).then((result: { message: string }) => {
                    costCenterMapRef.current[value] = result.message
                    setValue(`entries.${index}.cost_center`, result.message)
                })
            }
        } else {
            setValue(`entries.${index}.cost_center`, '')
        }
    }

    const { fields, append, remove } = useFieldArray({
        control: control,
        name: 'entries'
    })

    const onAdd = useCallback(() => {
        const existingEntries = getValues('entries')
        const remainingAmount = (amount ?? 0) - existingEntries.reduce((acc, curr) => acc + curr.amount, 0)
        append({
            party_type: '',
            party: '',
            account: '',
            amount: remainingAmount,
            cost_center: getCompanyCostCenter(company) ?? ''
        }, {
            focusName: `entries.${existingEntries.length}.account`
        })
    }, [company, append, amount, getValues])

    const [selectedRows, setSelectedRows] = useState<number[]>([])

    const onSelectRow = useCallback((index: number) => {
        setSelectedRows(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index)
            }
            return [...prev, index]
        })
    }, [])

    const onSelectAll = useCallback(() => {
        setSelectedRows(prev => {
            if (prev.length === fields.length) {
                return []
            }
            return [...fields.map((_, index) => index)]
        })
    }, [fields])

    const onRemove = useCallback(() => {
        remove(selectedRows)
        setSelectedRows([])
    }, [remove, selectedRows])



    return <div className="flex flex-col gap-2">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead><Checkbox
                        disabled={fields.length === 0}
                        // Make this accessible to screen readers
                        aria-label={_("Select all")}
                        checked={selectedRows.length > 0 && selectedRows.length === fields.length}
                        onCheckedChange={onSelectAll} /></TableHead>
                    <TableHead>{_("Party")}</TableHead>
                    <TableHead>{_("Account")}</TableHead>
                    <TableHead>{_("Cost Center")}</TableHead>
                    <TableHead>{_("Remarks")}</TableHead>
                    <TableHead className="text-right">{_("Amount")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {fields.map((field, index) => (
                    <TableRow key={field.id}>
                        <TableCell>
                            <Checkbox
                                checked={selectedRows.includes(index)}
                                onCheckedChange={() => onSelectRow(index)}
                                // Make this accessible to screen readers
                                aria-label={_("Select row {0}", [String(index + 1)])}
                            />
                        </TableCell>

                        <TableCell className="align-top">
                            <div className="flex">
                                <PartyTypeFormField
                                    name={`entries.${index}.party_type`}
                                    label={"Party Type"}
                                    isRequired
                                    hideLabel
                                    inputProps={{
                                        type: isWithdrawal ? 'Payable' : 'Receivable',
                                        triggerProps: {
                                            className: 'rounded-r-none',
                                            tabIndex: -1
                                        },
                                    }} />
                                <PartyField index={index} onChange={onPartyChange} />
                            </div>

                        </TableCell>
                        <TableCell className="align-top">
                            <AccountFormField
                                name={`entries.${index}.account`}
                                label={_("Account")}
                                rules={{
                                    required: _("Account is required"),
                                    onChange: (value) => {
                                        onAccountChange(value, index)
                                    }
                                }}
                                buttonClassName="min-w-64"
                                isRequired
                                hideLabel
                            />
                        </TableCell>
                        <TableCell className="align-top">
                            <LinkFormField
                                doctype="Cost Center"
                                name={`entries.${index}.cost_center`}
                                label={_("Cost Center")}
                                filters={[["company", "=", company], ["is_group", "=", 0], ["disabled", "=", 0]]}
                                buttonClassName="min-w-48"
                                hideLabel
                            />
                        </TableCell>
                        <TableCell className="align-top">
                            <DataField
                                name={`entries.${index}.user_remark`}
                                label={_("Remarks")}
                                inputProps={{
                                    placeholder: _("e.g. Bank Charges"),
                                    className: 'min-w-64'
                                }}
                                hideLabel
                            />
                        </TableCell>
                        <TableCell className="text-right align-top">
                            <CurrencyFormField
                                name={`entries.${index}.amount`}
                                label={"Amount"}
                                isRequired
                                hideLabel
                                currency={currency}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        <div className="flex justify-between gap-2">
            <div className="flex gap-2 justify-end">
                <div>
                    <Button size='sm' type='button' variant={'outline'} onClick={onAdd}><Plus /> {_("Add Row")}</Button>
                </div>
                {selectedRows.length > 0 && <div>
                    <Button size='sm' type='button' variant={'destructive'} onClick={onRemove}><Trash2 /> {_("Remove")}</Button>
                </div>}
            </div>
            <Summary amount={amount} currency={currency} addRow={onAdd} />
        </div>
    </div>

}

const PartyField = ({ index, onChange }: { index: number, onChange: (value: string, index: number) => void }) => {

    const { control } = useFormContext<BankEntryFormData>()

    const party_type = useWatch({
        control,
        name: `entries.${index}.party_type`
    })

    if (!party_type) {
        return <DataField
            name={`entries.${index}.party`}
            label={"Party"}
            isRequired
            inputProps={{
                disabled: true,
                className: 'rounded-l-none border-l-0 min-w-64'
            }}
            hideLabel
        />
    }

    return <LinkFormField
        name={`entries.${index}.party`}
        label={"Party"}
        rules={{
            onChange: (value) => {
                onChange(value, index)
            }
        }}
        hideLabel
        buttonClassName="rounded-l-none border-l-0 min-w-64"
        doctype={party_type}

    />
}

const Summary = ({ amount, currency, addRow }: { amount?: number, currency: string, addRow: () => void }) => {

    const { control } = useFormContext<BankEntryFormData>()

    const entries = useWatch({ control, name: 'entries' })

    const total = useMemo(() => {
        return entries.reduce((acc, curr) => acc + curr.amount, 0)
    }, [entries])

    const onAddRow = useCallback(() => {
        addRow()
    }, [addRow])

    const TextComponent = ({ className, children }: { className?: string, children: React.ReactNode }) => {
        return <span className={cn("w-32 text-right font-medium text-sm font-mono", className)}>{children}</span>
    }

    return <div className="flex flex-col gap-2 items-end">
        <div className="flex gap-2 justify-between">
            <TextComponent>{_("Split amount")}</TextComponent>
            <TextComponent>{formatCurrency(total, currency)}</TextComponent>
        </div>
        <div className="flex gap-2 justify-between">
            <TextComponent>{_("Original amount")}</TextComponent>
            <TextComponent>{formatCurrency(amount, currency)}</TextComponent>
        </div>
        {(amount ?? 0) !== total && <div className="flex gap-2 justify-between">
            <TextComponent>{_("Difference")}</TextComponent>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type='button' variant='link' className="p-0 text-destructive underline h-fit" role='button' onClick={onAddRow}>
                        <TextComponent className='text-destructive'>{formatCurrency((amount ?? 0) - total, currency)}</TextComponent>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {_("Add a row to with the difference amount")}
                </TooltipContent>
            </Tooltip>


        </div>}

    </div>

}


export default BankEntryModal
