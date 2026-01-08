import { useEffect } from 'react'
import { FrappeProvider } from 'frappe-react-sdk'
import BankReconciliation from './pages/BankReconciliation'
import { Toaster } from './components/ui/sonner'

function App() {
	useEffect(() => {
		// Check if user is logged in by checking the Cookie "user_id"
		// In Frappe, unauthenticated users are "Guest"
		const userId = document.cookie?.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1]?.trim()
		const isLoggedIn = userId !== 'Guest'

		if (!isLoggedIn) {
			if (import.meta.env.DEV) {
				return
			}
			// Redirect to Frappe login page
			window.location.href = '/login?redirect-to=/mint'
			return
		}
	}, [])

	return (
		<FrappeProvider
			swrConfig={{
				errorRetryCount: 2
			}}
			socketPort={import.meta.env.VITE_SOCKET_PORT}
			siteName={window.frappe?.boot?.sitename ?? import.meta.env.VITE_SITE_NAME}>
			{window.frappe?.boot?.user?.name && window.frappe?.boot?.user?.name !== 'Guest' && <BankReconciliation />}
			<Toaster richColors theme='light' />
		</FrappeProvider>
	)
}

export default App
