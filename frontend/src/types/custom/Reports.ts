export type Summary = {
    value: number,
    indicator?: "Red" | "Green" | "Blue",
    label: string,
    datatype: "Int" | "Float" | "Currency" | "Percent"
}


export interface QueryReportReturnType<T> {
    prepared_report: boolean,
    report_summary: Summary[],
    result: T[],
    columns: unknown[],
    add_total_row: boolean,
    doc?: {
        queued_at: string,
        report_end_time: string,
    }
}