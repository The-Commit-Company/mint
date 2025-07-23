import { useAtomValue } from "jotai"
import { atomWithStorage } from "jotai/utils"

export const selectedCompanyAtom = atomWithStorage<string>('mint-selected-company', window.frappe?.boot?.user?.defaults?.company || '')

export const useCurrentCompany = () => {
    return useAtomValue(selectedCompanyAtom)
}