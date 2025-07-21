import BankBalance from "@/components/features/BankReconciliation/BankBalance"
import BankClearanceSummary from "@/components/features/BankReconciliation/BankClearanceSummary"
import BankPicker from "@/components/features/BankReconciliation/BankPicker"
import BankTransactions from "@/components/features/BankReconciliation/BankTransactionList"
import IncorrectlyClearedEntries from "@/components/features/BankReconciliation/IncorrectlyClearedEntries"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { H1 } from "@/components/ui/typography"
import { useLayoutEffect, useRef, useState } from "react"


const BankReconciliation = () => {

    const [headerHeight, setHeaderHeight] = useState(0)

    const ref = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        if (ref.current) {
            setHeaderHeight(ref.current.clientHeight)
        }
    }, [])

    const remainingHeightAfterTabs = window.innerHeight - headerHeight - 226

    return (
        <div className="p-4 flex flex-col gap-4">
            <H1 className="text-2xl">Bank Reconciliation</H1>

            <BankPicker />
            <BankBalance />

            <Tabs defaultValue="Match and Reconcile">
                <TabsList className="w-full">
                    <TabsTrigger value="Match and Reconcile">Match and Reconcile</TabsTrigger>
                    <TabsTrigger value="Bank Reconciliation Statement">Bank Reconciliation Statement</TabsTrigger>
                    <TabsTrigger value="Bank Transactions">Bank Transactions</TabsTrigger>
                    <TabsTrigger value="Bank Clearance Summary">Bank Clearance Summary</TabsTrigger>
                    <TabsTrigger value="Incorrectly Cleared Entries">Incorrectly Cleared Entries</TabsTrigger>
                </TabsList>
                <TabsContent value="Match and Reconcile"></TabsContent>
                <TabsContent value="Bank Reconciliation Statement"></TabsContent>
                <TabsContent value="Bank Transactions">
                    <BankTransactions />
                </TabsContent>
                <TabsContent value="Bank Clearance Summary">
                    <BankClearanceSummary />
                </TabsContent>
                <TabsContent value="Incorrectly Cleared Entries">
                    <IncorrectlyClearedEntries />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default BankReconciliation