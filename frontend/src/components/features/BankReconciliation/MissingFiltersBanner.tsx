import { Paragraph } from "@/components/ui/typography"
import { ReactNode } from "react"


export const MissingFiltersBanner = ({ text }: { text: ReactNode }) => {
    return <div className="min-h-[50vh] flex items-center justify-center">
        <Paragraph>{text}</Paragraph>
    </div>
}