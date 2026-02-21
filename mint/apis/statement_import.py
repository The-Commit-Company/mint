import frappe
from frappe.utils.csvutils import read_csv_content
from frappe.utils.xlsxutils import (
	read_xls_file_from_attached_file,
	read_xlsx_file_from_attached_file,
)
from frappe import _
from frappe.utils import getdate

from datetime import datetime

@frappe.whitelist()
def get_statement_details(file_url: str):
    """
    Given a file path, try to get bank statement details.

    From the data, we want to "guess" the following:
    1. Row index of the header row
    2. Column mapping to standard variables?
    3. Row indices of all rows after the header row that are relevant - hence look like transactions
    4. Opening and Closing dates of the statement and balance
    """

    # file_path = "/private/files/DetailedStatement.xlsx"
    # file_path = "/private/files/HDFC.xls"
    # file_path = "/private/files/SBI.xlsx"
    # file_path = "/private/files/ICICI.xls"

    data = get_data(file_url)

    file_name = file_url.split("/")[-1]

    # print(data)

    header_index = get_header_row_index(data)

    header_row = data[header_index]

    columns, column_mapping = get_column_mapping(header_row)

    transaction_rows, transaction_starting_index, transaction_ending_index = get_transaction_rows(data, header_index, column_mapping)

    date_format, amount_format = get_file_properties(transaction_rows)

    statement_start_date, statement_end_date, closing_balance = get_closing_balance(transaction_rows, date_format)

    # print(len(transaction_rows))

    return {
        "file_name": file_name,
        "file_path": file_url,
        "data": data,
        "header_index": header_index,
        "header_row": header_row,
        "columns": columns,
        "column_mapping": column_mapping,
        "transaction_starting_index": transaction_starting_index,
        "transaction_ending_index": transaction_ending_index,
        "transaction_rows": transaction_rows,
        "date_format": date_format,
        "amount_format": amount_format,
        "statement_start_date": statement_start_date,
        "statement_end_date": statement_end_date,
        "closing_balance": closing_balance,
    }

def get_data(file_path: str):

    file_doc = frappe.get_doc("File", {"file_url": file_path})

    parts = file_doc.get_extension()
    extension = parts[1]
    content = file_doc.get_content()

    if extension not in (".csv", ".xlsx", ".xls"):
        frappe.throw(_("Import template should be of type .csv, .xlsx or .xls"), title="Invalid File Type")

    if extension == ".csv":
        data = read_csv_content(content, use_sniffer=True)
    elif extension == ".xlsx":
        data = read_xlsx_file_from_attached_file(fcontent=content)
    elif extension == ".xls":
        data = read_xls_file_from_attached_file(content)
    
    return data

def get_header_row_index(data: list[list[str]]):
    """
    Given the data, try to get the row index of the header row.
    """

    row_index = 0
    max_valid_columns = 0

    # Loop over rows and find the first row that has the most number of "valid" column headers
    # Valid columns is based on keywords present in each cell

    for idx, row in enumerate(data):
        valid_columns = 0
        for cell in row:
            if not cell:
                continue

            # If cell is a string, then we need to check if it contains any of the keywords
            if not isinstance(cell, str):
                continue

            if any(keyword in cell.lower() for keyword in ["date", "amount", "description", "reference", "transaction", "type", "cr", "dr", "deposit", "withdrawal", "balance"]):
                valid_columns += 1
        if valid_columns > max_valid_columns:
            max_valid_columns = valid_columns
            row_index = idx

    return row_index

def get_column_mapping(header_row: list[str]):
    """
    Given the header row, try to map each column index to a standard variable, or set it to "Do not import"
    """
    standard_variables = {
        "Date": ["date", "transaction date"], 
        "Amount": ["amount"], 
        "Description": ["description", "particulars", "remarks", "narration", "detail"], 
        "Reference": ["reference", "ref", "tran id", "transaction id", "cheque", "check"], 
        "Transaction Type": ["transaction type", "cr/dr", "dr/cr"], 
        "Balance": ["balance"],
        "Withdrawal": ["withdrawal", "debit"],
        "Deposit": ["deposit", "credit"],
    }

    # A standard variable can be represented by multiple names

    column_mapping = {}

    # Loop over all columns and check if they contain any of the standard variable names
    # If not, we do not import it
    # If they do, we map the column index to the standard variable

    columns = []

    for idx, cell in enumerate(header_row):

       

        if not cell:
            continue

        if not isinstance(cell, str):
            continue

        column = {
            "index": idx,
            "header_text": cell,
            "variable": cell.strip().lower().replace(" ", "_").replace("?", "").replace(".", ""),
            "maps_to": "Do not import",
        }

        for standard_variable, names in standard_variables.items():
            if any(name in cell.lower().replace(".", "") for name in names):

                if not column_mapping.get(standard_variable, None):
                    column["maps_to"] = standard_variable

                    column_mapping[standard_variable] = idx

                break
        
        columns.append(column)
    

    return columns, column_mapping


def get_transaction_rows(data: list[list[str]], header_index: int, column_mapping: dict[str, int]):
    """
    Given the data, header index and column mapping, try to get the transaction rows

    For each row after the header row, check if the data makes sense - date column should have a date, 
    amount column should be a number after removing any special charatcers, spaces and "CR/DR" text.
    Balance column should be a number after removing any special charatcers, spaces and "CR/DR" text.
    """

    transaction_rows = []

    transaction_starting_index = None
    transaction_ending_index = None

    valid_rows = data[header_index + 1:]

    column_map_keys = column_mapping.keys()

    for row_index, row in enumerate(valid_rows):

        date = row[column_mapping["Date"]] if "Date" in column_map_keys else None
        amount = row[column_mapping["Amount"]] if "Amount" in column_map_keys else None
        withdrawal = row[column_mapping["Withdrawal"]] if "Withdrawal" in column_map_keys else None
        deposit = row[column_mapping["Deposit"]] if "Deposit" in column_map_keys else None
        balance = row[column_mapping["Balance"]] if "Balance" in column_map_keys else None

        if not date:
            continue

        if not isinstance(date, str):
            continue

        if not amount and not withdrawal and not deposit:
            continue

        # Check if date column is a valid date
        row_date_format = frappe.utils.guess_date_format(date)

        if not row_date_format:
            continue

        # Check if either the amount, withdrawal or deposit column is a valid number
        amount = get_float_amount(amount)
        withdrawal = get_float_amount(withdrawal)
        deposit = get_float_amount(deposit)
        balance = get_float_amount(balance)
            
        if not amount and not withdrawal and not deposit:
            continue

        if transaction_starting_index is None:
            transaction_starting_index = row_index

        transaction_ending_index = row_index

        transaction_row = {
            "date_format": row_date_format,
        }

        if "Date" in column_map_keys:
            transaction_row["date"] = row[column_mapping["Date"]]
        if "Amount" in column_map_keys:
            transaction_row["amount"] = row[column_mapping["Amount"]]
        if "Withdrawal" in column_map_keys:
            transaction_row["withdrawal"] = row[column_mapping["Withdrawal"]]
        if "Deposit" in column_map_keys:
            transaction_row["deposit"] = row[column_mapping["Deposit"]]
        if "Balance" in column_map_keys:
            transaction_row["balance"] = row[column_mapping["Balance"]]
        if "Reference" in column_map_keys:
            transaction_row["reference"] = row[column_mapping["Reference"]]
        if "Description" in column_map_keys:
            transaction_row["description"] = row[column_mapping["Description"]]
        if "Transaction Type" in column_map_keys:
            transaction_row["transaction_type"] = row[column_mapping["Transaction Type"]]
        
        transaction_rows.append(transaction_row)
    
    base_index = header_index + 1

    if transaction_starting_index is not None:
        transaction_starting_index += base_index
    
    if transaction_ending_index is not None:
        transaction_ending_index += base_index

    return transaction_rows, transaction_starting_index, transaction_ending_index

def get_float_amount(amount):

    if not amount:
        return None

    if isinstance(amount, str):
        amount = amount.lower().replace(",", "").replace(" ", "").replace("cr", "").replace("dr", "")
        amount = float(amount)
    else:
        amount = float(amount)

    return amount

def get_file_properties(transactions: list):
    """
    From the transaction rows, try to figure out the following:
    1. Most common date format
    2. Amount format - does it contain "CR/Dr" text or is it in a separate column (maybe transaction type?). Amount could also be positive and negative.
    """

    date_format_frequency = {}

    amount_format_frequency = {
        "separate_columns_for_withdrawal_and_deposit": 0,
        "dr_cr_in_amount": 0,
        "positive_negative_in_amount": 0,
        "cr_dr_in_transaction_type": 0,
        "deposit_withdrawal_in_transaction_type": 0,
    }

    for transaction in transactions:
        date_format = transaction.get("date_format")

        if date_format:
            date_format_frequency[date_format] = date_format_frequency.get(date_format, 0) + 1
        
        # Check if there's an amount column
        # If there's a separate column for withdrawal and deposit, we can skip this
        if transaction.get("withdrawal", None) or transaction.get("deposit", None):
            amount_format_frequency["separate_columns_for_withdrawal_and_deposit"] += 1
            continue

        amount = transaction.get("amount", None)

        if not amount:
            continue

        if isinstance(amount, str) and ("cr" in amount.lower() or "dr" in amount.lower()):
            amount_format_frequency["dr_cr_in_amount"] += 1
        
        # Check if there's a transaction type column containing "cr"/"dr"
        if transaction.get("transaction_type", None):
            if "cr" in transaction.get("transaction_type", "").lower() or "dr" in transaction.get("transaction_type", "").lower():
                amount_format_frequency["cr_dr_in_transaction_type"] += 1
            if "deposit" in transaction.get("transaction_type", "").lower() or "withdrawal" in transaction.get("transaction_type", "").lower():
                amount_format_frequency["deposit_withdrawal_in_transaction_type"] += 1
        
        # Else assume that the amount is expressed as positive/negative value
        else:
            amount_format_frequency["positive_negative_in_amount"] += 1
    
    most_common_date_format = max(date_format_frequency, key=date_format_frequency.get)
    most_common_amount_format = max(amount_format_frequency, key=amount_format_frequency.get)

    return most_common_date_format, most_common_amount_format


def get_closing_balance(transactions: list, date_format: str):
    """
    Given the transactions and date format, try to get the statement start date, end date and closing balance
    """

    statement_start_date = None
    statement_end_date = None
    closing_balance = None

    for transaction in transactions:
        date = transaction.get("date")
        if not date:
            continue

        tx_date = datetime.strptime(date, date_format)

        if statement_start_date is None or tx_date < statement_start_date:
            statement_start_date = tx_date

        if statement_end_date is None or tx_date >= statement_end_date:
            statement_end_date = tx_date

            closing_balance = transaction.get("balance")

    return getdate(statement_start_date), getdate(statement_end_date), closing_balance