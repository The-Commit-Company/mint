import { in_list } from "./checks";

export const formatCurrency = (value?: number, currency: string = 'USD', returnPlaceholder = false) => {
    const CurrencyFormat = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    if (value !== undefined && value !== null) {
        return CurrencyFormat.format(value);
    } else {
        return returnPlaceholder ? CurrencyFormat.format(0) : ''
    }
}

export const flt = (value?: number | string | null, decimals?: number, rounding_method?: string) => {
    if (value === undefined || value === null || value === "") return 0

    if (typeof value !== "number") {
        value = Number(typeof value === 'string' ? value?.split(",")?.join("") : value)

        if (isNaN(value)) return 0
    }

    //TODO: We need to round the value here
    if (decimals !== undefined && decimals !== null) {
        const rounded = _round(value, decimals, rounding_method)
        if (Math.abs(rounded) === 0) return 0
        return rounded
    }

    return value
}

const _round = (num: number, precision: number, rounding_method?: string) => {

    rounding_method = rounding_method || window.frappe?.boot?.sysdefaults?.rounding_method || "Banker's Rounding (legacy)";

    const is_negative = num < 0 ? true : false;

    if (rounding_method == "Banker's Rounding (legacy)") {
        const d = cint(precision);
        const m = Math.pow(10, d);
        const n = +(d ? Math.abs(num) * m : Math.abs(num)).toFixed(8); // Avoid rounding errors
        const i = Math.floor(n),
            f = n - i;
        let r = !precision && f == 0.5 ? (i % 2 == 0 ? i : i + 1) : Math.round(n);
        r = d ? r / m : r;
        return is_negative ? -r : r;
    } else if (rounding_method == "Banker's Rounding") {
        if (num == 0) return 0.0;
        precision = cint(precision);

        const multiplier = Math.pow(10, precision);
        num = Math.abs(num) * multiplier;

        const floor_num = Math.floor(num);
        const decimal_part = num - floor_num;

        // For explanation of this method read python flt implementation notes.
        const epsilon = 2.0 ** (Math.log2(Math.abs(num)) - 52.0);

        if (Math.abs(decimal_part - 0.5) < epsilon) {
            num = floor_num % 2 == 0 ? floor_num : floor_num + 1;
        } else {
            num = Math.round(num);
        }
        num = num / multiplier;
        return is_negative ? -num : num;
    } else if (rounding_method == "Commercial Rounding") {
        if (num == 0) return 0.0;

        const digits = cint(precision);
        const multiplier = Math.pow(10, digits);

        num = num * multiplier;

        // For explanation of this method read python flt implementation notes.
        let epsilon = 2.0 ** (Math.log2(Math.abs(num)) - 52.0);
        if (is_negative) {
            epsilon = -1 * epsilon;
        }

        num = Math.round(num + epsilon);
        return num / multiplier;
    } else {
        throw new Error(`Unknown rounding method ${rounding_method}`);
    }
}


export const cint = (v: boolean | string | number, def?: boolean | string | number) => {
    if (v === true) return 1;
    if (v === false) return 0;
    v = v + "";
    if (v !== "0") v = lstrip(v, ["0"]);
    v = parseInt(v); // eslint-ignore-line
    if (isNaN(v)) v = def === undefined ? 0 : def;
    return v as number;
};

export const lstrip = (s: string, chars?: string[]) => {
    if (!chars) chars = ["\n", "\t", " "];
    // strip left
    let first_char = s.substring(0, 1);
    while (in_list(chars, first_char)) {
        s = s.substring(1);
        first_char = s.substring(0, 1);
    }
    return s;
};