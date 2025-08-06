import { Button } from "@/components/ui/button"
import ErrorBanner from "@/components/ui/error-banner"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import _ from "@/lib/translate"
import { MintBankTransactionRule } from "@/types/Mint/MintBankTransactionRule"
import { FrappeConfig, FrappeContext, useFrappeGetDocList } from "frappe-react-sdk"
import { ArrowDownRight, ArrowDownUp, ArrowLeftIcon, ArrowUpRight, MoreVertical, Trash2, WorkflowIcon, GripVertical } from "lucide-react"
import { useContext, useState } from "react"
import CreateNewRule from "./CreateNewRule"
import EditRule from "./EditRule"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
                        {(selectedRule || isNewRule) && <Button variant='ghost' size='icon' className="p-0" onClick={() => {
                            setSelectedRule(null)
                            setIsNewRule(false)
                        }}>
                            <ArrowLeftIcon />
                        </Button>}

                        <SheetTitle>{selectedRule ? selectedRule : isNewRule ? _("New Rule") : _("Transaction Matching Rules")}</SheetTitle>
                    </div>

                    <SheetDescription className={selectedRule ? "sr-only" : ""}>
                        {selectedRule ? _("Edit this rule") : isNewRule ? _("Create a new rule to automatically classify transactions.") : _("Set up rules to automatically classify transactions. Drag and drop rules to reorder their priority.")}
                    </SheetDescription>
                </SheetHeader>
                {selectedRule ? <EditRule onClose={() => setSelectedRule(null)} ruleID={selectedRule} /> : isNewRule ? <CreateNewRule onCreate={() => setIsNewRule(false)} /> : <RuleList setSelectedRule={setSelectedRule} setIsNewRule={setIsNewRule} />}
            </SheetContent>
        </Sheet>
    )
}

const RuleList = ({ setSelectedRule, setIsNewRule }: { setSelectedRule: (rule: string) => void, setIsNewRule: (isNewRule: boolean) => void }) => {

    const { data, error, isLoading, mutate } = useFrappeGetDocList<MintBankTransactionRule>("Mint Bank Transaction Rule", {
        fields: ["name", "rule_name", "rule_description", "transaction_type", "priority"],
        orderBy: {
            field: 'priority',
            order: 'asc'
        }
    })

    const { db } = useContext(FrappeContext) as FrappeConfig

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const onDeleteRule = (ruleID: string) => {
        toast.promise(db.deleteDoc("Mint Bank Transaction Rule", ruleID), {
            loading: _("Deleting rule..."),
            success: _("Rule deleted."),
            error: _("Failed to delete rule.")
        })
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (active.id !== over?.id && data) {
            const oldIndex = data.findIndex((rule) => rule.name === active.id)
            const newIndex = data.findIndex((rule) => rule.name === over?.id)

            const newData = arrayMove(data, oldIndex, newIndex)

            // Update priorities based on new order
            const updatePromises = newData.map((rule, index) => {
                const newPriority = index + 1
                if (rule.priority !== newPriority) {
                    return db.setValue("Mint Bank Transaction Rule", rule.name, "priority", newPriority)
                }
                return Promise.resolve()
            })

            try {
                await Promise.all(updatePromises)
                toast.success(_("Rule priorities updated"))
                mutate() // Refresh the data
            } catch (error) {
                toast.error(_("Failed to update rule priorities"))
                console.error("Error updating priorities:", error)
            }
        }
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

                {data && data.length > 0 && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={data.map(rule => rule.name)}
                            strategy={verticalListSortingStrategy}
                        >
                            <ul className="space-2 divide-y divide-border">
                                {data?.map((rule) => (
                                    <SortableRuleItem
                                        key={rule.name}
                                        rule={rule}
                                        setSelectedRule={setSelectedRule}
                                        onDeleteRule={onDeleteRule}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                )}
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

const SortableRuleItem = ({
    rule,
    setSelectedRule,
    onDeleteRule
}: {
    rule: MintBankTransactionRule
    setSelectedRule: (rule: string) => void
    onDeleteRule: (ruleID: string) => void
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: rule.name })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <li ref={setNodeRef} style={style}>
            <div className="flex justify-between items-center py-2 h-full">
                <div className="flex items-center gap-2">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                        title={_("Drag to reorder")}
                    >
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center text-xs font-mono">
                        {rule.priority}
                    </Badge>
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
    )
}

export default RuleConfigureButton