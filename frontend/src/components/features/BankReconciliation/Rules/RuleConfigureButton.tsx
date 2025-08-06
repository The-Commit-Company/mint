import { Button } from "@/components/ui/button"
import ErrorBanner from "@/components/ui/error-banner"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import _ from "@/lib/translate"
import { MintBankTransactionRule } from "@/types/Mint/MintBankTransactionRule"
import { FrappeConfig, FrappeContext, useFrappeGetDocList } from "frappe-react-sdk"
import { ArrowDownRight, ArrowDownUp, ArrowLeftIcon, ArrowUpRight, MoreVertical, Trash2, WorkflowIcon } from "lucide-react"
import { useContext, useState } from "react"
import CreateNewRule from "./CreateNewRule"
import EditRule from "./EditRule"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const RuleConfigureButton = () => {

    const [selectedRule, setSelectedRule] = useState<string | null>(null)
    const [isNewRule, setIsNewRule] = useState(false)

    const [isOpen, setIsOpen] = useState(false)

    const onOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedRule(null)
            setIsNewRule(false)
        }

        setIsOpen(open)
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button size='icon' variant='outline' title={_("Transaction Matching Rules")}>
                    <WorkflowIcon />
                </Button>
            </SheetTrigger>
            <SheetContent className="min-w-xl">
                <SheetHeader>
                    <div className="flex items-center gap-2">
                        {selectedRule && <Button variant='ghost' size='icon' className="p-0" onClick={() => setSelectedRule(null)}>
                            <ArrowLeftIcon />
                        </Button>}

                        <SheetTitle>{selectedRule ? selectedRule : isNewRule ? _("New Rule") : _("Transaction Matching Rules")}</SheetTitle>
                    </div>

                    <SheetDescription className={selectedRule ? "sr-only" : ""}>
                        {selectedRule ? _("Edit this rule") : isNewRule ? _("Create a new rule to automatically classify transactions.") : _("Set up rules to automatically classify transactions.")}
                    </SheetDescription>
                </SheetHeader>
                {selectedRule ? <EditRule onClose={() => setSelectedRule(null)} ruleID={selectedRule} /> : isNewRule ? <CreateNewRule onCreate={() => setIsNewRule(false)} /> : <RuleList setSelectedRule={setSelectedRule} setIsNewRule={setIsNewRule} />}
            </SheetContent>
        </Sheet>
    )
}

const RuleList = ({ setSelectedRule, setIsNewRule }: { setSelectedRule: (rule: string) => void, setIsNewRule: (isNewRule: boolean) => void }) => {

    const { data, error, isLoading } = useFrappeGetDocList<MintBankTransactionRule>("Mint Bank Transaction Rule", {
        fields: ["name", "rule_name", "rule_description", "transaction_type"],
        orderBy: {
            field: 'priority',
            order: 'asc'
        }
    })

    const { db } = useContext(FrappeContext) as FrappeConfig

    const onDeleteRule = (ruleID: string) => {

        toast.promise(db.deleteDoc("Mint Bank Transaction Rule", ruleID), {
            loading: _("Deleting rule..."),
            success: _("Rule deleted."),
            error: _("Failed to delete rule.")
        })
    }

    return (
        <>
            <div className="px-4">
                {isLoading && <div className="flex flex-col gap-2">
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                </div>}

                {error && <ErrorBanner error={error} />}

                {data && data.length === 0 && <div className="flex flex-col justify-center h-48 gap-4 items-center text-center">
                    {_("No rules found")}

                    <Button type='button' onClick={() => setIsNewRule(true)}>
                        {_("Create a new rule")}
                    </Button>
                </div>}

                {data && data.length > 0 && <ul className="space-2 divide-y divide-border">
                    {data?.map((rule) => (
                        <li key={rule.name}>
                            <div className="flex justify-between items-center py-2 h-full">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant='link'
                                            className="p-0 h-fit text-foreground text-left font-medium cursor-pointer"
                                            onClick={() => setSelectedRule(rule.name)}>
                                            {rule.rule_name}
                                        </Button>
                                        <div title={rule.transaction_type === "Any" ? _("Any") : rule.transaction_type === "Withdrawal" ? _("Withdrawal") : _("Deposit")}>
                                            {rule.transaction_type === "Any" ? <ArrowDownUp className="text-muted-foreground w-5 h-5" /> : rule.transaction_type === "Withdrawal" ? <ArrowDownRight className="text-destructive w-5 h-5" /> : <ArrowUpRight className="text-green-500 w-5 h-5" />}
                                        </div>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {rule.rule_description}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 h-full justify-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant='ghost' size='icon'>
                                                <MoreVertical />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem variant="destructive" onClick={() => onDeleteRule(rule.name)}>
                                                <Trash2 />
                                                {_("Delete")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>}
            </div>
            <SheetFooter>
                <Button type='button' onClick={() => setIsNewRule(true)}>
                    {_("Create a new rule")}
                </Button>
                <SheetClose asChild>
                    <Button type='button' variant='outline'>
                        {_("Close")}
                    </Button>
                </SheetClose>
            </SheetFooter>
        </>
    )
}

export default RuleConfigureButton