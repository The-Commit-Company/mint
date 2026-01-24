import frappe
from frappe.utils.csvutils import read_csv_content
from frappe.utils.xlsxutils import (
	read_xls_file_from_attached_file,
	read_xlsx_file_from_attached_file,
)
from frappe import _

@frappe.whitelist()
def get_statement_details():
    """
    Given a file path, try to get bank statement details.

    From the data, we want to "guess" the following:
    1. Row index of the header row
    2. Column mapping to standard variables?
    3. Row indices of all rows after the header row that are relevant - hence look like transactions
    4. Opening and Closing dates of the statement and balance
    """

    file_path = "/private/files/DetailedStatement.xlsx"
    # file_path = "/private/files/HDFC.xls"
    # file_path = "/private/files/SBI.xlsx"
    # file_path = "/private/files/ICICI.xls"

    data = get_data(file_path)

    # print(data)

    header_index = get_header_row_index(data)

    header_row = data[header_index]

    column_mapping = get_column_mapping(header_row)

    transaction_rows, transaction_starting_index, transaction_ending_index = get_transaction_rows(data, header_index, column_mapping)

    print(len(transaction_rows))

    return {
        "header_index": header_index,
        "header_row": header_row,
        "column_mapping": column_mapping,
        "transaction_rows": transaction_rows,
        "transaction_starting_index": transaction_starting_index,
        "transaction_ending_index": transaction_ending_index,
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
    Given the header row, try to map each column index to a standard variable
    """
    standard_variables = {
        "date": ["date", "transaction date"], 
        "amount": ["amount"], 
        "description": ["description", "particulars", "remarks", "narration", "detail"], 
        "reference": ["reference", "ref", "tran id", "transaction id", "cheque", "check"], 
        "cr/dr": ["cr/dr", "dr/cr"], 
        "balance": ["balance"],
        "withdrawal": ["withdrawal", "debit"],
        "deposit": ["deposit", "credit"],
    }

    # A standard variable can be represented by multiple names

    column_mapping = {}

    for standard_variable, names in standard_variables.items():

        if standard_variable in column_mapping.keys():
            continue
        
       
        for idx, cell in enumerate(header_row):
            if not cell:
                continue

            # If cell is a string, then we need to check if it contains any of the keywords
            if not isinstance(cell, str):
                continue

            if any(name in cell.lower().replace(".", "") for name in names):
                column_mapping[standard_variable] = idx
                break

    return column_mapping


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

        date = row[column_mapping["date"]] if "date" in column_map_keys else None
        amount = row[column_mapping["amount"]] if "amount" in column_map_keys else None
        withdrawal = row[column_mapping["withdrawal"]] if "withdrawal" in column_map_keys else None
        deposit = row[column_mapping["deposit"]] if "deposit" in column_map_keys else None
        balance = row[column_mapping["balance"]] if "balance" in column_map_keys else None

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

        if "date" in column_map_keys:
            transaction_row["date"] = row[column_mapping["date"]]
        if "amount" in column_map_keys:
            transaction_row["amount"] = row[column_mapping["amount"]]
        if "withdrawal" in column_map_keys:
            transaction_row["withdrawal"] = row[column_mapping["withdrawal"]]
        if "deposit" in column_map_keys:
            transaction_row["deposit"] = row[column_mapping["deposit"]]
        if "balance" in column_map_keys:
            transaction_row["balance"] = row[column_mapping["balance"]]
        if "reference" in column_map_keys:
            transaction_row["reference"] = row[column_mapping["reference"]]
        if "description" in column_map_keys:
            transaction_row["description"] = row[column_mapping["description"]]
        if "cr/dr" in column_map_keys:
            transaction_row["cr/dr"] = row[column_mapping["cr/dr"]]
        
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