import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { selectedCompanyAtom, useCurrentCompany } from "@/hooks/useCurrentCompany"
import { useSetAtom } from "jotai"
import { Building2, ChevronDown } from "lucide-react"

const CompanySelector = () => {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = window.frappe?.boot?.docs?.filter((doc: Record<string, any>) => doc.doctype === ":Company").map((company: Record<string, any>) => company.name)

    const setSelectedCompany = useSetAtom(selectedCompanyAtom)

    const selectedCompany = useCurrentCompany()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={'outline'}>
                    <Building2 />
                    {selectedCompany}
                    <ChevronDown />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className="w-64">
                {options.map((option: string) => (
                    <DropdownMenuItem key={option} onClick={() => setSelectedCompany(option)}>
                        {option}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default CompanySelector