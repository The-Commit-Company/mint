import { getErrorMessage } from '@/lib/frappe'
import { FrappeError } from 'frappe-react-sdk'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { AlertCircle } from 'lucide-react'

type Props = {
    error: FrappeError | null,
    title?: string
}

const ErrorBanner = ({ error, title = "There was an error." }: Props) => {

    const errorMessage = getErrorMessage(error)
    return (
        <Alert variant='destructive'>
            <AlertCircle />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
    )
}

export default ErrorBanner