import BankPicker from "@/components/features/BankReconciliation/BankPicker"
import { H1 } from "@/components/ui/typography"


const BankReconciliation = () => {
    return (
        <div className="p-4 flex flex-col gap-4">
            <H1 className="text-2xl">Bank Reconciliation</H1>

            <BankPicker />
        </div>
    )
}

export default BankReconciliation