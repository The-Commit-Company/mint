import { FrappeProvider } from 'frappe-react-sdk'
import BankReconciliation from './pages/BankReconciliation'
function App() {

	return (
		<FrappeProvider>
			<BankReconciliation />
		</FrappeProvider>
	)
}

export default App
