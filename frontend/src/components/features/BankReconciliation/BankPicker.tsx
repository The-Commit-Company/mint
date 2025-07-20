import { useAtom, useSetAtom } from "jotai"
import { SelectedBank, selectedBankAccountAtom } from "./bankRecAtoms"
import { useCallback } from "react"
import { useGetBankAccounts } from "./utils"
import { cn } from "@/lib/utils"
import { Landmark } from "lucide-react"
import { H4 } from "@/components/ui/typography"
import { getTimeago } from "@/lib/date"

const BankPicker = () => {

    const setSelectedBank = useSetAtom(selectedBankAccountAtom)

    const onLoadingSuccess = useCallback((data?: SelectedBank[]) => {
        if (!data) return
        if (data.length === 1) {
            setSelectedBank(data[0])
        } else if (data.length > 1) {
            const defaultBank = data.find((bank: SelectedBank) => bank.is_default)
            if (defaultBank) {
                setSelectedBank(defaultBank)
            }
        }
    }, [setSelectedBank])

    const { banks, isLoading, error } = useGetBankAccounts(onLoadingSuccess)

    if (isLoading) {
        return null
    }

    if (error) {
        return 'Error'
    }
    return (
        <div className="flex gap-2 items-stretch w-full flex-wrap overflow-x-auto">
            {
                banks?.map((bank) => (
                    <BankPickerItem key={bank.name} bank={bank} />
                ))
            }
        </div>
    )
}

const BankPickerItem = ({ bank }: { bank: SelectedBank }) => {

    const [selectedBank, setSelectedBank] = useAtom(selectedBankAccountAtom)

    const isSelected = selectedBank?.name === bank.name

    return <div
        role="button"
        title={`Select ${bank.account_name}`}
        onClick={() => setSelectedBank(bank)}
        className={cn('rounded-md border-2 border-gray-200 min-w-80 relative p-2 bg-card overflow-hidden cursor-pointer',
            isSelected ? 'border-primary bg-primary-foreground' : 'hover:bg-gray-50'
        )}
    >
        {bank.logo ? <img
            src={`/assets/maester/maester/${bank.logo}`}
            alt={bank.bank || bank.name || ''}
            className="w-18 h-10 object-contain"
        /> : <div className="rounded-md flex items-center h-10 gap-2">
            <Landmark size={'30px'} />
            <H4 className="text-base mb-0">{bank.bank}</H4>
        </div>}

        <div className="flex flex-col gap-0.5">
            <span className="tracking-tight text-sm font-medium">{bank.account_name}</span>
            <span title="GL Account" className="text-sm">{bank.account}</span>

            {bank.last_integration_date && <span className="text-xs text-muted-foreground">Last Synced Transaction: {getTimeago(bank.last_integration_date)}</span>}
        </div>

        <div className="absolute -top-1 right-0">
            <span className={cn("uppercase rounded-bl-sm text-xs tracking-tight font-semibold py-1 px-1.5",
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-secondary-foreground/70'
            )}>
                {bank.account_type?.slice(0, 24)}
            </span>
        </div>

    </div>
}

export default BankPicker