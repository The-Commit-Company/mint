import { useAtom } from 'jotai'
import { bankRecDateAtom } from './bankRecAtoms'
import { useMemo, useState } from 'react'
import { AVAILABLE_TIME_PERIODS, formatDate, getDatesForTimePeriod, TimePeriod } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDownIcon, MoveRight } from 'lucide-react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { parse } from "chrono-node"
import { Calendar } from '@/components/ui/calendar'

const BankRecDateFilter = () => {

    const [bankRecDate, setBankRecDate] = useAtom(bankRecDateAtom)

    const timePeriodOptions = useMemo(() => {
        return AVAILABLE_TIME_PERIODS.map((period) => {
            const dates = getDatesForTimePeriod(period)
            return {
                label: period,
                fromDate: dates.fromDate,
                toDate: dates.toDate
            }
        })
    }, [])

    const [open, setOpen] = useState(false)
    const [value, setValue] = useState("")

    const timePeriod: TimePeriod = useMemo(() => {
        if (bankRecDate.fromDate && bankRecDate.toDate) {
            // Check if the from and to dates match any predefined time period
            for (const period of timePeriodOptions) {
                if (period.fromDate === bankRecDate.fromDate && period.toDate === bankRecDate.toDate) {
                    return period.label;
                }
            }
            return "Date Range";
        } else {
            return "Date Range";
        }
    }, [bankRecDate.fromDate, bankRecDate.toDate, timePeriodOptions]);

    const handleTimePeriodChange = (fromDate: string, toDate: string) => {
        setBankRecDate({ fromDate, toDate })
        setOpen(false)
    }

    const dateObj = useMemo(() => {
        return {
            from: new Date(bankRecDate.fromDate),
            to: new Date(bankRecDate.toDate)
        }
    }, [bankRecDate.fromDate, bankRecDate.toDate])



    return <div className='flex items-center'>
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={'outline'}
                    aria-expanded={open}
                    className='rounded-r-none border-r-0'
                    role="combobox">
                    {timePeriod}

                    <ChevronDownIcon />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-74 p-0" align='end'>
                <Command>

                    <CommandInput placeholder="e.g. Last 3 weeks" onValueChange={setValue} value={value} />
                    <CommandList>
                        <CommandEmpty className='text-left p-2 hover:bg-muted'>
                            <EmptyState onSelect={handleTimePeriodChange} value={value} />
                        </CommandEmpty>
                        {timePeriodOptions.map((period) => (
                            <CommandItem key={period.label} className='flex justify-between' onSelect={() => handleTimePeriodChange(period.fromDate, period.toDate)}>
                                <span>
                                    {period.label}
                                </span>
                                <span className='text-xs text-muted-foreground flex items-center gap-1 text-balance font-mono'>
                                    {formatDate(period.fromDate)} <MoveRight className='w-4 h-4' /> {formatDate(period.toDate)}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>

            </PopoverContent>
        </Popover>

        <Popover>
            <PopoverTrigger asChild>
                <Button variant={'outline'} className='rounded-l-none'>
                    {formatDate(bankRecDate.fromDate)} - {formatDate(bankRecDate.toDate)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto overflow-hidden p-0' align='end'>
                <Calendar
                    mode='range'
                    captionLayout='dropdown'
                    selected={{
                        from: dateObj.from,
                        to: dateObj.to
                    }}
                    numberOfMonths={2}
                    defaultMonth={dateObj.from}
                    onSelect={(date) => {
                        if (date) {
                            setBankRecDate({ fromDate: formatDate(date.from, 'YYYY-MM-DD'), toDate: formatDate(date.to, 'YYYY-MM-DD') })
                        }
                    }}
                />
            </PopoverContent>
        </Popover>
    </div>
}


const EmptyState = ({ onSelect, value }: { onSelect: (fromDate: string, toDate: string) => void, value: string }) => {

    const dates = useMemo(() => {
        if (value) {
            // Try parsing the value
            const parsedDate = parse(value, undefined, { forwardDate: false })

            if (parsedDate && parsedDate.length > 0) {
                const startDate = parsedDate[0].start.date()
                const endDate = parsedDate[0].end?.date()

                if (!endDate) {
                    const today = new Date()
                    // If today is greater than the start date, use today as the end date
                    if (startDate.getTime() > today.getTime()) {
                        return { fromDate: today, toDate: startDate }
                    } else {
                        return { fromDate: startDate, toDate: today }
                    }
                } else {
                    return { fromDate: startDate, toDate: endDate }
                }
            }

        }
    }, [value])

    const onClick = (fromDate: Date, toDate: Date) => {
        onSelect(formatDate(fromDate, 'YYYY-MM-DD'), formatDate(toDate, 'YYYY-MM-DD'))
    }

    return <div>
        {dates ?
            <div className='flex gap-2 items-center justify-between cursor-pointer' onClick={() => onClick(dates.fromDate, dates.toDate)}>
                <span className='text-sm text-muted-foreground'>
                    {value}
                </span>
                <span className='text-xs text-muted-foreground font-mono text-balance flex items-center gap-1'>
                    {formatDate(dates.fromDate)} <MoveRight className='w-4 h-4' /> {formatDate(dates.toDate)}
                </span>
            </div> :
            <span className='text-sm text-muted-foreground'>
                No results found
            </span>
        }
    </div>
}

export default BankRecDateFilter