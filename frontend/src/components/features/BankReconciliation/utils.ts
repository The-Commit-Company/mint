import { bankRecDateAtom, bankRecSelectedTransactionAtom, SelectedBank, selectedBankAccountAtom } from './bankRecAtoms'
import { useAtomValue, useSetAtom } from 'jotai'
import { useMemo } from 'react'
import { useFrappeGetCall, useFrappeGetDocList, useFrappePostCall, useSWRConfig } from 'frappe-react-sdk'
import { BankTransaction } from '@/types/Accounts/BankTransaction'
import { BankAccount } from '@/types/Accounts/BankAccount'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { BANK_LOGOS } from './logos'
import { getErrorMessage } from '@/lib/frappe'

const useCurrentCompany = () => {
    return 'The Commit Company'
}

export const useGetAccountOpeningBalance = () => {

    const companyID = useCurrentCompany()
    const bankAccount = useAtomValue(selectedBankAccountAtom)

    const dates = useAtomValue(bankRecDateAtom)

    const args = useMemo(() => {

        return {
            bank_account: bankAccount?.name,
            company: companyID,
            till_date: dayjs(dates.fromDate).subtract(1, 'days').format('YYYY-MM-DD'),
        }

    }, [companyID, bankAccount?.name, dates.fromDate])

    return useFrappeGetCall('erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_account_balance', args, undefined, {
        revalidateOnFocus: false
    })
}

export const useGetAccountClosingBalance = () => {

    const companyID = useCurrentCompany()
    const bankAccount = useAtomValue(selectedBankAccountAtom)

    const dates = useAtomValue(bankRecDateAtom)

    const args = useMemo(() => {

        return {
            bank_account: bankAccount?.name,
            company: companyID,
            till_date: dates.toDate,
        }

    }, [companyID, bankAccount?.name, dates.toDate])

    return useFrappeGetCall('erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_account_balance', args,
        `bank-reconciliation-account-closing-balance-${bankAccount?.name}-${dates.toDate}`,
        {
            revalidateOnFocus: false
        }
    )

}

export type UnreconciledTransaction = Pick<BankTransaction, 'name' | 'date' | 'withdrawal' | 'deposit' | 'currency' | 'description' | 'status' | 'transaction_type' | 'reference_number' | 'party_type' | 'party' | 'bank_account' | 'company' | 'unallocated_amount'>


export const useGetUnreconciledTransactions = () => {
    const bankAccount = useAtomValue(selectedBankAccountAtom)
    const dates = useAtomValue(bankRecDateAtom)
    return useFrappeGetCall<{ message: UnreconciledTransaction[] }>('emotive_app.api.bank_reconciliation.bank_reconciliation.get_bank_transactions', {
        bank_account: bankAccount?.name,
        from_date: dates.fromDate,
        to_date: dates.toDate
    }, `bank-reconciliation-unreconciled-transactions-${bankAccount?.name}-${dates.fromDate}-${dates.toDate}`, {
        revalidateOnFocus: false
    })
}

export interface LinkedPayment {
    rank: number,
    doctype: string,
    name: string,
    paid_amount: number,
    reference_no: string,
    reference_date: string,
    posting_date: string,
    party_type?: string,
    party?: string,
    currency: string
}

export const useGetBankTransactions = () => {
    const bankAccount = useAtomValue(selectedBankAccountAtom)
    const dates = useAtomValue(bankRecDateAtom)
    return useFrappeGetCall<{ message: BankTransaction[] }>('emotive_app.api.bank_reconciliation.bank_reconciliation.get_bank_transactions', {
        bank_account: bankAccount?.name,
        from_date: dates.fromDate,
        to_date: dates.toDate,
        all_transactions: true
    }, `bank-reconciliation-bank-transactions-${bankAccount?.name}-${dates.fromDate}-${dates.toDate}`)
}


export const useGetVouchersForTransaction = (transaction: UnreconciledTransaction) => {

    const dates = useAtomValue(bankRecDateAtom)

    return useFrappeGetCall<{ message: LinkedPayment[] }>('erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_linked_payments', {
        bank_transaction_name: transaction.name,

        // TODO: Add support for other document types
        document_types: ['payment_entry', 'journal_entry'],
        from_date: dates.fromDate,
        to_date: dates.toDate,
        filter_by_reference_date: 0
    }, `bank-reconciliation-vouchers-${transaction.name}-${dates.fromDate}-${dates.toDate}`, {
        revalidateOnFocus: false
    })
}

/**
 * Common hook to refresh the unreconciled transactions list after a transaction is reconciled
 * @returns function to call to refresh the unreconciled transactions list AFTER the operation is done
 */
export const useRefreshUnreconciledTransactions = () => {

    const selectedBank = useAtomValue(selectedBankAccountAtom)
    const dates = useAtomValue(bankRecDateAtom)
    const setSelectedTransaction = useSetAtom(bankRecSelectedTransactionAtom(selectedBank?.name || ''))

    const { mutate } = useSWRConfig()

    const { data: unreconciledTransactions } = useGetUnreconciledTransactions()

    /** 
     * This function should be called after a transaction is reconciled
     * It will get the next unreconciled transaction and select it
     * And then refresh the balance + unreconciled transactions list
     */
    const onReconcileTransaction = (transaction: UnreconciledTransaction, updatedTransaction?: BankTransaction) => {

        // If the updated transaction has an unallocated amount of 0, then we need to select the next unreconciled transaction
        if (updatedTransaction && updatedTransaction?.unallocated_amount !== 0) {
            mutate(`bank-reconciliation-unreconciled-transactions-${selectedBank?.name}-${dates.fromDate}-${dates.toDate}`)
            mutate(`bank-reconciliation-account-closing-balance-${selectedBank?.name}-${dates.toDate}`)
            // Update the matching vouchers for the selected transaction
            mutate(`bank-reconciliation-vouchers-${transaction.name}-${dates.fromDate}-${dates.toDate}`)
            return
        }

        const currentIndex = unreconciledTransactions?.message.findIndex(t => t.name === transaction.name)
        let nextTransaction = null

        if (currentIndex) {
            // Check if there is a next transaction
            if (currentIndex < (unreconciledTransactions?.message.length || 0) - 1) {
                nextTransaction = unreconciledTransactions?.message[currentIndex + 1]
            }
        }

        // We need to select the next unreconciled transaction for a better UX
        mutate(`bank-reconciliation-unreconciled-transactions-${selectedBank?.name}-${dates.fromDate}-${dates.toDate}`)
            .then(res => {
                if (nextTransaction) {
                    // Check if next transaction is there in the response
                    const nextTransactionObj = res?.message.find((t: UnreconciledTransaction) => t.name === nextTransaction.name)
                    if (nextTransactionObj) {
                        setSelectedTransaction(nextTransactionObj)
                    } else {
                        // If the next transaction is not there in the response, we need to select the first unreconciled transaction
                        const firstTransaction = res?.message && res?.message.length > 0 ? res?.message[0] : null
                        if (firstTransaction) {
                            setSelectedTransaction(firstTransaction)
                        } else {
                            setSelectedTransaction(null)
                        }
                    }
                } else {
                    // If there is no next transaction, we need to select the first unreconciled transaction
                    const firstTransaction = res?.message && res?.message.length > 0 ? res?.message[0] : null
                    if (firstTransaction) {
                        setSelectedTransaction(firstTransaction)
                    } else {
                        setSelectedTransaction(null)
                    }
                }
            })
        mutate(`bank-reconciliation-account-closing-balance-${selectedBank?.name}-${dates.toDate}`)
    }

    return onReconcileTransaction

}

export const useReconcileTransaction = () => {

    const { call, loading } = useFrappePostCall<{ message: BankTransaction }>('emotive_app.api.bank_reconciliation.bank_reconciliation.reconcile_vouchers')

    const onReconcileTransaction = useRefreshUnreconciledTransactions()

    const reconcileTransaction = (transaction: UnreconciledTransaction, vouchers: LinkedPayment[]) => {

        call({
            bank_transaction_name: transaction.name,
            vouchers: JSON.stringify(vouchers.map(v => ({
                "payment_doctype": v.doctype,
                "payment_name": v.name,
                "amount": v.paid_amount
            })))
        }).then((res) => {
            onReconcileTransaction(transaction, res.message)
            toast.success("Reconciled", {
                duration: 500,
            })
        }).catch((error) => {
            console.error(error)
            toast.error("Error", {
                duration: 5000,
                description: getErrorMessage(error)
            })
        })
    }

    return { reconcileTransaction, loading }

}

export const useGetBankAccounts = (onSuccess?: (data?: Omit<SelectedBank, 'logo'>[]) => void, filterFn?: (bank: SelectedBank) => boolean) => {

    const companyID = useCurrentCompany()

    const { data, isLoading, error } = useFrappeGetDocList<BankAccount>('Bank Account', {
        filters: [
            ['is_company_account', '=', 1],
            ['company', '=', companyID],
            ['disabled', '=', 0]
        ],
        orderBy: {
            field: 'is_default',
            order: 'desc'
        },
        fields: ['name', 'bank_account_no', 'bank', 'account_type', 'account', 'is_default', 'account_name', 'account_subtype', 'integration_id', 'last_integration_date']
    }, undefined, {
        revalidateOnFocus: false,
        revalidateIfStale: false,
        onSuccess: onSuccess
    })

    const banks = useMemo(() => {
        // Match the bank account to the logo
        const banksWithLogos = data?.map((bank) => {
            const logo = BANK_LOGOS.find((logo) => logo.keywords.some((keyword) => bank.bank?.toLowerCase().includes(keyword.toLowerCase())))
            return {
                ...bank,
                logo: logo?.logo
            }
        }) ?? []

        if (filterFn) {
            return banksWithLogos.filter(filterFn)
        }

        return banksWithLogos
    }, [data, filterFn])

    return {
        banks,
        isLoading,
        error
    }

}