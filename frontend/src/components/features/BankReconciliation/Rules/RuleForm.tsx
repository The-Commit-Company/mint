import { Button } from "@/components/ui/button"
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { AccountFormField, CurrencyFormField, DataField, LinkFormField, PartyTypeFormField, SelectFormField, SmallTextField } from "@/components/ui/form-elements"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SelectItem } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { H4 } from "@/components/ui/typography"
import _ from "@/lib/translate"
import { cn } from "@/lib/utils"
import { MintBankTransactionRule } from "@/types/Mint/MintBankTransactionRule"
import { FrappeConfig, FrappeContext } from "frappe-react-sdk"
import { ArrowDownRight, ArrowDownUp, ArrowRightLeftIcon, ArrowUpRight, LandmarkIcon, PlusCircleIcon, ReceiptIcon, Trash2 } from "lucide-react"
import { ChangeEvent, useContext, useMemo } from "react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"

export const RuleForm = ({ isEdit = false }: { isEdit?: boolean }) => {

    return <div className="flex flex-col gap-4">
        <DataField
            name='rule_name'
            label={_("Rule Name")}
            disabled={isEdit}
            isRequired
            inputProps={{
                maxLength: 140,
                disabled: isEdit,
                placeholder: _("Bank Charges, Salary, etc."),
                autoFocus: true
            }}
            rules={{
                required: _("Rule name is required")
            }}
        />

        <CompanySelector />

        <SmallTextField
            name='rule_description'
            label={_("Rule Description")}
            inputProps={{
                placeholder: _("Any debit transaction with the keyword 'Bank Fee'.")
            }}
        />

        <TransactionTypeSelector />

        <div className="grid grid-cols-2 gap-2 pt-1">
            <CurrencyFormField
                name='min_amount'
                label={_("Minimum Amount")}
            />

            <CurrencyFormField
                name='max_amount'
                label={_("Maximum Amount")}
            />
        </div>

        <DescriptionRules />

        <Separator />

        <RuleAction />
    </div>
}

const CompanySelector = () => {

    const { setValue } = useFormContext<MintBankTransactionRule>()

    return <LinkFormField
        name='company'
        label={_("Company")}
        doctype="Company"
        isRequired
        rules={{
            required: _("Company is required"),
            onChange: () => {
                setValue('account', '')
            }
        }}
    />

}

/** Component to render a radio group as a toggle group with options for All, Withdrawal, Deposit */
const TransactionTypeSelector = () => {

    const { control } = useFormContext<MintBankTransactionRule>()

    return (
        <FormField
            control={control}
            name='transaction_type'
            render={({ field }) => (
                <FormItem className="space-y-1">
                    <FormLabel className="text-sm font-medium">
                        {_("Transaction Type")}<span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-3 gap-2 w-full"
                        >
                            <FormItem className="flex items-center">
                                <FormControl>
                                    <RadioGroupItem
                                        value="Any"
                                        className="peer sr-only hidden"
                                    />
                                </FormControl>
                                <FormLabel
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-all hover:bg-accent hover:text-accent-foreground",
                                        "peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:hover:bg-primary peer-data-[state=checked]:hover:text-primary-foreground"
                                    )}
                                >
                                    <ArrowDownUp className="w-5 h-5" />
                                    {_("All")}
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center">
                                <FormControl>
                                    <RadioGroupItem
                                        value="Withdrawal"
                                        className="peer sr-only hidden"
                                    />
                                </FormControl>
                                <FormLabel
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-all hover:bg-accent hover:text-accent-foreground",
                                        "peer-data-[state=checked]:bg-destructive peer-data-[state=checked]:text-white peer-data-[state=checked]:border-destructive peer-data-[state=checked]:hover:bg-destructive peer-data-[state=checked]:hover:text-white"
                                    )}
                                >
                                    <ArrowUpRight className="w-5 h-5 peer-data-[state=checked]:text-destructive-foreground" />
                                    {_("Withdrawal")}
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center">
                                <FormControl>
                                    <RadioGroupItem
                                        value="Deposit"
                                        className="peer sr-only hidden"
                                    />
                                </FormControl>
                                <FormLabel
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-all hover:bg-accent hover:text-accent-foreground",
                                        "peer-data-[state=checked]:bg-green-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:hover:bg-green-600 peer-data-[state=checked]:hover:text-white"
                                    )}
                                >
                                    <ArrowDownRight className="w-5 h-5 peer-data-[state=checked]:text-white" />
                                    {_("Deposit")}
                                </FormLabel>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )}
        />
    )
}

const DescriptionRules = () => {

    const { control } = useFormContext<MintBankTransactionRule>()

    const { fields, append, remove } = useFieldArray({
        control,
        name: "description_rules"
    })

    const addRow = () => {
        // @ts-expect-error - we don't need all fields here
        append({ check: "Contains" })
    }

    return (
        <div className="flex flex-col gap-2 pt-1">
            <span className="text-sm font-medium">{_("Rules to match against the transaction description")} <span className="text-destructive">*</span></span>
            {fields.map((field, index) => (
                <div key={field.id} className="flex w-full items-center gap-2">
                    <div className="min-w-36">
                        <SelectFormField
                            label={_("Type of check")}
                            hideLabel
                            name={`description_rules.${index}.check`}
                            rules={{
                                required: _("This is required")
                            }}>
                            <SelectItem value="Contains">{_("Contains")}</SelectItem>
                            <SelectItem value="Starts With">{_("Starts with")}</SelectItem>
                            <SelectItem value="Ends With">{_("Ends with")}</SelectItem>
                            <SelectItem value="Regex">{_("Regex")}</SelectItem>
                        </SelectFormField>
                    </div>
                    <div className="w-full">
                        <DataField
                            name={`description_rules.${index}.value`}
                            label={_("Value")}
                            hideLabel
                            inputProps={{
                                placeholder: _("Bank Fee, Salary, etc."),
                            }}
                        />
                    </div>
                    <div>
                        <Button variant="ghost" type='button' size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>
                </div>
            ))}

            <div>
                <Button variant="outline" type='button' onClick={addRow}>
                    <PlusCircleIcon className="w-4 h-4" />
                    {_("Add Rule")}
                </Button>
            </div>

        </div>
    )
}

const RuleAction = () => {

    const { control } = useFormContext<MintBankTransactionRule>()

    const classify_as = useWatch({ control, name: "classify_as" })
    const party_type = useWatch({ control, name: "party_type" })

    const accountType = useMemo(() => {
        if (classify_as === "Payment Entry") {
            return party_type === "Supplier" ? ["Payable"] : ["Receivable"]
        }

        if (classify_as === "Transfer") {
            return ["Bank", "Cash", "Temporary"]
        }

        return undefined

    }, [classify_as, party_type])

    return (
        <div className="flex flex-col gap-4">
            <H4 className="text-base font-medium text-foreground">{_("If rule matches, then:")}</H4>

            <SelectFormField
                name='classify_as'
                isRequired
                label={_("Suggest creating a")}
                formDescription={_("This will just suggest creating a new entry, and will not automatically create it.")}
                rules={{
                    required: _("This is required")
                }}
            >
                <SelectItem value="Bank Entry"><LandmarkIcon /> {_("Bank Entry")}</SelectItem>
                <SelectItem value="Payment Entry"><ReceiptIcon /> {_("Payment Entry")}</SelectItem>
                <SelectItem value="Transfer"><ArrowRightLeftIcon /> {_("Transfer")}</SelectItem>
            </SelectFormField>


            {classify_as === "Payment Entry" && (
                <div className='grid grid-cols-4 gap-4'>
                    <div className="col-span-1">
                        <PartyTypeFormField
                            name='party_type'
                            label={_("Party Type")}
                            isRequired
                            inputProps={{
                                triggerProps: {
                                    className: 'w-full'
                                },
                            }}
                            rules={{
                                required: "Party Type is required"
                            }}
                        />
                    </div>
                    <div className="col-span-3">
                        <PartyField />
                    </div>
                </div>
            )}

            <AccountFormField
                name='account'
                label={_("Account")}
                isRequired
                rules={{
                    required: _("Account is required")
                }}
                account_type={accountType}
            />


        </div>
    )
}

const PartyField = () => {

    const { control, setValue } = useFormContext<MintBankTransactionRule>()

    const party_type = useWatch({
        control,
        name: `party_type`
    })

    const { call } = useContext(FrappeContext) as FrappeConfig

    const company = useWatch({ control, name: 'company' })

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        // Fetch the party and account
        if (event.target.value) {
            call.get('truebalance.apis.bank_reconciliation.get_party_details', {
                company: company,
                party_type: party_type,
                party: event.target.value
            }).then((res) => {
                setValue('account', res.message.party_account)
            })
        } else {
            // Clear the account
            setValue('account', '')
        }

    }

    if (!party_type) {
        return <DataField
            name={`party`}
            label={_("Party")}
            isRequired
            inputProps={{
                disabled: true,
            }}
        />
    }

    return <LinkFormField
        name={`party`}
        label={_("Party")}
        rules={{
            onChange
        }}
        doctype={party_type}

    />
}