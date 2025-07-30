import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, Calendar, Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/numbers'
import { formatDate } from '@/lib/date'
import { BANK_LOGOS } from './logos'
import { UnreconciledTransaction } from './utils'
import { getCompanyCurrency } from '@/lib/company'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
    transaction: UnreconciledTransaction,
    showAccount?: boolean,
    account?: string
}

const SelectedTransactionDetails = ({ transaction, showAccount = false, account }: Props) => {

    const isWithdrawal = transaction.withdrawal && transaction.withdrawal > 0

    const bankLogo = useMemo(() => {
        if (transaction.bank_account) {
            return BANK_LOGOS.find((logo) => logo.keywords.some((keyword) => transaction.bank_account?.toLowerCase().includes(keyword.toLowerCase())))
        }
        return null
    }, [transaction.bank_account])

    const amount = transaction.withdrawal ? transaction.withdrawal : transaction.deposit

    const currency = transaction.currency || getCompanyCurrency(transaction.company ?? '')

    return (
        <Card className='rounded-md py-4'>
            <CardContent className='px-4'>
                <div className='flex flex-col gap-2'>
                    <div className='flex justify-between'>
                        <div className='flex flex-col gap-2'>
                            <div className='flex flex-col'> {bankLogo ? <img
                                src={`/assets/mint/mint/${bankLogo.logo}`}
                                alt={bankLogo?.keywords.join(', ') || ''}
                                className="max-w-24 object-left h-10 object-contain"
                            /> :
                                <Landmark size={'30px'} />
                            }
                                <span className='font-medium text-base'>{transaction.bank_account}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                                <Calendar size='16px' />
                                <span className='text-sm'>{formatDate(transaction.date, 'Do MMM YYYY')}</span>
                            </div>
                        </div>
                        <div className='flex flex-col gap-1'>
                            <div className={cn('flex items-center gap-1 text-right px-0 justify-end py-1 rounded-sm',
                                isWithdrawal ? 'text-destructive' : 'text-green-600'
                            )}>
                                {isWithdrawal ? <ArrowUpRight className="w-5 h-5 text-destructive" /> : <ArrowDownRight className="w-5 h-5 text-green-600" />}
                                <span className='text-sm font-semibold uppercase'>{isWithdrawal ? 'Spent' : 'Received'}</span>
                            </div>
                            <span className='font-semibold font-mono text-xl text-right pr-0.5'>{formatCurrency(amount, currency)}</span>
                            {transaction.unallocated_amount && transaction.unallocated_amount !== amount ? <span className='text-muted-foreground'>Unallocated: {formatCurrency(transaction.unallocated_amount)}</span> : null}
                        </div>
                    </div>
                    <div className='flex flex-col gap-1'>
                        <span className='text-sm'>{transaction.description}</span>
                        {transaction.reference_number ? <span className='text-sm text-muted-foreground'>Ref: {transaction.reference_number}</span> : null}
                        {showAccount && account ? <span className='text-sm text-muted-foreground'>GL Account: {account}</span> : null}
                    </div>

                </div>
            </CardContent >
        </Card >
    )
}

export default SelectedTransactionDetails