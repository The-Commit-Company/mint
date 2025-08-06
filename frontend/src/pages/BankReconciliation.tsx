import BankBalance from "@/components/features/BankReconciliation/BankBalance"
import BankClearanceSummary from "@/components/features/BankReconciliation/BankClearanceSummary"
import BankPicker from "@/components/features/BankReconciliation/BankPicker"
import BankRecDateFilter from "@/components/features/BankReconciliation/BankRecDateFilter"
import BankReconciliationStatement from "@/components/features/BankReconciliation/BankReconciliationStatement"
import BankTransactions from "@/components/features/BankReconciliation/BankTransactionList"
import BankTransactionUnreconcileModal from "@/components/features/BankReconciliation/BankTransactionUnreconcileModal"
import CompanySelector from "@/components/features/BankReconciliation/CompanySelector"
import IncorrectlyClearedEntries from "@/components/features/BankReconciliation/IncorrectlyClearedEntries"
import MatchAndReconcile from "@/components/features/BankReconciliation/MatchAndReconcile"
import RuleConfigureButton from "@/components/features/BankReconciliation/Rules/RuleConfigureButton"
// import Settings from "@/components/features/Settings/Settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { H1 } from "@/components/ui/typography"
import _ from "@/lib/translate"
import { useLayoutEffect, useRef, useState } from "react"


const BankReconciliation = () => {

    const [headerHeight, setHeaderHeight] = useState(0)

    const ref = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        if (ref.current) {
            setHeaderHeight(ref.current.clientHeight)
        }
    }, [])

    const remainingHeightAfterTabs = window.innerHeight - headerHeight - 324

    return (
        <div className="p-4 flex flex-col gap-4">
            <div ref={ref} className="flex flex-col gap-4">
                <div className="flex justify-between">
                    <H1 className="text-base font-medium"><span className="text-4xl font-extrabold text-emerald-500">mint</span>&nbsp; {_("Bank Reconciliation")}</H1>
                    <div className="flex items-center gap-2">
                        <RuleConfigureButton />
                        {/* <Settings /> */}
                        <CompanySelector />
                        <BankRecDateFilter />
                    </div>
                </div>
                <BankPicker />
                <BankBalance />
            </div>
            <Tabs defaultValue="Match and Reconcile">
                <TabsList className="w-full">
                    <TabsTrigger value="Match and Reconcile">{_("Match and Reconcile")}</TabsTrigger>
                    <TabsTrigger value="Bank Reconciliation Statement">{_("Bank Reconciliation Statement")}</TabsTrigger>
                    <TabsTrigger value="Bank Transactions">{_("Bank Transactions")}</TabsTrigger>
                    <TabsTrigger value="Bank Clearance Summary">{_("Bank Clearance Summary")}</TabsTrigger>
                    <TabsTrigger value="Incorrectly Cleared Entries">{_("Incorrectly Cleared Entries")}</TabsTrigger>
                </TabsList>
                <TabsContent value="Match and Reconcile">
                    <MatchAndReconcile contentHeight={remainingHeightAfterTabs} />
                </TabsContent>
                <TabsContent value="Bank Reconciliation Statement">
                    <BankReconciliationStatement />
                </TabsContent>
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

            <BankTransactionUnreconcileModal />
        </div>
    )
}

export default BankReconciliation