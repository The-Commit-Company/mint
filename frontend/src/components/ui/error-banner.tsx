import { getErrorMessage } from '@/lib/frappe'
import { FrappeError } from 'frappe-react-sdk'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { AlertCircle } from 'lucide-react'
import MarkdownRenderer from './markdown'

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
            <AlertDescription>
                <MarkdownRenderer content={errorMessage} />
            </AlertDescription>
        </Alert>
    )
}

export default ErrorBanner