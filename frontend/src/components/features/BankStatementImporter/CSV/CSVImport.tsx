import { useGetStatementDetails } from '../import_utils'
import CSVRawDataPreview from './CSVRawDataPreview'
import StatementDetails from './StatementDetails'
import { SelectedBank } from '../../BankReconciliation/bankRecAtoms'

const CSVImport = ({ bank, fileURL }: { bank: SelectedBank, fileURL: string }) => {

    const { data } = useGetStatementDetails(fileURL, bank.name)

    if (!data || !data.message) {
        return null
    }
    return (
        <div className="w-full flex">
            <div className="w-[50%] p-4 h-[calc(100vh-72px)] overflow-scroll">
                <StatementDetails data={data.message} bank={bank} />
            </div>
            <div className="w-[50%] border-l border-t pr-1 pl-0 border-border h-[calc(100vh-72px)] overflow-scroll">
                <CSVRawDataPreview data={data.message} />
            </div>
        </div>
    )
}

export default CSVImport