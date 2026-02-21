import { useGetStatementDetails } from '../import_utils'
import CSVRawDataPreview from './CSVRawDataPreview'
import StatementDetails from './StatementDetails'
import { SelectedBank } from '../../BankReconciliation/bankRecAtoms'

const CSVImport = ({ bank, fileURL }: { bank: SelectedBank | null, fileURL: string }) => {

    const { data } = useGetStatementDetails(fileURL)

    if (!data || !data.message) {
        return null
    }
    return (
        <div className="w-full flex">
            <div className="w-[50%]">
                <CSVRawDataPreview data={data.message} />
            </div>
            <div className="w-[50%] p-4">
                <StatementDetails data={data.message} bank={bank} />
            </div>
        </div>
    )
}

export default CSVImport