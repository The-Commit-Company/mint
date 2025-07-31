import { FieldValues, RegisterOptions, useFormContext } from "react-hook-form"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./form"
import _ from "@/lib/translate"
import { Input } from "./input"
import { ComponentProps, useState } from "react"
import { parseDate } from "chrono-node"
import { formatDate, getUserDateFormat, toDate } from "@/lib/date"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "./calendar"
import dayjs from "dayjs"
import { Textarea } from "./textarea"
import AccountsDropdown, { AccountsDropdownProps } from "../features/BankReconciliation/AccountsDropdown"

interface FormElementProps {
    name: string,
    rules?: Omit<RegisterOptions<FieldValues, string>, "disabled" | "valueAsNumber" | "valueAsDate" | "setValueAs">,
    label: string,
    isRequired?: boolean,
    formDescription?: string,

}

interface DataFieldProps extends FormElementProps {
    inputProps?: Omit<ComponentProps<"input">, "value" | "onChange" | "onBlur" | "name" | "ref">
}

export const DataField = ({ name, rules, label, isRequired, formDescription, inputProps }: DataFieldProps) => {

    const { control } = useFormContext()
    return <FormField
        control={control}
        name={name}
        rules={rules}
        render={({ field }) => (
            <FormItem className='flex flex-col'>
                <FormLabel>{_(label)}{isRequired && <span className="text-destructive">*</span>}</FormLabel>
                <FormControl>
                    <Input {...field} maxLength={140} {...inputProps} />
                </FormControl>
                {formDescription && <FormDescription>{_(formDescription)}</FormDescription>}
                <FormMessage />
            </FormItem>
        )}
    />
}

interface DateFieldProps extends FormElementProps {
    inputProps?: Omit<ComponentProps<"input">, "value" | "onChange" | "onBlur" | "name" | "ref">
}

export const DateField = ({ name, rules, label, isRequired, formDescription, inputProps }: DateFieldProps) => {

    const { control } = useFormContext()



    const DatePicker = ({ field }: { field: FieldValues }) => {

        const userDateFormat = getUserDateFormat()
        const [open, setOpen] = useState(false)

        const [value, setValue] = useState<string | undefined>(field.value ? formatDate(field.value) : undefined)

        const date = field.value ? toDate(field.value) : undefined

        return <div className="relative flex gap-2">
            <FormControl>
                <Input className="bg-background pr-10"
                    name={field.name}
                    onBlur={() => {
                        setValue(formatDate(field.value))
                        field.onBlur()
                    }}
                    placeholder={userDateFormat}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value)
                        if (e.target.value) {
                            // On change in value, try computing date usning standard formats first
                            const dateObj = toDate(e.target.value, userDateFormat)
                            // If we find a valid date, use it
                            if (dateObj && !isNaN(dateObj.getTime())) {
                                field.onChange(formatDate(dateObj, "YYYY-MM-DD"))
                            } else {
                                // If not, try parsing using chrono-node for things like "1st July 2025"
                                const date = parseDate(e.target.value)
                                if (date) {
                                    field.onChange(formatDate(date, "YYYY-MM-DD"))
                                }
                            }
                        } else {
                            field.onChange("")
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                            e.preventDefault()
                            setOpen(true)
                        }
                    }}
                    maxLength={140}
                    {...inputProps} />
            </FormControl>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date-picker"
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                    >
                        <CalendarIcon className="size-3.5" />
                        <span className="sr-only">Select date</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="center">
                    <Calendar
                        mode="single"
                        selected={date}
                        fixedWeeks
                        endMonth={dayjs().add(1, "year").toDate()}
                        captionLayout="dropdown"
                        defaultMonth={date}
                        onSelect={(date) => {
                            setValue(formatDate(date))
                            field.onChange(formatDate(date, "YYYY-MM-DD"))
                            setOpen(false)
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    }

    return <FormField
        control={control}
        name={name}
        rules={rules}
        render={({ field }) => (
            <FormItem className='flex flex-col'>
                <FormLabel>{_(label)}{isRequired && <span className="text-destructive">*</span>}</FormLabel>
                <DatePicker field={field} />
                {formDescription && <FormDescription>{_(formDescription)}</FormDescription>}
                <FormMessage />
            </FormItem>
        )}
    />
}


interface SmallTextFieldProps extends FormElementProps {
    inputProps?: Omit<ComponentProps<"textarea">, "value" | "onChange" | "onBlur" | "name" | "ref">
}

export const SmallTextField = ({ name, rules, label, isRequired, formDescription, inputProps }: SmallTextFieldProps) => {

    const { control } = useFormContext()
    return <FormField
        control={control}
        name={name}
        rules={rules}
        render={({ field }) => (
            <FormItem className='flex flex-col'>
                <FormLabel>{_(label)}{isRequired && <span className="text-destructive">*</span>}</FormLabel>
                <FormControl>
                    <Textarea {...field} {...inputProps} />
                </FormControl>
                {formDescription && <FormDescription>{_(formDescription)}</FormDescription>}
                <FormMessage />
            </FormItem>
        )}
    />
}


interface AccountFormFieldProps extends Omit<AccountsDropdownProps, 'value' | 'onChange'>, FormElementProps {
}
export const AccountFormField = (props: AccountFormFieldProps) => {

    const { control } = useFormContext()

    return <FormField
        control={control}
        name={props.name}
        rules={props.rules}
        render={({ field }) => (
            <FormItem className='flex flex-col'>
                <FormLabel>{_(props.label)}{props.isRequired && <span className="text-destructive">*</span>}</FormLabel>
                <FormControl>
                    <AccountsDropdown {...props} value={field.value} onChange={field.onChange} />
                </FormControl>
                {props.formDescription && <FormDescription>{_(props.formDescription)}</FormDescription>}
                <FormMessage />
            </FormItem>
        )}
    />
}