import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCurrentCompany } from "@/hooks/useCurrentCompany"
import { useFrappeGetDocList } from "frappe-react-sdk"
import Fuse from "fuse.js"
import { ChevronsUpDownIcon } from "lucide-react"
import { useMemo, useState } from "react"


interface AccountsDropdownProps {
    root_type?: ('Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense')[],
    report_type?: 'Balance Sheet' | 'Profit and Loss',
    account_type?: string[],
    value?: string,
    onChange?: (value: string) => void
}
/**
 * Component to select an account - supports fuzzy search
 * @param root_type - The root type of the account
 * @param report_type - The report type of the account
 * @param account_type - The type of the account
 * @param value - The value of the account field
 * @param onChange - The function to call when the value changes
 * @returns 
 */
const AccountsDropdown = ({ root_type, report_type, account_type, value, onChange }: AccountsDropdownProps) => {

    const { data } = useGetAccounts(root_type, report_type, account_type)

    const groupedAccounts = useMemo(() => {
        if (!data) return []

        const grouped: Record<string, Account[]> = data.reduce((acc, account) => {
            const parentAccount = account.parent_account
            if (!parentAccount) return acc

            if (!acc[parentAccount]) {
                acc[parentAccount] = []
            }

            acc[parentAccount].push(account)
            return acc
        }, {} as Record<string, Account[]>)


        return Object.entries(grouped).map(([parentAccount, accounts]) => ({
            // Remove the last abbreviation from the parent account name like "Assets - TCC" should be "Assets", and "Assets - USD - TCC" should be "Assets - USD"
            parentAccount: parentAccount.split(" - ").slice(0, -1).join(" - "),
            accounts
        }))

    }, [data])

    const searchIndex = useMemo(() => {

        if (!data) {
            return null
        }

        return new Fuse(data, {
            keys: ['name'],
            threshold: 0.5,
            includeScore: true
        })
    }, [data])

    const [search, setSearch] = useState("")

    const recommendedAccounts = useMemo(() => {

        if (!searchIndex || !search) {
            return []
        }

        return searchIndex.search(search).map((result) => result.item)

    }, [searchIndex, search])

    const [open, setOpen] = useState(false)

    const onOpenChange = (open: boolean) => {
        setOpen(open)
        // setSearch("")
    }

    const onSelect = (value: string) => {
        onChange?.(value)
        setOpen(false)
        setSearch(value)
    }

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal">
                    {value || "Select Account"}

                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

            </PopoverTrigger>
            <PopoverContent className="p-0">
                <Command shouldFilter={false} className="w-full">
                    <CommandInput placeholder="Search account..." onValueChange={setSearch} value={search} />
                    <CommandList>
                        <CommandEmpty>No accounts found.</CommandEmpty>

                        {recommendedAccounts.length > 0 && (
                            <CommandGroup heading="Search Results">
                                {recommendedAccounts.map((account) => (
                                    <CommandItem key={account.name} onSelect={() => onSelect(account.name)}>{account.name}</CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        {!search && groupedAccounts.map((group) => (
                            <CommandGroup key={group.parentAccount} heading={group.parentAccount}>
                                {group.accounts.map((account) => (
                                    <CommandItem key={account.name} onSelect={() => onSelect(account.name)}>{account.name}</CommandItem>
                                ))}
                            </CommandGroup>
                        ))}

                    </CommandList>
                </Command>
            </PopoverContent>

        </Popover>
    )
}


interface Account {
    name: string
    root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
    report_type: 'Balance Sheet' | 'Profit and Loss'
    account_type: string
    account_currency: string
    parent_account: string
}

const useGetAccounts = (root_type?: ('Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense')[], report_type?: 'Balance Sheet' | 'Profit and Loss', account_type?: string[]) => {

    const company = useCurrentCompany()
    const { data, isLoading, error, mutate } = useFrappeGetDocList<Account>("Account", {
        fields: ["name", "root_type", "report_type", "account_type", "account_currency", "parent_account"],
        filters: [["is_group", "=", 0], ["disabled", "=", 0], ["company", "=", company]],
        limit: 1000,
        orderBy: {
            "field": "root_type",
            // @ts-expect-error - we can pass in additional fields to orderBy
            "order": "asc, account_number asc"
        }
    }, `accounts-${company}`, {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    })

    const filteredData = useMemo(() => {

        return data?.filter((account) => {
            if (root_type && !root_type.includes(account.root_type)) return false
            if (report_type && account.report_type !== report_type) return false
            if (account_type && !account_type.includes(account.account_type)) return false
            return true
        }) ?? []

    }, [data, root_type, report_type, account_type])

    return { data: filteredData, isLoading, error, mutate }
}

export default AccountsDropdown