<p align="center">
  <a href="https://github.com/The-Commit-Company/mint">
  <img width="200" height="200" alt="Mint" src="https://github.com/user-attachments/assets/cc734349-a5bd-4f09-b166-4b97a1b421cc" />
     </a>
   <hr />
  <p align="center">Better bank reconciliation for ERPNext
     <br />
    <br />
    <a href="https://github.com/The-Commit-Company/mint/issues">Issues</a>
    ·
    <a href="https://community.ravenapp.cloud">Community & Support</a>
     ·
    <a href="https://github.com/sponsors/The-Commit-Company?frequency=one-time">Sponsor Us!</a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/The-Commit-Company/mint/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/badge/license-AGPLv3-blue">
  </a>
     <a href="https://github.com/The-Commit-Company/mint/stargazers"><img src="https://img.shields.io/github/stars/The-Commit-Company/mint" alt="Github Stars"></a>
     <a href="https://github.com/The-Commit-Company/mint/pulse"><img src="https://img.shields.io/github/commit-activity/m/The-Commit-Company/mint" alt="Commits-per-month"></a>
</p>

<p align="center">
  <img width="3948" height="2162" alt="A graphic showing how Mint looks" src="https://github.com/user-attachments/assets/5aa6e1aa-e697-4aa8-8d24-e2d2e5437012" />
</p>


​Mint is an open-source tool to help users of [ERPNext](https://frappe.io/erpnext) reconcile their bank account and credit card statements.

It's built using [Frappe Framework](https://frappeframework.com) with a React based UI (it uses [frappe-react-sdk](https://github.com/The-Commit-Company/frappe-react-sdk)) that can be accessed on the `/mint` path of your site.

<hr>

### Features

For a complete walkthrough of the features, you can refer to the following [YouTube video](https://youtu.be/nX9igS980MA?feature=shared)

##### Select company, dates and bank account
<img width="3852" height="602" alt="CleanShot 2025-08-08 at 16 00 34@2x" src="https://github.com/user-attachments/assets/807e3068-a2ec-466d-93c4-0a3acae08cea" />

##### View all reports related to banking in one place

This includes Bank Reconciliation Statement, all Bank Transactions, Bank Clearancy Summary and Incorrectly Cleared Entries

<img width="3928" height="1634" alt="CleanShot 2025-08-08 at 16 03 14@2x" src="https://github.com/user-attachments/assets/ae4b4962-1bf6-4b0f-85a8-be5dfbb7c81d" />

##### Search unreconciled transactions for the given time period
This supports fuzzy searching as well as filters for type (Debit/Credit) and amount.

<img width="2010" height="1488" alt="CleanShot 2025-08-08 at 16 07 14@2x" src="https://github.com/user-attachments/assets/c957e2a9-80d6-47aa-8cc9-f90dba68fb00" />

##### Match transactions to entries in the system
Mint provides visual cues for matching characteristics like amount, date and reference number. It also highlights entries that have a high probability of being the correct match. Simply clicking the "Reconcile" button will match the transaction to the entry.
<img width="2013" height="1432" alt="CleanShot 2025-08-08 at 16 08 58@2x" src="https://github.com/user-attachments/assets/96556645-c08c-4e8c-a006-381358cacdc7" />

##### Split transactions using "Bank Entry"
This will create a new Journal Entry, but of type "Bank Entry" or "Credit Card Entry". The details will all be already filled in. 

You can split transactions across multiple accounts. If there's a difference amount, it will be highlighted and you can click on it to add a difference entry.
(For credit cards, please go to "Bank Account" and check "Is Credit Card" to record JE's as "Credit Card Entry")

<img width="3874" height="2086" alt="CleanShot 2025-08-08 at 18 16 04@2x" src="https://github.com/user-attachments/assets/9d8a6a43-2b59-4aa7-a4c5-4703f5db1c09" />


##### Create Payment Entry using "Record Payment"
This will create a "Payment Entry" against a party and details will be autofilled. 

When you select a party/account, Mint will automatically pull up all unpaid invoices/vouchers against the party. 
You can select them and it will allocate the amount. You can also add extra charges on this screen.

(Please note that cross-currency payments (e.g. USD invoice, but INR payment) is not supported via the Mint interface as of now. It is recommended to create the Payment Entry in ERPNext and match using Mint)

<img width="3874" height="2086" alt="CleanShot 2025-08-08 at 18 21 19@2x" src="https://github.com/user-attachments/assets/f78bf094-310a-438a-bf0f-2bed42142848" />

<img width="3874" height="2086" alt="CleanShot 2025-08-08 at 18 21 48@2x" src="https://github.com/user-attachments/assets/99c9ea26-dac7-4bf0-a0a5-0011bc4f635e" />

##### Transfer money using "Internal Transfer"
If you need to record a bank/cash transfer, use the "Transfer" function. 

If all bank transactions are loaded on the system, Mint will try to find the corresponding "mirror" transaction in other bank accounts. If it does, it will offer that as a suggestion. On accepting the suggestion, an internal transfer is created and both bank transactions are reconciled at the same time.

<img width="3914" height="2126" alt="CleanShot 2025-08-08 at 18 24 52@2x" src="https://github.com/user-attachments/assets/d4064924-e1e1-441c-8aec-967cdf3d0272" />

##### Undo actions on transactions
Made a mistake while reconciling? When you reconcile, a toast shows up for a few seconds with a button to "Undo". You can click on that to "Unreconcile" a transaction. 

If you matched it to an existing voucher, "Undo" will simply unlink the transaction. If you created a new Payment or Journal Entry, "Undo" will cancel the entry. You can "Undo" reconciled transactions from the "Bank Transactions" list as well.

<img width="2214" height="1454" alt="CleanShot 2025-08-08 at 16 14 00@2x" src="https://github.com/user-attachments/assets/a6d1595f-6d74-4d6b-818d-e73cb2cdde0c" />


##### Reconcile transactions in bulk
If you want to create Journal or Payment Entries for multiple transactions at once, simply press "Shift" on your keyboard and select multiple unreconciled transactions. Then choose whether you want to create a Bank Entry, Transfer or Payment entry.

<img width="3934" height="2146" alt="CleanShot 2025-08-08 at 18 30 51@2x" src="https://github.com/user-attachments/assets/a17a283b-5a60-401a-84ca-e8ac5f0546eb" />


##### View log of all reconciliation actions
When reconciling a lot of transactions quickly (especially in bulk), sometimes you might classify a transaction incorrectly. While the app shows a toast on every reconciliation to undo - this is not available for bulk actions, and the toast is short lived. The only option is to go to the bank transactions list and try to find the exact transaction. Even then, if a transaction was matched to more than 1 voucher in the system, the undo action would unreconcile the entire bank transaction.

Mint offers a log of all actions performed during a session. Users can see an entire history of all reconciliation actions taken by them. This can be accessed by either clicking the "Reconciliation History" button or by using the keyboard shortcut `Ctrl+Z`/`Cmd+Z`

<img width="3130" height="1822" alt="image" src="https://github.com/user-attachments/assets/3bce6986-bc62-40fc-aa51-604f2d7b02c1" />

Bulk actions are grouped together and you can cancel each reconciliation action individually.

<img width="3130" height="1822" alt="image" src="https://github.com/user-attachments/assets/676fa756-b665-4d80-b9f7-16ca19301ffe" />


##### Create rules for automatic classification
You can create "rules" for transactions as they come in. These can be used to suggest actions based on the matching criteria. Click on the "zap" button at the top to get started.

For example, you could create a rule for "Bank Charges" - withdrawals with the word "Bank Charge", and set the action to "Bank Entry" with the account "7005 - Bank Charge".

You could have multiple rules and order them by dragging them.

<img width="1336" height="1754" alt="CleanShot 2025-08-08 at 16 16 42@2x" src="https://github.com/user-attachments/assets/2867dcff-4512-46a2-bdaf-21e756b213d8" />
<img width="1298" height="2034" alt="CleanShot 2025-08-08 at 16 19 51@2x" src="https://github.com/user-attachments/assets/e2a1bbf9-efd5-4956-a063-694f7f1f69ed" />
<img width="3924" height="1086" alt="CleanShot 2025-08-08 at 16 18 03@2x" src="https://github.com/user-attachments/assets/ea1dc6ee-23f8-45d2-b2f7-7e274e13afa4" />

##### Bank Statement Importer
Some credit cards and banks give credit card statements with amount fields that contain a "CR" or "DR" to denote deposits and withdrawals. The "Mint Bank Transaction Import" doctype can be used to import bank transactions - the string value will be evaluated and classified as "Withdrawal" or "Deposit". We recommend using the child table to import all transactions.

You can also try uploading PDFs in the "file" field and then have Google Cloud's Document AI try to parse it, but we haven't gotten good results with it so we do not recommend it yet.

<img width="3826" height="2038" alt="CleanShot 2025-08-08 at 18 45 54@2x" src="https://github.com/user-attachments/assets/d51a35a0-9846-4d4e-ac78-a8e5e5d88505" />

##### Translations
All strings on the frontend are wrapped in translation functions - and most words are already available in other languages. Please feel free to contribute to translations (you might need to get in touch to set up Crowdin or equivalent)

##### Bank Logos
We have added logos of the most popular banks in India, Europe, and North America. If you want us to add your bank, please create a Github issue. All logos are trademarks of their respective organisations.

#### License

AGPLv3
