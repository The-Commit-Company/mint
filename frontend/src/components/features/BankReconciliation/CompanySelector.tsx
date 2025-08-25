import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { selectedCompanyAtom, useCurrentCompany } from "@/hooks/useCurrentCompany"
import { useSetAtom } from "jotai"
import { Building2, ChevronDown, Search } from "lucide-react"
import { useState, useMemo } from "react"

const CompanySelector = () => {
    const [searchQuery, setSearchQuery] = useState("")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = window.frappe?.boot?.docs?.filter((doc: Record<string, any>) => doc.doctype === ":Company").map((company: Record<string, any>) => company.name) || []

    const setSelectedCompany = useSetAtom(selectedCompanyAtom)
    const selectedCompany = useCurrentCompany()

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options
        return options.filter((option: string) =>
            option.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [options, searchQuery])

    // Show search input if there are more than 5 companies
    const showSearch = options.length > 5

    const handleSelectCompany = (company: string) => {
        setSelectedCompany(company)
        setSearchQuery("") 
    }

    return (
        <DropdownMenu onOpenChange={(open) => {
            if (!open) setSearchQuery("") 
        }}>
            <DropdownMenuTrigger asChild>
                <Button variant={'outline'}>
                    <Building2 />
                    {selectedCompany}
                    <ChevronDown />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className="w-64">
                {showSearch && (
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search companies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-8"
                                autoFocus
                            />
                        </div>
                    </div>
                )}
                <div className="max-h-64 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option: string) => (
                            <DropdownMenuItem 
                                key={option} 
                                onClick={() => handleSelectCompany(option)}
                                className="cursor-pointer"
                            >
                                {option}
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                            No companies found
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default CompanySelector