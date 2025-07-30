import { FrappeProvider } from 'frappe-react-sdk'
import BankReconciliation from './pages/BankReconciliation'
import { Toaster } from './components/ui/sonner'
function App() {

	return (
		<FrappeProvider
			swrConfig={{
				errorRetryCount: 2
			}}
			socketPort={import.meta.env.VITE_SOCKET_PORT}
			siteName={window.frappe?.boot?.sitename ?? import.meta.env.VITE_SITE_NAME}>
			<BankReconciliation />
			<Toaster richColors theme='light' />
		</FrappeProvider>
	)
}

export default App
