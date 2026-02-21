import _ from '@/lib/translate'
import { GetStatementDetailsResponse } from '../import_utils'
import { flt, formatCurrency } from '@/lib/numbers'
import { StatContainer, StatLabel, StatValue } from '@/components/ui/stats'
import { formatDate } from '@/lib/date'
import { SelectedBank } from '../../BankReconciliation/bankRecAtoms'
import { Landmark } from 'lucide-react'
import { H4 } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { FileTypeIcon } from '@/components/ui/file-dropzone'
import { getFileExtension } from '@/lib/file'
import { Label } from '@/components/ui/label'

type Props = {
    data: GetStatementDetailsResponse,
    bank: SelectedBank | null
}

const StatementDetails = ({ data, bank }: Props) => {
    return (
        <div className='flex flex-col gap-4'>
            {bank && <div className='pl-2'>
                <div className='p-2 max-w-72 relative border-2 border-gray-200 rounded-md'>
                    {bank?.logo ? <img
                        src={`/assets/mint/mint/${bank.logo}`}
                        alt={bank.bank || bank.name || ''}
                        className="max-w-24 object-left h-10 object-contain mb-1"
                    /> : <div className="rounded-md flex items-center h-10 gap-2">
                        <Landmark size={'30px'} />
                        <H4 className="text-base mb-0">{bank?.bank}</H4>
                    </div>}

                    <div className="flex flex-col gap-0.5">
                        <span className="tracking-tight text-sm font-medium">{bank.account_name}</span>
                        <span title="GL Account" className="text-sm">{bank.account}</span>
                    </div>

                    <div className="absolute -top-0.5 right-0">
                        <span className={cn("uppercase rounded-bl-sm text-xs tracking-tight font-semibold py-1 px-1.5",
                            'bg-gray-200 text-secondary-foreground/70'
                        )}>
                            {bank.account_type?.slice(0, 24)}
                        </span>
                    </div>
                </div>
            </div>
            }
            <div className='pl-2 flex flex-col gap-2'>
                <Label className='uppercase text-xs font-medium text-secondary-foreground/80'>{_("Statement File")}</Label>
                <div className='flex items-center gap-2'>
                    <FileTypeIcon fileType={getFileExtension(data.file_name)} size='sm' />
                    <span className='text-gray-800 text-sm'>{data.file_name}</span>
                </div>
            </div>
            <StatContainer className="min-w-48">
                <StatLabel>{_("Dates")}</StatLabel>
                <StatValue>{_("{0} to {1}", [formatDate(data.statement_start_date, "Do MMMM YYYY"), formatDate(data.statement_end_date, "Do MMMM YYYY")])}</StatValue>
            </StatContainer>
            <div className='flex gap-4'>
                <StatContainer className="min-w-48">
                    <StatLabel>{_("Number of transactions")}</StatLabel>
                    <StatValue className="font-mono">{data.transaction_rows.length}</StatValue>
                </StatContainer>
                <StatContainer className="min-w-48">
                    <StatLabel>{_("Closing Balance as of {}", [formatDate(data.statement_end_date, "Do MMMM YYYY")])}</StatLabel>
                    <StatValue className="font-mono">{formatCurrency(flt(data.closing_balance, 2))}</StatValue>
                </StatContainer>
            </div>
        </div>
    )
}

export default StatementDetails